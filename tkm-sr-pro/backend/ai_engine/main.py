from fastapi import FastAPI
from pydantic import BaseModel
from typing import List, Optional
import re

app = FastAPI()

class PicoExtractionRequest(BaseModel):
    record_id: Optional[str] = None
    title: str
    abstract: str
    full_text: Optional[str] = ""

class PicoResult(BaseModel):
    population: dict
    intervention: dict
    comparison: dict
    outcome: dict
    study_design: dict
    statistical_summary: dict
    extraction_confidence: float
    raw_evidence: List[str]

@app.post("/api/v1/ai/extract_pico", response_model=PicoResult)
def extract_pico(req: PicoExtractionRequest):
    """
    Phase 1: Regex + Lexicon-based PICO extraction from abstract / full-text.
    Phase 2+: Replace with fine-tuned BioBERT/KM-BERT NER model.
    """
    title_txt = req.title or ""
    abstract_txt = req.abstract or ""
    full_txt = req.full_text or ""

    abs_sentences = re.split(r'(?<=[.!?])\s+', f"{title_txt}. {abstract_txt}")
    full_sentences = re.split(r'(?<=[.!?])\s+', full_txt)
    
    # Combined with source info
    all_sentences = []
    for s in abs_sentences:
        if s.strip(): all_sentences.append({"txt": s.strip(), "src": "Abstract"})
    for s in full_sentences:
        if s.strip(): all_sentences.append({"txt": s.strip(), "src": "Full-text"})

    text = f"{title_txt}. {abstract_txt} {full_txt}".strip()
    evidence = []

    def get_match_sentence(keywords):
        for s in all_sentences:
            if any(w in s["txt"].lower() for w in keywords):
                return s
        return None

    def add_evidence(label, s_data):
        if s_data:
            evidence.append(f"[{label}] [{s_data['src']}] {s_data['txt'][:2000]}")
            return True
        return False

    # ── Population ───────────────────────────────────────────────
    n_match = re.search(r'\b(?:n\s*=\s*|total\s+of\s+|enrolled\s+|participants?[\s:]+|patients?[\s:]+|subjects?[\s:]+)(\d{2,5})\b', text, re.I)
    sample_size = int(n_match.group(1)) if n_match else None

    diagnosis_patterns = [
        r'patients?\s+with\s+([\w\s\-]+(?:syndrome|disease|disorder|pain|cancer|depression|anxiety|eczema|dermatitis))',
        r'(atopic\s+dermatitis|depression|insomnia|irritable\s+bowel|chronic\s+pain|hypertension|diabetes)',
        r'(?:diagnosed|suffering)\s+(?:with|from)\s+([\w\s]+)'
    ]
    diagnosis = None
    for pat in diagnosis_patterns:
        m = re.search(pat, text, re.I)
        if m:
            diagnosis = m.group(1).strip().title()
            break

    age_match = re.search(r'(?:aged?|age\s+range?|mean\s+age)[:\s]+(\d{1,3}(?:\.\d)?(?:\s*[-–]\s*\d{1,3})?(?:\s*years?)?)', text, re.I)
    age_str = age_match.group(1).strip() if age_match else None

    pop_s = get_match_sentence(['patient', 'participant', 'subject', 'enrolled', 'n =', 'aged'])
    add_evidence("Population", pop_s)

    # ── Intervention ─────────────────────────────────────────────
    tkm_herbs = ['xiaoyao', 'liuwei', 'buzhong', 'huangqi', 'danshen', 'gegen', 'acupuncture', 'moxibustion', 'cupping', 'herbal', 'traditional chinese medicine', 'tcm', 'korean medicine', 'kampo', '소요산', '육미지황', '침', '뜸', 'electroacupuncture', 'auricular', 'tuina']
    freq_match = re.search(r'(\d+)\s*(?:times?|sessions?|treatments?)\s*(?:per|a|each)?\s*(week|day|month)', text, re.I)
    duration_match = re.search(r'for\s+(\d+\s*(?:weeks?|months?|days?))', text, re.I)
    
    intervention_name = None
    for herb in tkm_herbs:
        if herb.lower() in text.lower():
            intervention_name = herb.title()
            break
    
    int_s = get_match_sentence(['treatment', 'intervention', 'administered', 'received', 'acupuncture', 'herbal', 'group'])
    add_evidence("Intervention", int_s)

    # ── Comparison ───────────────────────────────────────────────
    ctrl_match = re.search(r'(?:control\s+group?|placebo|sham|waiting\s+list|usual\s+care|standard\s+(?:care|treatment))', text, re.I)
    comparison_type = ctrl_match.group(0).strip().title() if ctrl_match else None

    comp_s = get_match_sentence(['placebo', 'control', 'sham', 'comparison', 'versus', 'vs.', 'compared'])
    add_evidence("Comparison", comp_s)

    # ── Outcome ──────────────────────────────────────────────────
    outcome_patterns = [
        r'(?:primary\s+outcome|primary\s+endpoint)[:\s]+([\w\s,\-]+?)(?:\.|;|$)',
        r'(?:evaluated|measured|assessed)\s+(?:by|using|with)\s+([\w\s\-]+?)(?:\.|,|;)',
        r'(?:outcomes?\s+included?|outcome\s+measures?)[:\s]+([\w\s,\-]+?)(?:\.|;)',
    ]
    primary_outcome = None
    for pat in outcome_patterns:
        m = re.search(pat, text, re.I)
        if m:
            primary_outcome = m.group(1).strip()
            break

    scale_match = re.findall(r'\b([A-Z]{2,8}(?:\s*-\s*\d+)?)\b', text)
    scales = list(set([s for s in scale_match if len(s) >= 3 and s.isupper()]))[:5]

    out_s = get_match_sentence(['outcome', 'endpoint', 'score', 'assessed', 'measured', 'scale'])
    add_evidence("Outcome", out_s)

    # ── Study Design ─────────────────────────────────────────────
    blind_match = re.search(r'(double[\s-]blind|single[\s-]blind|triple[\s-]blind|open[\s-]label)', text, re.I)
    alloc_match = re.search(r'(random(?:ized|ised)\s+(?:to|into|allocation)|stratified\s+randomization|block\s+randomization)', text, re.I)
    parallel_match = re.search(r'(parallel[\s-]group|crossover|factorial|cluster)', text, re.I)

    # ── Statistics ───────────────────────────────────────────────
    p_values = re.findall(r'p\s*[<=>]\s*0\.\d+', text)
    ci_values = re.findall(r'(?:95%?\s+CI|confidence\s+interval)[:\s]*\[?([\d.\s,–-]+)\]?', text, re.I)
    effect_sizes = re.findall(r'(?:SMD|MD|OR|RR|HR|ES|Cohen\'?s?\s+d)[:\s=]?\s*([-\d.]+)', text)

    stat_s = get_match_sentence(['significant', 'p <', 'p=', 'confidence', 'mean difference', 'odds ratio'])
    add_evidence("Statistics", stat_s)

    # ── Confidence scoring ────────────────────────────────────────
    filled_fields = sum([
        bool(sample_size), bool(diagnosis), bool(intervention_name),
        bool(comparison_type), bool(primary_outcome), bool(p_values)
    ])
    confidence = round(min(0.5 + (filled_fields / 6) * 0.45, 0.95), 2)

    return PicoResult(
        population={
            "sample_size": sample_size,
            "diagnosis": diagnosis,
            "age_range": age_str,
            "extracted_from": pop_s["txt"][:120] if pop_s else None
        },
        intervention={
            "name": intervention_name,
            "frequency": freq_match.group(0) if freq_match else None,
            "duration": duration_match.group(1) if duration_match else None,
            "extracted_from": int_s["txt"][:120] if int_s else None
        },
        comparison={
            "type": comparison_type,
            "extracted_from": comp_s["txt"][:120] if comp_s else None
        },
        outcome={
            "primary_outcome": primary_outcome,
            "measurement_scales": scales,
            "extracted_from": out_s["txt"][:120] if out_s else None
        },
        study_design={
            "blinding": blind_match.group(1) if blind_match else None,
            "allocation": alloc_match.group(1) if alloc_match else None,
            "design_type": parallel_match.group(1).title() if parallel_match else "Parallel-Group RCT"
        },
        statistical_summary={
            "p_values": list(set(p_values))[:6],
            "confidence_intervals": ci_values[:3],
            "effect_sizes": list(set(effect_sizes))[:4]
        },
        extraction_confidence=confidence,
        raw_evidence=evidence
    )


# ─────────────────────────────────────────────────────────────────────────────
# Full-text Eligibility Screening Endpoint
# ─────────────────────────────────────────────────────────────────────────────

class InclusionCriterion(BaseModel):
    id: str
    label: str
    type: str  # 'inclusion' | 'exclusion'

class FulltextScreenRequest(BaseModel):
    title: str
    abstract: str
    full_text: Optional[str] = ""
    criteria: List[InclusionCriterion] = []

class CriterionResult(BaseModel):
    criterion_id: str
    label: str
    type: str
    met: bool  # True = criterion is met
    confidence: float
    evidence: str

class FulltextScreenResult(BaseModel):
    eligible: bool
    overall_confidence: float
    recommendation: str  # 'INCLUDE' | 'EXCLUDE' | 'UNCERTAIN'
    exclusion_reason: Optional[str] = None
    criteria_results: List[CriterionResult]
    summary: str

# Default CONSORT/PRISMA-aligned inclusion/exclusion criteria for TKM RCT reviews
DEFAULT_CRITERIA = [
    {"id": "ic1", "label": "무작위 대조군 연구 (RCT) 설계", "type": "inclusion",
     "keywords": ["randomized", "randomised", "rct", "randomly assigned", "무작위", "random allocation"]},
    {"id": "ic2", "label": "인간 대상 연구", "type": "inclusion",
     "keywords": ["patients", "participants", "volunteers", "adults", "children", "인간", "환자", "참가자"]},
    {"id": "ic3", "label": "중재군에 한약/침구 치료 포함", "type": "inclusion",
     "keywords": ["herbal", "acupuncture", "moxibustion", "tcm", "korean medicine", "xiaoyao", "liuwei",
                  "electroacupuncture", "cupping", "tuina", "침", "뜸", "한약"]},
    {"id": "ic4", "label": "적절한 대조군 설정 (위약 또는 표준치료)", "type": "inclusion",
     "keywords": ["placebo", "sham", "control group", "usual care", "standard treatment", "위약", "대조군"]},
    {"id": "ec1", "label": "동물 실험 또는 시험관 연구 제외", "type": "exclusion",
     "keywords": ["rat", "mice", "mouse", "in vitro", "animal", "cell line", "동물실험"]},
    {"id": "ec2", "label": "체계적 고찰 / 메타분석 제외", "type": "exclusion",
     "keywords": ["systematic review", "meta-analysis", "narrative review", "scoping review", "체계적 고찰", "메타분석"]},
    {"id": "ec3", "label": "증례보고 / 관찰연구 제외", "type": "exclusion",
     "keywords": ["case report", "case series", "observational", "cohort", "cross-sectional", "증례보고"]},
]

@app.post("/api/v1/ai/screen_fulltext", response_model=FulltextScreenResult)
def screen_fulltext(req: FulltextScreenRequest):
    """
    Phase 1: Lexicon + rule-based eligibility screening.
    Checks each inclusion/exclusion criterion against the text.
    """
    text = f"{req.title}. {req.abstract} {req.full_text or ''}".lower()
    
    # Use provided criteria OR fall back to defaults
    criteria_to_check = req.criteria if req.criteria else [
        InclusionCriterion(id=c["id"], label=c["label"], type=c["type"])
        for c in DEFAULT_CRITERIA
    ]
    
    # Build a lookup for keywords
    keyword_map = {c["id"]: c["keywords"] for c in DEFAULT_CRITERIA}
    
    results: List[CriterionResult] = []
    failed_exclusions = []
    failed_inclusions = []
    
    for criterion in criteria_to_check:
        keywords = keyword_map.get(criterion.id, [])
        matched_keywords = []
        for kw in keywords:
            pattern = r'\b' + re.escape(kw) + r'\b'
            if re.search(pattern, text, re.I):
                matched_keywords.append(kw)
        
        if criterion.type == "inclusion":
            met = len(matched_keywords) > 0
            confidence = min(0.90, 0.55 + len(matched_keywords) * 0.12)
            if not met:
                confidence = 0.35
                failed_inclusions.append(criterion.label)
            evidence = f"검출 키워드: {', '.join(matched_keywords)}" if matched_keywords else "관련 키워드 미검출"
        else:  # exclusion
            met = len(matched_keywords) > 0  # criterion met = problem found
            confidence = min(0.95, 0.60 + len(matched_keywords) * 0.15) if met else 0.40
            if met:
                failed_exclusions.append(criterion.label)
            evidence = f"배제 키워드 발견: {', '.join(matched_keywords)}" if matched_keywords else "배제 키워드 없음"
        
        results.append(CriterionResult(
            criterion_id=criterion.id,
            label=criterion.label,
            type=criterion.type,
            met=met,
            confidence=round(confidence, 2),
            evidence=evidence
        ))
    
    # Determine eligibility
    has_failed_exclusion = len(failed_exclusions) > 0
    inclusion_met_count = sum(1 for r in results if r.type == "inclusion" and r.met)
    total_inclusions = sum(1 for r in results if r.type == "inclusion")
    inclusion_rate = inclusion_met_count / total_inclusions if total_inclusions > 0 else 0
    
    if has_failed_exclusion:
        eligible = False
        recommendation = "EXCLUDE"
        exclusion_reason = f"배제 기준 해당: {', '.join(failed_exclusions)}"
        overall_confidence = 0.90
        summary = f"❌ 아래 배제 기준에 해당하여 제외를 권장합니다: {exclusion_reason}"
    elif inclusion_rate >= 0.75:
        eligible = True
        recommendation = "INCLUDE"
        exclusion_reason = None
        overall_confidence = round(0.60 + inclusion_rate * 0.35, 2)
        summary = f"✅ 포함 기준 {inclusion_met_count}/{total_inclusions}개 충족. 포함을 권장합니다."
    elif inclusion_rate >= 0.40:
        eligible = False
        recommendation = "UNCERTAIN"
        exclusion_reason = f"포함 기준 불충분 ({inclusion_met_count}/{total_inclusions}개 충족)"
        overall_confidence = 0.50
        summary = f"⚠️ 포함 기준 {inclusion_met_count}/{total_inclusions}개만 충족. 연구자 직접 확인이 필요합니다."
    else:
        eligible = False
        recommendation = "EXCLUDE"
        exclusion_reason = f"포함 기준 미달: {', '.join(failed_inclusions[:3])}"
        overall_confidence = 0.70
        summary = f"❌ 포함 기준 {inclusion_met_count}/{total_inclusions}개 충족에 그침. 제외를 권장합니다."
    
    return FulltextScreenResult(
        eligible=eligible,
        overall_confidence=overall_confidence,
        recommendation=recommendation,
        exclusion_reason=exclusion_reason,
        criteria_results=results,
        summary=summary
    )
