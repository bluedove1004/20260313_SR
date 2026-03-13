import { useState, useEffect } from 'react';
import { FileCheck, Activity, Check, X, AlertCircle } from 'lucide-react';

// MOCK DATA: To simulate papers coming from database waiting for RCT Screening
const MOCK_RECORDS = [
  {
    id: "1",
    title: "Acupuncture for back pain",
    abstract: "We conducted a randomized controlled trial to evaluate the efficacy of acupuncture. 100 patients were randomly assigned to two groups.",
    keywords: "acupuncture, back pain, RCT",
    year: 2024,
    authors: "Smith J, Doe A"
  },
  {
    id: "2",
    title: "Acupuncture in mice",
    abstract: "We studied the effect of acupuncture in mice. The back pain was reduced.",
    keywords: "animal model",
    year: 2023,
    authors: "Lee M, Kim K"
  },
  {
    id: "3",
    title: "Observational study of back pain",
    abstract: "We observed 50 patients with back pain receiving acupuncture. The results showed improvement.",
    keywords: "observational, acupuncture",
    year: 2022,
    authors: "Park T"
  }
];

// In real app, this would use apiClient to call Django -> Django calls FastAPI
const mockPredict = async (req: any) => {
  if (req.title.includes("mice")) {
    return {
      is_rct: false,
      confidence: 0.95,
      exclusion_reason: "Study Design (Review/Animal/Case)",
      explanation: "Excluded due to finding exclusion keyword: 'mice'",
      highlighted_sentences: ["mice"]
    };
  } else if (req.title.includes("Observational")) {
    return {
      is_rct: false,
      confidence: 0.85,
      exclusion_reason: "Study Design (Non-RCT)",
      explanation: "No RCT characteristics detected in text. Likely observational or non-randomized.",
      highlighted_sentences: []
    };
  } else {
    return {
      is_rct: true,
      confidence: 0.96,
      exclusion_reason: null,
      explanation: "Detected strong RCT characteristics in abstract based on Lexicon/BERT features.",
      highlighted_sentences: [
        "We conducted a randomized controlled trial to evaluate the efficacy of acupuncture.",
        "100 patients were randomly assigned to two groups."
      ]
    };
  }
};

export default function RctScreeningPage() {
  const [records] = useState(MOCK_RECORDS);
  const [predictions, setPredictions] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Simulate auto-screening on load
    const screenAll = async () => {
      setIsLoading(true);
      const preds: Record<string, any> = {};
      for (const rec of records) {
        const res = await mockPredict({
          title: rec.title,
          abstract: rec.abstract,
          keywords: rec.keywords
        });
        preds[rec.id] = { ...res, status: 'pending' };
      }
      setPredictions(preds);
      setIsLoading(false);
    };
    
    screenAll();
  }, [records]);

  const handleDecision = (id: string, decision: 'include' | 'exclude') => {
    setPredictions(prev => ({
      ...prev,
      [id]: { ...prev[id], status: decision }
    }));
  };

  const highlightText = (text: string, highlights: string[]) => {
    if (!highlights || highlights.length === 0) return text;
    
    let highlightedResult = text;
    highlights.forEach(h => {
      if (!h) return;
      const regex = new RegExp(`(${h.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
      highlightedResult = highlightedResult.replace(regex, '<mark class="bg-yellow-200 px-1 rounded">$1</mark>');
    });
    
    return <span dangerouslySetInnerHTML={{ __html: highlightedResult }} />;
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
          <FileCheck className="text-tkm-main" size={32} />
          RCT Auto Classification
        </h1>
        <p className="mt-2 text-gray-500 text-lg">
          메타데이터(제목, 초록)를 기반으로 RCT 여부를 자동 감별하고, 판단 근거를 하이라이팅하여 연구자의 확정을 보조합니다.
        </p>
      </div>

      <div className="space-y-6">
        {isLoading && <div className="text-center py-10 text-gray-500 animate-pulse">Running AI Classification...</div>}
        
        {!isLoading && records.map((rec) => {
          const pred = predictions[rec.id];
          if (!pred) return null;

          const isAutoExcluded = !pred.is_rct && pred.confidence > 0.90;
          
          return (
            <div key={rec.id} className={`bg-white rounded-2xl shadow-sm border p-6 transition-all ${
              pred.status === 'include' ? 'border-green-400 ring-2 ring-green-100' : 
              pred.status === 'exclude' ? 'border-red-400 ring-2 ring-red-100' : 'border-gray-200'
            }`}>
              
              <div className="flex items-start justify-between gap-6">
                <div className="flex-1 space-y-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{rec.title}</h3>
                    <p className="text-sm text-gray-500 mt-1">{rec.authors} ({rec.year}) | Keywords: {rec.keywords}</p>
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded-xl text-sm leading-relaxed text-gray-700">
                    {highlightText(rec.abstract, pred.highlighted_sentences)}
                  </div>
                  
                  <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 text-sm">
                    <div className="flex items-center gap-2 font-bold text-blue-900 mb-1">
                      <Activity size={16} /> AI 판별 결과 (Confidence: {(pred.confidence * 100).toFixed(1)}%)
                    </div>
                    <div className="text-blue-800">
                      <strong>Prediction:</strong> {pred.is_rct ? "✅ Likely RCT" : "❌ Not RCT"}<br/>
                      {pred.exclusion_reason && <><strong className="text-red-700">Exclusion Reason:</strong> <span className="text-red-600">{pred.exclusion_reason}</span><br/></>}
                      <strong>Explanation:</strong> {pred.explanation}
                    </div>
                  </div>
                </div>
                
                <div className="w-48 flex flex-col gap-3 shrink-0">
                  <div className="text-center text-sm font-semibold text-gray-500 mb-2">연구자 최종 판단</div>
                  
                  <button 
                    onClick={() => handleDecision(rec.id, 'include')}
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl font-bold transition-colors ${
                      pred.status === 'include' 
                        ? 'bg-green-600 text-white' 
                        : 'bg-gray-100 text-gray-600 hover:bg-green-50 hover:text-green-700'
                    }`}
                  >
                    <Check size={18} /> Include
                  </button>
                  
                  <button 
                    onClick={() => handleDecision(rec.id, 'exclude')}
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl font-bold transition-colors ${
                      pred.status === 'exclude' 
                        ? 'bg-red-600 text-white' 
                        : isAutoExcluded && pred.status === 'pending'
                          ? 'bg-red-50 text-red-600 ring-1 ring-red-200 hover:bg-red-100'
                          : 'bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-700'
                    }`}
                  >
                    <X size={18} /> Exclude
                  </button>

                  {isAutoExcluded && pred.status === 'pending' && (
                    <div className="text-xs text-red-500 flex items-start gap-1 mt-2">
                       <AlertCircle size={14} className="shrink-0" />
                       AI 강제 배제 권장 (Confidence &gt; 90%)
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
