import requests
from typing import List, Set

class MeSHExpander:
    """
    Utility to expand a medical search query using the NCBI MeSH database.
    It finds formal MeSH headings and their 'Entry Terms' (synonyms) 
    using esearch and esummary (JSON).
    """
    def __init__(self):
        self.base_url = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils"

    def expand_query(self, query: str) -> str:
        """
        Takes a string like 'atopic dermatitis' and returns an expanded 
        Boolean query like '("Atopic Dermatitis" OR "Eczema, Atopic" OR ...)'
        """
        if not query or len(query.strip()) < 3:
            return query

        try:
            # 1. Search MeSH database for the term
            # We use retmode=json for easier parsing
            search_params = {
                "db": "mesh",
                "term": f"{query}[All Fields]",
                "retmax": 3,
                "retmode": "json"
            }
            res = requests.get(f"{self.base_url}/esearch.fcgi", params=search_params, timeout=5)
            res.raise_for_status()
            data = res.json()
            id_list = data.get("esearchresult", {}).get("idlist", [])

            if not id_list:
                return query

            # 2. Fetch Summaries for these MeSH IDs (contains Entry Terms)
            summary_params = {
                "db": "mesh",
                "id": ",".join(id_list),
                "retmode": "json"
            }
            res = requests.get(f"{self.base_url}/esummary.fcgi", params=summary_params, timeout=5)
            res.raise_for_status()
            summary_data = res.json()
            
            expanded_terms: Set[str] = set()
            
            # Add original query as a quoted string if it contains spaces
            if " " in query:
                expanded_terms.add(f'"{query}"')
            else:
                expanded_terms.add(query)

            # Process results
            result_obj = summary_data.get("result", {})
            uids = result_obj.get("uids", [])
            
            for uid in uids:
                record = result_obj.get(uid, {})
                
                # MeSH terms (Headings + Synonyms are all here in ds_meshterms for MeSH DB)
                terms = record.get("ds_meshterms", [])
                for idx, t in enumerate(terms):
                    if not t: continue
                    
                    # Store quoted term
                    val = f'"{t}"'
                    expanded_terms.add(val)
                    
                    # The first term is usually the official Descriptor Heading
                    if idx == 0:
                        expanded_terms.add(f'{val}[MeSH Terms]')

            if len(expanded_terms) <= 1:
                return query

            # 3. Construct Boolean OR query
            sorted_terms = sorted(list(expanded_terms), key=len)
            return "(" + " OR ".join(sorted_terms) + ")"

        except Exception as e:
            # Fallback to original query on any error
            print(f"MeSH Expansion error for '{query}': {e}")
            return query
