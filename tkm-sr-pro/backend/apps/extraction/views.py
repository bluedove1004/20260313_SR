import os
import tempfile
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .serializers import PDFUploadSerializer
from common.utils.pdf_parser import PDFSectionParser, PICOExtractor

class ParseAndExtractView(APIView):
    """
    API View to upload a PDF, parse it into IMRaD sections,
    and run a basic PICO extraction.
    """
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.parser = PDFSectionParser()
        self.extractor = PICOExtractor()

    def post(self, request, *args, **kwargs):
        serializer = PDFUploadSerializer(data=request.data)
        if serializer.is_valid():
            uploaded_file = serializer.validated_data['file']
            
            # Save the uploaded file temporarily so PyMuPDF can read it
            with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp_file:
                for chunk in uploaded_file.chunks():
                    tmp_file.write(chunk)
                tmp_path = tmp_file.name

            try:
                # 1. Parse IMRaD Sections
                sections = self.parser.parse_pdf(tmp_path)
                
                # 2. Extract PICO components from methods/results
                methods_text = sections.get('methods', '')
                results_text = sections.get('results', '')
                pico_data = self.extractor.extract_pico(methods_text, results_text)

                return Response({
                    "filename": uploaded_file.name,
                    "sections": sections,
                    "extracted_pico": pico_data
                }, status=status.HTTP_200_OK)

            except Exception as e:
                return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            finally:
                # Clean up the temporary file
                if os.path.exists(tmp_path):
                    os.remove(tmp_path)
                    
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
