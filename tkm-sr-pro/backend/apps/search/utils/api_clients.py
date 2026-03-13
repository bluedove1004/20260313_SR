import requests
import xml.etree.ElementTree as ET
from typing import List, Dict, Any

class BaseSearchClient:
    def __init__(self, source_name: str):
        self.source_name = source_name

    def search(self, query: str, max_results: int = 20) -> List[Dict[str, Any]]:
        raise NotImplementedError("Subclasses must implement the search method.")

class PubMedClient(BaseSearchClient):
    def __init__(self):
        super().__init__("PubMed")
        self.base_url = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils"

    def search(self, query: str, max_results: int = 20) -> List[Dict[str, Any]]:
        search_url = f"{self.base_url}/esearch.fcgi"
        search_params = {
            "db": "pubmed",
            "term": query,
            "retmax": max_results,
            "retmode": "json"
        }
        try:
            res = requests.get(search_url, params=search_params)
            res.raise_for_status()
            id_list = res.json().get("esearchresult", {}).get("idlist", [])
            
            if not id_list:
                return []
            
            # Fetch details for the IDs
            return self._fetch_details(id_list)
        except Exception as e:
            print(f"PubMed search error: {e}")
            return []

    def _fetch_details(self, id_list: List[str]) -> List[Dict[str, Any]]:
        fetch_url = f"{self.base_url}/efetch.fcgi"
        fetch_params = {
            "db": "pubmed",
            "id": ",".join(id_list),
            "retmode": "xml" # Usually efetch XML gives structural details for article.
        }
        
        try:
            res = requests.get(fetch_url, params=fetch_params)
            res.raise_for_status()
            
            root = ET.fromstring(res.text)
            results = []
            
            for article in root.findall(".//PubmedArticle"):
                pmid = article.findtext(".//PMID") or ""
                title = article.findtext(".//ArticleTitle") or ""
                
                abstract_elem = article.find(".//Abstract")
                abstract = ""
                if abstract_elem is not None:
                    abstract = " ".join([text.text for text in abstract_elem.findall("AbstractText") if text.text])
                
                # Try getting Year
                year = article.findtext(".//PubDate/Year")
                if not year:
                    year = article.findtext(".//ArticleDate/Year")
                
                # Combine Authors
                authors = []
                for author in article.findall(".//Author"):
                    last = author.findtext("LastName") or ""
                    init = author.findtext("Initials") or ""
                    if last:
                        authors.append(f"{last} {init}".strip())
                author_str = ", ".join(authors)
                
                results.append({
                    "source_db": self.source_name,
                    "title": title,
                    "abstract": abstract,
                    "authors": author_str,
                    "year": int(year) if year and year.isdigit() else None,
                    "pmid": pmid,
                    "id": pmid, # frontend id
                })
            
            return results
        except Exception as e:
            print(f"PubMed details fetch error: {e}")
            return []

class SearchManager:
    def __init__(self):
        self.clients = {
            "PubMed": PubMedClient(),
            # "KMbase": KMbaseClient(),
            # "Cochrane": CochraneClient(),
            # ...
        }

    def federated_search(self, query: str, dbs: List[str] = None) -> List[Dict[str, Any]]:
        aggregated = []
        if not dbs:
            dbs = list(self.clients.keys())
        
        for db in dbs:
            if db in self.clients:
                results = self.clients[db].search(query)
                aggregated.extend(results)
                
        return aggregated
