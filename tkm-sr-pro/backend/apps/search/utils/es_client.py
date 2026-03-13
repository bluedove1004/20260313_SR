import os
from elasticsearch import Elasticsearch
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

class ESClient:
    def __init__(self):
        es_url = os.getenv("ELASTICSEARCH_URL", "http://localhost:9200")
        self.es = Elasticsearch([es_url])
        self.index_name = "tkm_literature"

    def create_index(self):
        if not self.es.indices.exists(index=self.index_name):
            mappings = {
                "properties": {
                    "title": {"type": "text", "analyzer": "standard"}, # Will use nori analyzer if available down the road
                    "abstract": {"type": "text"},
                    "authors": {"type": "text"},
                    "source_db": {"type": "keyword"},
                    "year": {"type": "integer"},
                    "pmid": {"type": "keyword"},
                    "doi": {"type": "keyword"},
                }
            }
            self.es.indices.create(index=self.index_name, mappings=mappings)
            logger.info(f"Created Elasticsearch index: {self.index_name}")

    def index_record(self, record_id: int, data: dict):
        try:
            res = self.es.index(index=self.index_name, id=record_id, document=data)
            return res['result']
        except Exception as e:
            logger.error(f"Error indexing record {record_id} to ES: {e}")
            return None

    def search_records(self, query: str):
        body = {
            "query": {
                "multi_match": {
                    "query": query,
                    "fields": ["title^2", "abstract", "keywords"]
                }
            }
        }
        try:
            res = self.es.search(index=self.index_name, body=body)
            return res['hits']['hits']
        except Exception as e:
            logger.error(f"Error searching ES: {e}")
            return []

es_client_instance = ESClient()
