try:
    import fitz  # PyMuPDF
except ImportError:
    fitz = None

import re
from typing import Dict, Optional

class PDFSectionParser:
    """
    Parses a scientific PDF and attempts to separate its text into logical IMRAD sections.
    Introduction, Methods, Results, Discussion/Conclusion.
    """
    
    def __init__(self):
        # Common section headers in medical literature (case insensitive)
        self.section_patterns = {
            "abstract": re.compile(r"^\s*(abstract|summary)\s*$", re.IGNORECASE),
            "introduction": re.compile(r"^\s*(introduction|background|objective)\s*$", re.IGNORECASE),
            "methods": re.compile(r"^\s*(methods?|material(s)? and methods?|methodology|study design)\s*$", re.IGNORECASE),
            "results": re.compile(r"^\s*(results?|findings|outcomes)\s*$", re.IGNORECASE),
            "discussion": re.compile(r"^\s*(discussion|conclusion(s)?|summary and conclusions?)\s*$", re.IGNORECASE),
            "references": re.compile(r"^\s*(references?|bibliography|literature cited)\s*$", re.IGNORECASE),
        }

    def _extract_text_lines(self, pdf_path: str) -> list:
        if not fitz:
            raise ImportError("PyMuPDF (fitz) is not installed.")
            
        lines = []
        try:
            doc = fitz.open(pdf_path)
            for page in doc:
                text = page.get_text("text")
                # Split and clean
                page_lines = [line.strip() for line in text.split('\n') if line.strip()]
                lines.extend(page_lines)
            doc.close()
        except Exception as e:
            print(f"Error reading PDF: {e}")
        return lines

    def parse_pdf(self, pdf_path: str) -> Dict[str, str]:
        lines = self._extract_text_lines(pdf_path)
        
        sections = {
            "abstract": [],
            "introduction": [],
            "methods": [],
            "results": [],
            "discussion": [],
            "references": [],
            "other": []
        }
        
        current_section = "other"  # Before abstract/intro usually title & authors
        
        for line in lines:
            # Check if line matches a known header
            matched_header = None
            for sec_name, pattern in self.section_patterns.items():
                # Headers are usually short strings, maybe numbered (e.g., "1. Introduction" or "BACKGROUND")
                clean_line = re.sub(r'^[\d\.\s]+', '', line).strip()
                if len(clean_line) < 40 and pattern.match(clean_line):
                    matched_header = sec_name
                    break
            
            if matched_header:
                current_section = matched_header
                continue  # Skip appending the header itself
                
            # Stop collecting if we hit references to save memory/space
            if current_section == "references":
                continue
                
            sections[current_section].append(line)
        
        # Combine lines into blocks of text
        result = {}
        for k, v in sections.items():
            if k != "references": # Usually don't need raw references text for AI SR processing
                # Basic de-hyphenation: if line ends with hyphen, join without space
                text = " ".join(v)
                text = re.sub(r'-\s+', '', text)
                result[k] = text.strip()
                
        return result

class PICOExtractor:
    """
    A foundational Mock/Regex based Extractor for Phase 1. 
    In Phase 2, this will be replaced with a robust span-extraction Transformer model.
    """
    def __init__(self):
        # Basic RegEx matchers for demonstration
        self.sample_size_regex = re.compile(r'(?:n\s*=\s*|sample size of |enrolled |assigned )([0-9]{1,4})\b', re.IGNORECASE)
        self.pvalue_regex = re.compile(r'(?:p\s*[<>=]\s*[0-9\.]+)', re.IGNORECASE)
    
    def extract_pico(self, methods_text: str, results_text: str) -> Dict:
        # Population / Sample Size
        n_match = self.sample_size_regex.search(methods_text) or self.sample_size_regex.search(results_text)
        sample_size = int(n_match.group(1)) if n_match else None
        
        # Extract all p-values found in Results
        p_values = self.pvalue_regex.findall(results_text)
        
        return {
            "population": {
                "sample_size": sample_size,
                "extracted_from": "methods" if n_match else "unknown"
            },
            "statistical_data": {
                "p_values": list(set(p_values))
            }
        }
