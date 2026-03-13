from django.db import models
from django.utils.translation import gettext_lazy as _

class SearchProject(models.Model):
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

class LiteratureRecord(models.Model):
    class SourceDB(models.TextChoices):
        PUBMED = 'PubMed', _('PubMed')
        EMBASE = 'Embase', _('Embase')
        COCHRANE = 'Cochrane', _('Cochrane Library')
        KMBASE = 'KMbase', _('KMbase')
        RISS = 'RISS', _('RISS')
        CNKI = 'CNKI', _('CNKI')
        OTHER = 'Other', _('Other')

    project = models.ForeignKey(SearchProject, on_delete=models.CASCADE, related_name='records')
    source_db = models.CharField(max_length=20, choices=SourceDB.choices, default=SourceDB.OTHER)
    
    # Common Schema Mapping
    title = models.TextField()
    abstract = models.TextField(blank=True, null=True)
    authors = models.TextField(blank=True, null=True)
    journal = models.CharField(max_length=512, blank=True, null=True)
    year = models.IntegerField(blank=True, null=True)
    
    # Identifiers
    doi = models.CharField(max_length=255, blank=True, null=True)
    pmid = models.CharField(max_length=100, blank=True, null=True)
    
    # Keywords
    keywords = models.TextField(blank=True, null=True)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    
    # Stage status: enum or string depending on deduplication/screening state.
    class Status(models.TextChoices):
        IMPORTED = 'IMPORTED', _('Imported')
        DEDUP_REVIEW = 'DEDUP_REVIEW', _('Pending Deduplication Review')
        DEDUP_REJECTED = 'DEDUP_REJECTED', _('Rejected as Duplicate')
        SCREENING_PENDING = 'SCREENING_PENDING', _('Pending Screening')
        RCT_INCLUDED = 'RCT_INCLUDED', _('Included as RCT')
        RCT_EXCLUDED = 'RCT_EXCLUDED', _('Excluded (Not RCT)')
        EXTRACTED = 'EXTRACTED', _('PICO Extracted')
    status = models.CharField(max_length=30, choices=Status.choices, default=Status.IMPORTED)

    def __str__(self):
        return f"[{self.source_db}] {self.title[:50]}"
