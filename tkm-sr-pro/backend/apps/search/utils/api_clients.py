import requests
import xml.etree.ElementTree as ET
import os
from typing import List, Dict, Any

class BaseSearchClient:
    def __init__(self, source_name: str):
        self.source_name = source_name

    def search(self, query: str, expanded_query: str = None, max_results: int = 100) -> List[Dict[str, Any]]:
        raise NotImplementedError("Subclasses must implement the search method.")

class PubMedClient(BaseSearchClient):
    def __init__(self):
        super().__init__("PubMed")
        self.base_url = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils"

    def search(self, query: str, expanded_query: str = None, max_results: int = 100) -> List[Dict[str, Any]]:
        search_url = f"{self.base_url}/esearch.fcgi"
        term = expanded_query if expanded_query else query
        search_params = {
            "db": "pubmed",
            "term": term,
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

class CochraneClient(PubMedClient):
    def __init__(self):
        super().__init__()
        self.source_name = "Cochrane"

    def search(self, query: str, expanded_query: str = None, max_results: int = 100) -> List[Dict[str, Any]]:
        # Filter PubMed results to only include Cochrane reviews
        cochrane_filter = ' AND ("Cochrane Database Syst Rev"[Journal] OR "Cochrane Library"[Filter])'
        
        # Apply filter to the expanded query if available, otherwise original query
        base_term = expanded_query if expanded_query else query
        filtered_term = f"({base_term}){cochrane_filter}"
        
        # Call super().search and pass the filtered term
        # we pass expanded_query=None here because the filtering is already done in filtered_term
        return super().search(filtered_term, expanded_query=None, max_results=max_results)

class CiNiiClient(BaseSearchClient):
    def __init__(self):
        super().__init__("CiNii")
        self.base_url = "https://ci.nii.ac.jp/opensearch/search"
        self.app_id = os.getenv("CINII_APP_ID", "") # Optional but recommended for CiNii

    def search(self, query: str, expanded_query: str = None, max_results: int = 100) -> List[Dict[str, Any]]:
        # CiNii doesn't support complex MeSH syntax, so use the original query
        params = {
            "q": query,
            "format": "json",
            "count": max_results,
            "appid": self.app_id
        }
        try:
            # Added verify=False to bypass SSL certification issues in some environments
            res = requests.get(self.base_url, params=params, timeout=10, verify=False)
            res.raise_for_status()
            
            # Check if response is JSON
            if 'application/json' not in res.headers.get('Content-Type', ''):
                print(f"CiNii returned non-JSON response for '{query}'")
                return []

            data = res.json()
            items = data.get("@graph", [{}])[0].get("items", [])
            
            results = []
            for item in items:
                results.append({
                    "source_db": self.source_name,
                    "title": item.get("title", ""),
                    "abstract": item.get("description", ""),
                    "authors": item.get("dc:creator", ""),
                    "year": item.get("dc:date", "")[:4] if item.get("dc:date") else None,
                    "id": item.get("@id", ""),
                })
            return results
        except Exception as e:
            print(f"CiNii search error: {e}")
            return []

class ScienceOnClient(BaseSearchClient):
    def __init__(self):
        super().__init__("ScienceON")
        self.base_url = "https://apigateway.kisti.re.kr/openapicall.do"
        self.client_id = os.getenv("SCIENCEON_CLIENT_ID", "")
        self.token = os.getenv("SCIENCEON_TOKEN", "")

    def search(self, query: str, expanded_query: str = None, max_results: int = 100) -> List[Dict[str, Any]]:
        if not self.client_id or not self.token:
            print("ScienceON API credentials missing.")
            return []
            
        params = {
            "client_id": self.client_id,
            "token": self.token,
            "version": "1.0",
            "action": "search",
            "target": "ARTI", # Articles
            "searchQuery": f'{{"BI":"{query}"}}', # Search Title/Abstract
            "rowCount": max_results,
            "curPage": 1
        }
        try:
            res = requests.get(self.base_url, params=params, timeout=10)
            res.raise_for_status()
            # ScienceON usually returns XML
            root = ET.fromstring(res.text)
            results = []
            for item in root.findall(".//record"):
                results.append({
                    "source_db": self.source_name,
                    "title": item.findtext(".//title") or "",
                    "abstract": item.findtext(".//abstract") or "",
                    "authors": item.findtext(".//author") or "",
                    "year": item.findtext(".//pub-year") or None,
                    "id": item.findtext(".//cn") or "",
                })
            return results
        except Exception as e:
            print(f"ScienceON search error: {e}")
            return []

class RissClient(BaseSearchClient):
    def __init__(self):
        super().__init__("RISS")
        self.base_url = "http://www.riss.kr/openApi/search.do"
        self.api_key = os.getenv("RISS_API_KEY", "")

    def search(self, query: str, expanded_query: str = None, max_results: int = 100) -> List[Dict[str, Any]]:
        # This is a conceptual implementation based on common RISS API patterns
        # Actual RISS parameters often include: type, query, key, display, start
        if not self.api_key:
            print("RISS API key missing.")
            return []
            
        params = {
            "apiKey": self.api_key,
            "query": query,
            "display": max_results,
            "start": 1,
            "type": "all"
        }
        try:
            res = requests.get(self.base_url, params=params, timeout=10)
            res.raise_for_status()
            root = ET.fromstring(res.text)
            results = []
            for item in root.findall(".//item"):
                results.append({
                    "source_db": self.source_name,
                    "title": item.findtext("title") or "",
                    "abstract": item.findtext("abstract") or "",
                    "authors": item.findtext("author") or "",
                    "year": item.findtext("pubDate")[:4] if item.findtext("pubDate") else None,
                    "id": item.findtext("link") or "",
                })
            return results
        except Exception as e:
            print(f"RISS search error: {e}")
            return []

class CinahlClient(BaseSearchClient):
    def __init__(self):
        super().__init__("CINAHL")
        self.base_url = "https://eit.ebscohost.com/Services/SearchService.asmx/Search"
        self.user_id = os.getenv("EBSCO_USER_ID", "")
        self.password = os.getenv("EBSCO_PASSWORD", "")
        self.profile = os.getenv("EBSCO_PROFILE", "")

    def search(self, query: str, expanded_query: str = None, max_results: int = 100) -> List[Dict[str, Any]]:
        # EBSCO EIT often uses SOAP or specific XML-over-HTTP
        # This is a simplified fallback skeleton
        if not self.user_id:
            print("CINAHL (EBSCO) credentials missing.")
            return []
            
        # Implementation of EBSCO EIT search logic would go here
        return []

class EmbaseClient(BaseSearchClient):
    def __init__(self):
        super().__init__("Embase")

    def search(self, query: str, expanded_query: str = None, max_results: int = 100) -> List[Dict[str, Any]]:
        print("Embase search not implemented (requires Elsevier API Key).")
        return []

class KMbaseClient(BaseSearchClient):
    def __init__(self):
        super().__init__("KMbase")

    def search(self, query: str, expanded_query: str = None, max_results: int = 100) -> List[Dict[str, Any]]:
        print("KMbase search not implemented.")
        return []

class CnkiClient(BaseSearchClient):
    def __init__(self):
        super().__init__("CNKI")

    def search(self, query: str, expanded_query: str = None, max_results: int = 100) -> List[Dict[str, Any]]:
        print("CNKI search not implemented.")
        return []

class SearchManager:
    def __init__(self):
        self.clients = {
            "PubMed": PubMedClient(),
            "Embase": EmbaseClient(),
            "Cochrane": CochraneClient(),
            "CINAHL": CinahlClient(),
            "KMbase": KMbaseClient(),
            "CiNii": CiNiiClient(),
            "ScienceON": ScienceOnClient(),
            "RISS": RissClient(),
            "CNKI": CnkiClient()
        }

    def federated_search(self, query: str, expanded_query: str = None, dbs: List[str] = None) -> List[Dict[str, Any]]:
        aggregated = []
        if not dbs:
            dbs = list(self.clients.keys())
        
        for db in dbs:
            if db in self.clients:
                try:
                    # Pass both original and expanded query
                    results = self.clients[db].search(query, expanded_query=expanded_query)
                    if results:
                        aggregated.extend(results)
                except Exception as e:
                    print(f"Error searching {db}: {e}")
                
        return aggregated
