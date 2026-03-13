from fastapi import FastAPI
from pydantic import BaseModel
from typing import Optional, List
import re

app = FastAPI(title="TKM-SR Pro AI Engine API", version="0.1.0")

class InferenceRequest(BaseModel):
    title: str
    abstract: str
    keywords: str

class RCTPrediction(BaseModel):
    is_rct: bool
    confidence: float
    exclusion_reason: Optional[str] = None
    explanation: str
    highlighted_sentences: List[str]

# Global pipeline state for AI Model
nlp_classifier = None

@app.on_event("startup")
def load_model():
    global nlp_classifier
    print("Loading RCT Classification Model (Mocking BioBERT/KM-BERT in Phase 1)...")
    # In a real environment, load fine-tuned KM-BERT or BioBERT.
    # Ex: nlp_classifier = pipeline("text-classification", model="your-local-finetuned-model")
    nlp_classifier = "Loaded"

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "tkm_ai_engine"}

@app.post("/api/v1/ai/predict_rct", response_model=RCTPrediction)
def predict_rct(req: InferenceRequest):
    text = f"{req.title}. {req.abstract} {req.keywords}".lower()
    
    # 렉시콘 기반 RCT 키워드 (TKM 특화 용어 및 한의학 특징 포함)
    rct_keywords = [
        "randomized controlled trial", "randomised controlled trial",
        "randomly assigned", "무작위배정", "무작위 대조군",
        "rct", "double-blind", "randomized"
    ]
    
    # 배제 규칙 키워드
    exclusion_keywords = [
        "case report", "review", "meta-analysis", "rat", "mice",
        "in vitro", "증례보고", "동물실험", "vivo"
    ]
    
    # Find sentences to highlight
    sentences = re.split(r'(?<=[.!?]) +', req.abstract)
    highlights = []
    
    is_rct = False
    confidence = 0.5
    exclusion_reason = None
    
    # 1. 1차 배제 규칙 검사 (Hard Exclusion)
    for kw in exclusion_keywords:
        if kw in text:
            return RCTPrediction(
                is_rct=False,
                confidence=0.95,
                exclusion_reason="Study Design (Review/Animal/Case)",
                explanation=f"Excluded due to finding exclusion keyword: '{kw}'",
                highlighted_sentences=[kw]
            )
            
    # 2. RCT 특성 감지 로직 (Simulating AI Classification Output)
    for kw in rct_keywords:
        if kw in text:
            is_rct = True
            confidence = 0.96
            # Find exact sentence for highlighting evidence
            for s in sentences:
                if kw in s.lower() and s not in highlights:
                    highlights.append(s)
            
    if is_rct:
        explanation = "Detected strong RCT characteristics in abstract based on Lexicon/BERT features."
    else:
        # If no strict RCT words, assume False with varying confidence
        is_rct = False
        confidence = 0.85
        exclusion_reason = "Study Design (Non-RCT)"
        explanation = "No RCT characteristics detected in text. Likely observational or non-randomized."
        
    return RCTPrediction(
        is_rct=is_rct,
        confidence=confidence,
        exclusion_reason=exclusion_reason,
        explanation=explanation,
        highlighted_sentences=highlights
    )
