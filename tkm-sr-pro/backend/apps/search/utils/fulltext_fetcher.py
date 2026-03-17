import requests
import xml.etree.ElementTree as ET
import os

class FullTextFetcher:
    def __init__(self):
        self.pmc_base = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils"
        self.id_conv_base = "https://www.ncbi.nlm.nih.gov/pmc/utils/idconv/v1.0/"

    def get_pmcid_from_pmid(self, pmid: str) -> str:
        """Convert PMID to PMCID using NCBI ID converter."""
        if not pmid: return None
        params = {
            "ids": pmid,
            "format": "json",
            "tool": "tkm-sr-pro",
            "email": "admin@example.com"
        }
        try:
            res = requests.get(self.id_conv_base, params=params, timeout=10)
            res.raise_for_status()
            data = res.json()
            records = data.get("records", [])
            if records and "pmcid" in records[0]:
                return records[0]["pmcid"]
        except Exception as e:
            print(f"ID Conversion error for PMID {pmid}: {e}")
        return None

    def fetch_from_pmc(self, pmcid: str) -> str:
        """Fetch full text XML from PMC and extract body text."""
        if not pmcid: return None
        params = {
            "db": "pmc",
            "id": pmcid,
            "retmode": "xml"
        }
        try:
            res = requests.get(f"{self.pmc_base}/efetch.fcgi", params=params, timeout=20)
            res.raise_for_status()
            
            # Simple XML parsing to get body text
            # In production, use more robust HTML/XML parsing (e.g. BeautifulSoup)
            root = ET.fromstring(res.text)
            body = root.find(".//body")
            if body is not None:
                # Get all text from body elements
                text_parts = [t for t in body.itertext() if t.strip()]
                return " ".join(text_parts)
        except Exception as e:
            print(f"PMC fetch error for {pmcid}: {e}")
        return None

    def auto_fetch(self, pmid: str = None) -> str:
        """Try to fetch full text automatically if PMID is available."""
        if not pmid: return None
        pmcid = self.get_pmcid_from_pmid(pmid)
        if pmcid:
            return self.fetch_from_pmc(pmcid)
        return None
