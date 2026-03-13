from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import LiteratureRecord
from .utils.es_client import es_client_instance

@receiver(post_save, sender=LiteratureRecord)
def index_literature_record(sender, instance, created, **kwargs):
    # Only index if it's new (IMPORTED) or has updated its deduplication status to keep searching accurate.
    # In more complex setup we might run this as Celery task
    data = {
        "title": instance.title,
        "abstract": instance.abstract,
        "authors": instance.authors,
        "source_db": instance.source_db,
        "year": instance.year,
        "pmid": instance.pmid,
        "doi": instance.doi,
        "keywords": instance.keywords,
        "status": instance.status,
    }
    es_client_instance.index_record(instance.id, data)
