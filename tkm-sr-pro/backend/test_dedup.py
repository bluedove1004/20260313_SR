from common.utils.deduplicator import HybridDeduplicator
import json

records = [
    {
        "id": "1",
        "title": "Electroacupuncture for Atopic Dermatitis: A RCT",
        "authors": "Kim H, Lee S",
        "year": 2024,
        "pmid": "12345",
        "doi": "10.123/456"
    },
    {
        "id": "2",
        "title": "Electroacupuncture for Atopic Dermatitis: A RCT",
        "authors": "Kim H, Lee S",
        "year": 2024,
        "pmid": "12345",  # Deterministic Match via PMID
        "doi": "10.123/456"
    },
    {
        "id": "3",
        "title": "Electro-acupuncture for Atopic Dermatitis: A Randomized Controlled Trial",
        "authors": "Kim Heejin, Lee Seungwoo",
        "year": 2024,
        "pmid": "",       # Fuzzy Match required
        "doi": ""
    },
    {
        "id": "4",
        "title": "鍼灸 for Atopic Dermatitis",
        "authors": "Wang L",
        "year": 2023,
        "pmid": "99999",
        "doi": ""
    },
    {
        "id": "5",
        "title": "针灸 for Atopic Dermatitis", # Multilingual Normalization (Trad to Simp)
        "authors": "Wang L",
        "year": 2023,
        "pmid": "",
        "doi": ""
    }
]

deduplicator = HybridDeduplicator()
results = deduplicator.deduplicate(records)

print(json.dumps(results, indent=2))
