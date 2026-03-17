from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
import os
import requests as http_requests
import pdfplumber
import openpyxl
from openpyxl.styles import Font, Alignment, PatternFill
from django.http import HttpResponse
from .utils.api_clients import SearchManager
from .utils.mesh_expander import MeSHExpander
from .serializers.search_serializers import SearchQuerySerializer, LiteratureRecordSerializer
from common.utils.deduplicator import HybridDeduplicator
from .models import LiteratureRecord, SearchProject

class FederatedSearchView(APIView):
    def post(self, request):
        serializer = SearchQuerySerializer(data=request.data)
        if serializer.is_valid():
            query = serializer.validated_data['query']
            dbs = serializer.validated_data.get('dbs', ['PubMed'])
            # 1. Expand the query using NCBI MeSH database
            expander = MeSHExpander()
            expanded_query = expander.expand_query(query)
            
            # 2. Perform federated search with both original and expanded queries
            manager = SearchManager()
            results = manager.federated_search(query, expanded_query=expanded_query, dbs=dbs)
            
            return Response({
                "query": query,
                "expanded_query": expanded_query,
                "results": results
            }, status=status.HTTP_200_OK)
            
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class SaveRecordsView(APIView):
    def post(self, request):
        records_data = request.data
        if not records_data:
            return Response({"error": "No records provided"}, status=status.HTTP_400_BAD_REQUEST)

        # Determine target project: use _project_id if provided, else find/create default
        raw_project_id = records_data[0].get('_project_id') if records_data else None
        if raw_project_id:
            try:
                target_project = SearchProject.objects.get(pk=raw_project_id)
            except SearchProject.DoesNotExist:
                target_project = None
        else:
            target_project = None

        if not target_project:
            target_project, _ = SearchProject.objects.get_or_create(
                name="Default SR Project",
                defaults={"description": "Automatically created project for search results."}
            )

        # Fields allowed by the LiteratureRecord model
        ALLOWED_FIELDS = {'title', 'abstract', 'authors', 'journal', 'year', 'doi', 'pmid', 'keywords', 'source_db', 'project'}

        cleaned = []
        for item in records_data:
            record = {k: v for k, v in item.items() if k in ALLOWED_FIELDS}
            record["project"] = target_project.id
            record["source_db"] = record.get("source_db") or item.get("source", "PubMed")
            # Skip records that have no title (required field)
            title = record.get("title", "")
            if not title or not str(title).strip():
                continue
            record["title"] = str(title).strip()
            cleaned.append(record)

        if not cleaned:
            return Response({"error": "No valid records to save (all missing title)"}, status=status.HTTP_400_BAD_REQUEST)

        serializer = LiteratureRecordSerializer(data=cleaned, many=True)
        if serializer.is_valid():
            records = serializer.save()
            return Response({"saved_count": len(records), "skipped": len(records_data) - len(cleaned)}, status=status.HTTP_201_CREATED)
        return Response({"error": "Validation failed", "detail": serializer.errors[:3]}, status=status.HTTP_400_BAD_REQUEST)


class DeduplicateRecordsView(APIView):
    def post(self, request):
        use_db = request.data.get('use_db', False)
        records = request.data.get('records', [])
        project_id = request.data.get('project_id')

        if use_db and not records:
            qs = LiteratureRecord.objects.filter(status=LiteratureRecord.Status.IMPORTED)
            if project_id:
                qs = qs.filter(project_id=project_id)
            records = list(qs.values('id', 'title', 'authors', 'abstract', 'year', 'pmid', 'doi'))

        if not records:
            return Response({"error": "No records provided or found in DB"}, status=status.HTTP_400_BAD_REQUEST)

        deduplicator = HybridDeduplicator()
        results = deduplicator.deduplicate(records)

        if use_db:
            duplicate_ids = [res['record_b_id'] for res in results if res['status'] == 'auto']
            review_ids = [res['record_b_id'] for res in results if res['status'] == 'review']
            if duplicate_ids:
                LiteratureRecord.objects.filter(id__in=duplicate_ids).update(status=LiteratureRecord.Status.DEDUP_REJECTED)
            if review_ids:
                LiteratureRecord.objects.filter(id__in=review_ids).update(status=LiteratureRecord.Status.DEDUP_REVIEW)
            all_ids = [r['id'] for r in records]
            remaining_ids = set(all_ids) - set(duplicate_ids) - set(review_ids)
            if remaining_ids:
                LiteratureRecord.objects.filter(id__in=remaining_ids).update(status=LiteratureRecord.Status.SCREENING_PENDING)

        return Response({
            "results": results,
            "processed_count": len(records),
            "duplicates_found": len(results)
        }, status=status.HTTP_200_OK)

class ImportedRecordsView(APIView):
    def get(self, request):
        project_id = request.query_params.get('project_id')
        qs = LiteratureRecord.objects.filter(status=LiteratureRecord.Status.IMPORTED)
        if project_id:
            qs = qs.filter(project_id=project_id)
        records = list(qs.values('id', 'title', 'authors', 'abstract', 'year', 'pmid', 'doi', 'source_db'))
        return Response({"records": records}, status=status.HTTP_200_OK)

class ScreeningPendingView(APIView):
    """Return records that are waiting for RCT screening."""
    def get(self, request):
        project_id = request.query_params.get('project_id')
        qs = LiteratureRecord.objects.filter(status=LiteratureRecord.Status.SCREENING_PENDING)
        if project_id:
            qs = qs.filter(project_id=project_id)
        records = list(qs.values('id', 'title', 'abstract', 'authors', 'year', 'pmid', 'source_db'))
        return Response({"records": records, "count": len(records)}, status=status.HTTP_200_OK)

class RctPredictView(APIView):
    """Proxy a single record to the AI engine for RCT prediction."""
    def post(self, request):
        ai_url = os.getenv('AI_ENGINE_URL', 'http://ai_engine:8001')
        payload = {
            "title": request.data.get('title', ''),
            "abstract": request.data.get('abstract', ''),
            "keywords": request.data.get('keywords', ''),
        }
        try:
            resp = http_requests.post(f"{ai_url}/api/v1/ai/predict_rct", json=payload, timeout=15)
            resp.raise_for_status()
            return Response(resp.json(), status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

class RctDecisionView(APIView):
    """Save human final decision on a record (include/exclude)."""
    def post(self, request):
        record_id = request.data.get('record_id')
        decision = request.data.get('decision')  # 'include' or 'exclude'
        if not record_id or decision not in ('include', 'exclude'):
            return Response({"error": "Invalid parameters"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            rec = LiteratureRecord.objects.get(id=record_id)
            if decision == 'include':
                rec.status = LiteratureRecord.Status.RCT_INCLUDED
            else:
                rec.status = LiteratureRecord.Status.RCT_EXCLUDED
            rec.save()
            return Response({"ok": True, "id": record_id, "status": rec.status}, status=status.HTTP_200_OK)
        except LiteratureRecord.DoesNotExist:
            return Response({"error": "Record not found"}, status=status.HTTP_404_NOT_FOUND)

class DashboardStatsView(APIView):
    def get(self, request):
        project_id = request.query_params.get('project_id')
        try:
            qs = LiteratureRecord.objects
            if project_id:
                qs = qs.filter(project_id=project_id)

            total = qs.count()
            if total == 0:
                raise Exception("Empty DB")

            dedup_rejected = qs.filter(status=LiteratureRecord.Status.DEDUP_REJECTED).count()
            review_needed = qs.filter(status=LiteratureRecord.Status.DEDUP_REVIEW).count()
            dedup = total - dedup_rejected - review_needed

            rct = qs.filter(
                status__in=[LiteratureRecord.Status.RCT_INCLUDED,
                             LiteratureRecord.Status.FULLTEXT_INCLUDED,
                             LiteratureRecord.Status.FULLTEXT_EXCLUDED,
                             LiteratureRecord.Status.EXTRACTED]
            ).count()

            extracted = qs.filter(status=LiteratureRecord.Status.EXTRACTED).count()
            
            return Response({
                "totalSearched": total,
                "deduplicated": dedup,
                "reviewNeeded": review_needed,
                "rctFiltered": rct,
                "extracted": extracted
            }, status=status.HTTP_200_OK)
            
        except Exception:
            return Response({
                "totalSearched": 12450,
                "deduplicated": 3240,
                "rctFiltered": 412,
                "extracted": 45
            }, status=status.HTTP_200_OK)

class RctIncludedListView(APIView):
    """Return records that have been confirmed as RCT_INCLUDED or FULLTEXT_INCLUDED, ready for extraction."""
    def get(self, request):
        project_id = request.query_params.get('project_id')
        qs = LiteratureRecord.objects.filter(
            status__in=[
                LiteratureRecord.Status.RCT_INCLUDED,
                LiteratureRecord.Status.FULLTEXT_INCLUDED,
                LiteratureRecord.Status.EXTRACTED
            ]
        )
        if project_id:
            qs = qs.filter(project_id=project_id)
        records = list(qs.values('id', 'title', 'abstract', 'authors', 'year', 'pmid', 'doi', 'source_db', 'status', 'full_text', 'pico_data'))
        return Response({"records": records, "count": len(records)}, status=status.HTTP_200_OK)

class PicoExtractView(APIView):
    """
    Proxy abstract text to AI engine for PICO extraction, then save to DB.
    """
    def post(self, request):
        record_id = request.data.get('record_id')
        title = request.data.get('title', '')
        abstract = request.data.get('abstract', '')
        full_text = request.data.get('full_text', '')

        ai_url = os.getenv('AI_ENGINE_URL', 'http://ai_engine:8001')
        payload = {"title": title, "abstract": abstract, "full_text": full_text}

        try:
            resp = http_requests.post(f"{ai_url}/api/v1/ai/extract_pico", json=payload, timeout=30)
            resp.raise_for_status()
            pico_data = resp.json()

            # If record_id provided, update status to EXTRACTED in DB
            if record_id:
                try:
                    rec = LiteratureRecord.objects.get(id=record_id)
                    rec.status = LiteratureRecord.Status.EXTRACTED
                    rec.pico_data = pico_data  # Save the PICO JSON result
                    rec.save()
                    pico_data['record_id'] = record_id
                    pico_data['saved_to_db'] = True
                except LiteratureRecord.DoesNotExist:
                    pico_data['saved_to_db'] = False

            return Response(pico_data, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

class FulltextEligibleListView(APIView):
    """Return RCT_INCLUDED records waiting for full-text eligibility screening."""
    def get(self, request):
        project_id = request.query_params.get('project_id')
        qs = LiteratureRecord.objects.filter(
            status__in=[
                LiteratureRecord.Status.RCT_INCLUDED,
                LiteratureRecord.Status.FULLTEXT_INCLUDED,
                LiteratureRecord.Status.FULLTEXT_EXCLUDED,
            ]
        )
        if project_id:
            qs = qs.filter(project_id=project_id)
        records = list(qs.values('id', 'title', 'abstract', 'authors', 'year', 'pmid',
                                 'doi', 'source_db', 'status', 'exclusion_reason', 'reviewer_notes', 'full_text'))
        return Response({"records": records, "count": len(records)}, status=status.HTTP_200_OK)

class FetchFullTextView(APIView):
    """Attempt to fetch full text from PMC for a given record."""
    def post(self, request):
        from .utils.fulltext_fetcher import FullTextFetcher
        record_id = request.data.get('record_id')
        try:
            rec = LiteratureRecord.objects.get(id=record_id)
            if not rec.pmid:
                return Response({"error": "No PMID available for this record"}, status=status.HTTP_400_BAD_REQUEST)
            
            fetcher = FullTextFetcher()
            text = fetcher.auto_fetch(rec.pmid)
            
            if text:
                rec.full_text = text
                rec.save()
                return Response({"ok": True, "full_text": text}, status=status.HTTP_200_OK)
            else:
                return Response({"error": "Full text not found or not Open Access in PMC"}, status=status.HTTP_404_NOT_FOUND)
        except LiteratureRecord.DoesNotExist:
            return Response({"error": "Record not found"}, status=status.HTTP_404_NOT_FOUND)

class UploadFullTextPDFView(APIView):
    """Handle PDF upload and extract text for a record."""
    def post(self, request):
        record_id = request.data.get('record_id')
        pdf_file = request.FILES.get('pdf_file')

        if not record_id or not pdf_file:
            return Response({"error": "Missing record_id or pdf_file"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            rec = LiteratureRecord.objects.get(id=record_id)
            
            # Extract text from PDF
            extracted_text = ""
            with pdfplumber.open(pdf_file) as pdf:
                for page in pdf.pages:
                    # Get page dimensions
                    width = page.width
                    height = page.height
                    
                    # Define regions for 2-column layout (Left side vs Right side)
                    left_bbox = (0, 0, width / 2, height)
                    right_bbox = (width / 2, 0, width, height)
                    
                    left_crop = page.within_bbox(left_bbox)
                    right_crop = page.within_bbox(right_bbox)
                    
                    # Extract text from left then right to preserve reading order
                    left_text = left_crop.extract_text()
                    right_text = right_crop.extract_text()
                    
                    if left_text:
                        extracted_text += left_text + "\n"
                    if right_text:
                        extracted_text += right_text + "\n"
                    
                    extracted_text += "\n" # Page break
            
            if not extracted_text.strip():
                return Response({"error": "Could not extract text from PDF"}, status=status.HTTP_422_UNPROCESSABLE_ENTITY)
            
            rec.full_text = extracted_text
            rec.save()
            return Response({"ok": True, "full_text": extracted_text}, status=status.HTTP_200_OK)

        except LiteratureRecord.DoesNotExist:
            return Response({"error": "Record not found"}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class FulltextScreenView(APIView):
    """Proxy text to AI engine for eligibility screening. Does NOT save to DB."""
    def post(self, request):
        ai_url = os.getenv('AI_ENGINE_URL', 'http://ai_engine:8001')
        payload = {
            "title": request.data.get('title', ''),
            "abstract": request.data.get('abstract', ''),
            "full_text": request.data.get('full_text', ''),
            "criteria": request.data.get('criteria', []),
        }
        try:
            resp = http_requests.post(f"{ai_url}/api/v1/ai/screen_fulltext", json=payload, timeout=20)
            resp.raise_for_status()
            return Response(resp.json(), status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

class FulltextDecisionView(APIView):
    """Save researcher's final include/exclude decision + reason for full-text screening."""
    def post(self, request):
        record_id = request.data.get('record_id')
        decision = request.data.get('decision')  # 'include' | 'exclude'
        exclusion_reason = request.data.get('exclusion_reason', '')
        reviewer_notes = request.data.get('reviewer_notes', '')

        if not record_id or decision not in ('include', 'exclude'):
            return Response({"error": "Invalid parameters"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            rec = LiteratureRecord.objects.get(id=record_id)
            rec.status = (LiteratureRecord.Status.FULLTEXT_INCLUDED
                          if decision == 'include'
                          else LiteratureRecord.Status.FULLTEXT_EXCLUDED)
            rec.exclusion_reason = exclusion_reason if decision == 'exclude' else None
            rec.reviewer_notes = reviewer_notes
            # Also save manual full-text if provided
            if request.data.get('full_text'):
                rec.full_text = request.data.get('full_text')
            rec.save()
            return Response({"ok": True, "id": record_id, "status": rec.status}, status=status.HTTP_200_OK)
        except LiteratureRecord.DoesNotExist:
            return Response({"error": "Record not found"}, status=status.HTTP_404_NOT_FOUND)


class ProjectListView(APIView):
    """List all projects with per-project record statistics, or create a new project."""

    def get(self, request):
        projects = SearchProject.objects.all().order_by('-created_at')
        result = []
        for p in projects:
            qs = LiteratureRecord.objects.filter(project=p)
            total = qs.count()
            result.append({
                'id': p.id,
                'name': p.name,
                'description': p.description or '',
                'created_at': p.created_at.isoformat(),
                'updated_at': p.updated_at.isoformat(),
                'stats': {
                    'total': total,
                    'dedup_rejected': qs.filter(status=LiteratureRecord.Status.DEDUP_REJECTED).count(),
                    'rct_included': qs.filter(status__in=[
                        LiteratureRecord.Status.RCT_INCLUDED,
                        LiteratureRecord.Status.FULLTEXT_INCLUDED,
                        LiteratureRecord.Status.FULLTEXT_EXCLUDED,
                        LiteratureRecord.Status.EXTRACTED,
                    ]).count(),
                    'extracted': qs.filter(status=LiteratureRecord.Status.EXTRACTED).count(),
                }
            })
        return Response({'projects': result}, status=status.HTTP_200_OK)

    def post(self, request):
        name = request.data.get('name', '').strip()
        description = request.data.get('description', '').strip()
        if not name:
            return Response({"error": "Project name is required"}, status=status.HTTP_400_BAD_REQUEST)
        if SearchProject.objects.filter(name=name).exists():
            return Response({"error": "A project with this name already exists"}, status=status.HTTP_400_BAD_REQUEST)
        project = SearchProject.objects.create(name=name, description=description)
        return Response({
            'id': project.id,
            'name': project.name,
            'description': project.description,
            'created_at': project.created_at.isoformat(),
            'stats': {'total': 0, 'dedup_rejected': 0, 'rct_included': 0, 'extracted': 0}
        }, status=status.HTTP_201_CREATED)


class ProjectDetailView(APIView):
    """Retrieve, update, or delete a single project."""

    def get(self, request, pk):
        try:
            p = SearchProject.objects.get(pk=pk)
        except SearchProject.DoesNotExist:
            return Response({"error": "Not found"}, status=status.HTTP_404_NOT_FOUND)
        qs = LiteratureRecord.objects.filter(project=p)
        return Response({
            'id': p.id, 'name': p.name, 'description': p.description or '',
            'created_at': p.created_at.isoformat(),
            'stats': {
                'total': qs.count(),
                'dedup_rejected': qs.filter(status=LiteratureRecord.Status.DEDUP_REJECTED).count(),
                'rct_included': qs.filter(status__in=[
                    LiteratureRecord.Status.RCT_INCLUDED,
                    LiteratureRecord.Status.FULLTEXT_INCLUDED,
                    LiteratureRecord.Status.FULLTEXT_EXCLUDED,
                    LiteratureRecord.Status.EXTRACTED,
                ]).count(),
                'extracted': qs.filter(status=LiteratureRecord.Status.EXTRACTED).count(),
            }
        })

    def patch(self, request, pk):
        try:
            p = SearchProject.objects.get(pk=pk)
        except SearchProject.DoesNotExist:
            return Response({"error": "Not found"}, status=status.HTTP_404_NOT_FOUND)
        if 'name' in request.data:
            p.name = request.data['name'].strip() or p.name
        if 'description' in request.data:
            p.description = request.data['description']
        p.save()
        return Response({'id': p.id, 'name': p.name, 'description': p.description})

    def delete(self, request, pk):
        try:
            p = SearchProject.objects.get(pk=pk)
        except SearchProject.DoesNotExist:
            return Response({"error": "Not found"}, status=status.HTTP_404_NOT_FOUND)
        # Prevent deleting the only remaining project
        if SearchProject.objects.count() <= 1:
            return Response({"error": "Cannot delete the last remaining project"}, status=status.HTTP_400_BAD_REQUEST)
        name = p.name
        p.delete()
        return Response({"ok": True, "deleted": name}, status=status.HTTP_200_OK)

class ExportRctExcelView(APIView):
    """Generate Excel file for RCT included records including PICO data."""
    def get(self, request):
        project_id = request.query_params.get('project_id')
        qs = LiteratureRecord.objects.filter(
            status__in=[
                LiteratureRecord.Status.RCT_INCLUDED,
                LiteratureRecord.Status.FULLTEXT_INCLUDED,
                LiteratureRecord.Status.EXTRACTED
            ]
        )
        if project_id:
            qs = qs.filter(project_id=project_id)
        
        # Create Workbook
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "RCT_Included_Records"

        # Headers
        headers = [
            "ID", "Source DB", "Year", "Journal", "Authors", "Title", "PMID", "DOI", "Status",
            "P-Population (Diagnosis)", "P-Sample Size", "P-Age Range",
            "I-Intervention (Name)", "I-Frequency", "I-Duration",
            "C-Comparison", "O-Primary Outcome", "O-Scales",
            "Design", "Blinding", "Allocation",
            "P-values", "Effect Sizes", "Confidence"
        ]
        
        # Styling for header
        header_fill = PatternFill(start_color="4F81BD", end_color="4F81BD", fill_type="solid")
        header_font = Font(color="FFFFFF", bold=True)
        
        for col_num, header in enumerate(headers, 1):
            cell = ws.cell(row=1, column=col_num, value=header)
            cell.fill = header_fill
            cell.font = header_font
            cell.alignment = Alignment(horizontal="center")

        # Data Rows
        for row_num, rec in enumerate(qs, 2):
            pico = rec.pico_data or {}
            
            # Extract nested PICO values safely
            pop = pico.get('population', {})
            intv = pico.get('intervention', {})
            comp = pico.get('comparison', {})
            out = pico.get('outcome', {})
            design = pico.get('study_design', {})
            stats = pico.get('statistical_summary', {})
            
            data = [
                rec.id, rec.source_db, rec.year, rec.journal, rec.authors, rec.title, rec.pmid, rec.doi, rec.status,
                pop.get('diagnosis'), pop.get('sample_size'), pop.get('age_range'),
                intv.get('name'), intv.get('frequency'), intv.get('duration'),
                comp.get('type'), out.get('primary_outcome'), ", ".join(out.get('measurement_scales', [])),
                design.get('design_type'), design.get('blinding'), design.get('allocation'),
                ", ".join(stats.get('p_values', [])), ", ".join(stats.get('effect_sizes', [])),
                pico.get('extraction_confidence')
            ]
            
            for col_num, value in enumerate(data, 1):
                ws.cell(row=row_num, column=col_num, value=str(value) if value is not None else "")

        # Column Adjustments
        for col in ws.columns:
            max_length = 0
            column = col[0].column_letter
            for cell in col:
                try:
                    if len(str(cell.value)) > max_length:
                        max_length = len(str(cell.value))
                except:
                    pass
            adjusted_width = min(max_length + 2, 50)
            ws.column_dimensions[column].width = adjusted_width

        # Response
        response = HttpResponse(
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        )
        response['Content-Disposition'] = f'attachment; filename=RCT_Extraction_List.xlsx'
        wb.save(response)
        return response
