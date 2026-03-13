from fastapi.testclient import TestClient
from main import app
import json

client = TestClient(app)

def test_predict_rct():
    # Test 1: RCT Positive
    response = client.post(
        "/api/v1/ai/predict_rct",
        json={
            "title": "Acupuncture for back pain",
            "abstract": "We conducted a randomized controlled trial to evaluate the efficacy of acupuncture. 100 patients were randomly assigned to two groups.",
            "keywords": "acupuncture, back pain, RCT"
        }
    )
    print("--- Test 1 (Positive) ---")
    print(json.dumps(response.json(), indent=2))
    
    # Test 2: RCT Negative (Exclusion word)
    response2 = client.post(
        "/api/v1/ai/predict_rct",
        json={
            "title": "Acupuncture in mice",
            "abstract": "We studied the effect of acupuncture in mice. The back pain was reduced.",
            "keywords": "animal model"
        }
    )
    print("\n--- Test 2 (Animal Exclusion) ---")
    print(json.dumps(response2.json(), indent=2))
    
    # Test 3: Uncertain (No keywords)
    response3 = client.post(
        "/api/v1/ai/predict_rct",
        json={
            "title": "Observational study of back pain",
            "abstract": "We observed 50 patients with back pain receiving acupuncture. The results showed improvement.",
            "keywords": "observational, acupuncture"
        }
    )
    print("\n--- Test 3 (Non-RCT Observational) ---")
    print(json.dumps(response3.json(), indent=2))

if __name__ == "__main__":
    test_predict_rct()
