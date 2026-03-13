from common.utils.pdf_parser import PDFSectionParser, PICOExtractor
import json

def test_pdf_extraction():
    # Since we can't download a real PDF easily in this mock, we will mock the lines extraction
    parser = PDFSectionParser()
    
    # Mocking the _extract_text_lines method for testing
    def _mock_extract(path):
        return [
            "Electroacupuncture for Atopic Dermatitis",
            "Abstract",
            "This study aimed to investigate electroacupuncture.",
            "Methods",
            "We enrolled 60 patients randomly assigned into two groups.",
            "Results",
            "The treatment group showed significant improvement (p < 0.05).",
            "Discussion",
            "Acupuncture is effective.",
            "References",
            "1. Kim et al. 2024."
        ]
    parser._extract_text_lines = _mock_extract
    
    print("--- Testing PDF IMRaD Parsing ---")
    sections = parser.parse_pdf("dummy.pdf")
    print(json.dumps(sections, indent=2))
    
    print("\n--- Testing PICO Extraction ---")
    extractor = PICOExtractor()
    methods = sections.get("methods", "")
    results = sections.get("results", "")
    
    pico = extractor.extract_pico(methods, results)
    print(json.dumps(pico, indent=2))

if __name__ == "__main__":
    test_pdf_extraction()
