import re
import Levenshtein
from typing import List, Dict, Any, Tuple
from collections import defaultdict
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

class DeduplicationResult:
    def __init__(self, record_a: dict, record_b: dict, score: float, evidence: list, status: str):
        self.record_a = record_a
        self.record_b = record_b
        self.score = score
        self.evidence = evidence
        self.status = status
        
    def to_dict(self):
        return {
            "record_a_id": self.record_a.get('id', 'N/A'),
            "record_b_id": self.record_b.get('id', 'N/A'),
            "confidence_score": round(self.score, 4),
            "evidence": self.evidence,
            "status": self.status
        }

class HybridDeduplicator:
    def __init__(self, threshold_high: float = 0.95, threshold_review: float = 0.65):
        self.threshold_high = threshold_high
        self.threshold_review = threshold_review
        
    def _normalize_multilingual(self, text: str) -> str:
        """
        Stage 3: Multilingual Normalization
        Applies basic normalization: lowercasing, stripping punctuation.
        Mocked mapping of traditional Chinese to simplified, and spacing issues.
        """
        if not text:
            return ""
        
        # Lowercase
        text = text.lower()
        
        # Remove special characters, punctuation, and multiple spaces
        text = re.sub(r'[^\w\s]', '', text)
        text = re.sub(r'\s+', ' ', text).strip()
        
        # Mock Traditional mapping (For actual implementation, use OpenCC or similar library)
        # 鍼灸 -> 针灸, 氣 -> 气
        t2s_map = {
            "鍼灸": "针灸",
            "氣": "气",
            "醫": "医",
            "藥": "药"
        }
        for trad, simp in t2s_map.items():
            text = text.replace(trad, simp)
            
        return text

    def _deterministic_match(self, records: List[dict]) -> Tuple[List[DeduplicationResult], List[dict]]:
        """
        Stage 1: Exact match by DOI or PMID.
        Returns matching results and list of remaining records to process.
        """
        results = []
        visited_indices = set()
        
        # Group by Identifiers
        pmid_map = defaultdict(list)
        doi_map = defaultdict(list)
        
        for idx, rec in enumerate(records):
            pmid = rec.get('pmid')
            doi = rec.get('doi')
            
            if pmid:
                pmid_map[pmid].append((idx, rec))
            if doi:
                doi_map[doi].append((idx, rec))
                
        # Process PMIDs
        for pmid, items in pmid_map.items():
            if len(items) > 1:
                # Compare all pairs within this group
                for i in range(len(items)):
                    for j in range(i + 1, len(items)):
                        idx_a, rec_a = items[i]
                        idx_b, rec_b = items[j]
                        if idx_a not in visited_indices and idx_b not in visited_indices:
                            results.append(DeduplicationResult(
                                record_a=rec_a, record_b=rec_b, score=1.0,
                                evidence=["Deterministic Map via PMID Match"], status="auto"
                            ))
                            visited_indices.add(idx_b) # Keep idx_a as primary
        
        # Process DOIs
        for doi, items in doi_map.items():
            if len(items) > 1:
                for i in range(len(items)):
                    for j in range(i + 1, len(items)):
                        idx_a, rec_a = items[i]
                        idx_b, rec_b = items[j]
                        if idx_a not in visited_indices and idx_b not in visited_indices:
                            results.append(DeduplicationResult(
                                record_a=rec_a, record_b=rec_b, score=1.0,
                                evidence=["Deterministic Map via DOI Match"], status="auto"
                            ))
                            visited_indices.add(idx_b)

        # Remaining un-matched records
        remaining = [rec for i, rec in enumerate(records) if i not in visited_indices]
        return results, remaining

    def _fuzzy_match(self, records: List[dict]) -> List[DeduplicationResult]:
        """
        Stage 2 & 3: Fuzzy Matching with Normalized Text.
        Calculates a hybrid similarity score (Levenshtein + TF-IDF Cosine).
        """
        results = []
        n = len(records)
        if n < 2:
            return results

        # Create normalized corpora for TF-IDF Vectorization
        corpus = []
        for rec in records:
            title = self._normalize_multilingual(rec.get('title', ''))
            author = self._normalize_multilingual(rec.get('authors', ''))
            year = str(rec.get('year', ''))
            corpus.append(f"{title} {author} {year}")
            
        vectorizer = TfidfVectorizer(analyzer='char_wb', ngram_range=(2, 4)).fit(corpus)
        vectors = vectorizer.transform(corpus)
        
        # Pairwise Cosine Similarity
        cosine_matrix = cosine_similarity(vectors)

        visited = set()

        for i in range(n):
            if i in visited:
                continue
            for j in range(i + 1, n):
                if j in visited:
                    continue
                
                rec_a = records[i]
                rec_b = records[j]
                
                title_a = self._normalize_multilingual(rec_a.get('title', ''))
                title_b = self._normalize_multilingual(rec_b.get('title', ''))
                
                # Title Levenshtein Ratio (0 to 1)
                lev_ratio = Levenshtein.ratio(title_a, title_b) if title_a and title_b else 0.0
                
                # Text Cosine Similarity
                cos_sim = cosine_matrix[i, j]
                
                # Hybrid Score (Weights: Title Lev 40%, TF-IDF Abstract/Auth Vector 60%)
                hybrid_score = (lev_ratio * 0.4) + (cos_sim * 0.6)
                
                if hybrid_score >= self.threshold_review:
                    # Decide Status based on thresholds
                    status = "auto" if hybrid_score >= self.threshold_high else "review"
                    
                    evidence = [
                        f"Hybrid Score: {hybrid_score:.2f}",
                        f"Levenshtein Title Ratio: {lev_ratio:.2f}",
                        f"TF-IDF Cosine Sim: {cos_sim:.2f}"
                    ]
                    
                    # Ensure year matches perfectly if score is on border review
                    year_a = rec_a.get('year')
                    year_b = rec_b.get('year')
                    if year_a and year_b and str(year_a) != str(year_b):
                        # Penalize score slightly if year mismatches but text is similar
                        hybrid_score = hybrid_score * 0.85
                        evidence.append("Year Mismatch Penalty (-15%)")
                        if hybrid_score < self.threshold_review:
                            continue # Drops below threshold

                    results.append(DeduplicationResult(
                        record_a=rec_a, record_b=rec_b, score=hybrid_score, 
                        evidence=evidence, status=status
                    ))
                    visited.add(j) # Assume rec_b is a duplicate and skip it for other comparisons

        return results

    def deduplicate(self, records: List[dict]) -> List[dict]:
        """
        Main interface executing the pipeline chronologically.
        Expects a list of dictionaries with minimum keys: id, title, authors, abstracts, year, pmid, doi
        """
        # 1. Deterministic
        deterministic_results, remaining_records = self._deterministic_match(records)
        
        # 2. Fuzzy + Multilingual normalization combined
        fuzzy_results = self._fuzzy_match(remaining_records)
        
        all_results = deterministic_results + fuzzy_results
        return [r.to_dict() for r in all_results]
