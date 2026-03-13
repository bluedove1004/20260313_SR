import { useState } from 'react';
import { Layers, Play, CheckCircle, AlertTriangle } from 'lucide-react';
import { apiClient } from '../../api/client';

const INITIAL_DATA = [
  {
    id: "1",
    title: "Electroacupuncture for Atopic Dermatitis: A RCT",
    authors: "Kim H, Lee S",
    year: 2024,
    pmid: "12345",
    doi: "10.123/456"
  },
  {
    id: "2",
    title: "Electroacupuncture for Atopic Dermatitis: A RCT",
    authors: "Kim H, Lee S",
    year: 2024,
    pmid: "12345",
    doi: "10.123/456"
  },
  {
    id: "3",
    title: "Electro-acupuncture for Atopic Dermatitis: A Randomized Controlled Trial",
    authors: "Kim Heejin, Lee Seungwoo",
    year: 2024,
    pmid: "",
    doi: ""
  },
  {
    id: "4",
    title: "鍼灸 for Atopic Dermatitis",
    authors: "Wang L",
    year: 2023,
    pmid: "99999",
    doi: ""
  },
  {
    id: "5",
    title: "针灸 for Atopic Dermatitis",
    authors: "Wang L",
    year: 2023,
    pmid: "",
    doi: ""
  }
];

export default function DedupPage() {
  const [inputData, setInputData] = useState(JSON.stringify(INITIAL_DATA, null, 2));
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<any[]>([]);

  const handleRunDedup = async () => {
    setIsRunning(true);
    try {
      const records = JSON.parse(inputData);
      const response = await apiClient.post('/search/deduplicate/', { records });
      setResults(response.data.results || []);
    } catch (e) {
      alert("Invalid JSON format or API Error");
      console.error(e);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
          <Layers className="text-tkm-main" size={32} />
          Hybrid Deduplication
        </h1>
        <p className="mt-2 text-gray-500 text-lg">
          3단계 파이프라인(Deterministic ➔ Fuzzy ➔ Multilingual) 중복 판독 모듈 시연 페이지입니다.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Input Source */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Input Metadata (JSON)</h2>
          <textarea
            value={inputData}
            onChange={(e) => setInputData(e.target.value)}
            className="flex-1 w-full bg-gray-50 border border-gray-200 rounded-xl p-4 font-mono text-sm resize-none focus:ring-2 focus:ring-tkm-main outline-none min-h-[400px]"
          />
          <button
            onClick={handleRunDedup}
            disabled={isRunning}
            className="mt-4 w-full py-4 bg-tkm-main hover:bg-tkm-dark text-white rounded-xl font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isRunning ? <span className="animate-pulse">분석 중...</span> : <><Play size={20} /> 증복 검토 실행</>}
          </button>
        </div>

        {/* Results */}
        <div className="bg-gray-50 rounded-2xl border border-gray-200 p-6 overflow-auto max-h-[600px]">
           <h2 className="text-xl font-bold text-gray-900 mb-4">Deduplication Results</h2>
           {results.length === 0 ? (
             <div className="h-full flex items-center justify-center text-gray-400">결과가 없습니다.</div>
           ) : (
             <div className="space-y-4">
               {results.map((res, i) => (
                 <div key={i} className={`p-4 rounded-xl border ${res.status === 'auto' ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
                   <div className="flex justify-between items-center mb-3">
                     <span className="font-bold text-gray-900">
                       Match Pair: {res.record_a_id} ↔ {res.record_b_id}
                     </span>
                     {res.status === 'auto' ? 
                        <span className="flex items-center gap-1 text-green-700 text-sm font-bold bg-green-100 px-2 py-1 rounded"><CheckCircle size={16}/> Auto Merge</span> :
                        <span className="flex items-center gap-1 text-yellow-700 text-sm font-bold bg-yellow-100 px-2 py-1 rounded"><AlertTriangle size={16}/> Review Needed</span>
                     }
                   </div>
                   <div className="space-y-2 text-sm">
                     <div className="flex justify-between text-gray-600">
                       <span>Confidence Score</span>
                       <span className="font-mono font-bold">{res.confidence_score.toFixed(4)}</span>
                     </div>
                     <div className="pt-2 border-t border-gray-200/50">
                       <p className="font-semibold text-gray-700 mb-1">Explainability Evidence:</p>
                       <ul className="list-disc list-inside text-gray-600 font-mono text-xs space-y-1">
                         {res.evidence.map((ev: string, idx: number) => (
                           <li key={idx}>{ev}</li>
                         ))}
                       </ul>
                     </div>
                   </div>
                 </div>
               ))}
             </div>
           )}
        </div>
      </div>
    </div>
  );
}
