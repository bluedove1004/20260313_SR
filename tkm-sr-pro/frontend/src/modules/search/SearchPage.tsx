import { useState } from 'react';
import { useSearchStore } from '../../store/useSearchStore';
import { Search, Loader2 } from 'lucide-react';
import { apiClient } from '../../api/client';

const DB_OPTIONS = [
  { id: 'PubMed', label: 'PubMed', color: 'bg-blue-100 text-blue-800' },
  { id: 'Embase', label: 'Embase', color: 'bg-orange-100 text-orange-800' },
  { id: 'Cochrane', label: 'Cochrane Library', color: 'bg-purple-100 text-purple-800' },
  { id: 'KMbase', label: 'KMbase (한국의학)', color: 'bg-green-100 text-green-800' },
  { id: 'RISS', label: 'RISS (학술연구)', color: 'bg-indigo-100 text-indigo-800' },
  { id: 'CNKI', label: 'CNKI (중국학술)', color: 'bg-red-100 text-red-800' },
];

export default function SearchPage() {
  const { query, setQuery, selectedDBs, toggleDB } = useSearchStore();
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<any[]>([]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query || selectedDBs.length === 0) return;

    setIsSearching(true);
    try {
      const response = await apiClient.post('/search/federated_search/', {
        query,
        dbs: selectedDBs,
      });
      setResults(response.data.results || []);
    } catch (error) {
      console.error('Search error:', error);
      alert('검색 중 오류가 발생했습니다.');
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Federated Search</h1>
        <p className="mt-2 text-gray-500 text-lg">
          다중 원천 데이터베이스를 동시에 검색하고 한의학 시소러스를 활용해 쿼리를 자동 확장합니다.
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <form onSubmit={handleSearch} className="space-y-6">
          <div className="space-y-4">
            <label className="block text-sm font-semibold text-gray-700">대상 데이터베이스 선택</label>
            <div className="flex flex-wrap gap-3">
              {DB_OPTIONS.map(db => {
                const isSelected = selectedDBs.includes(db.id);
                return (
                  <button
                    key={db.id}
                    type="button"
                    onClick={() => toggleDB(db.id)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      isSelected 
                        ? 'bg-tkm-main text-white ring-2 ring-tkm-main ring-offset-2' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {db.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-4">
            <label className="block text-sm font-semibold text-gray-700">검색 쿼리 (PICO 형식 권장)</label>
            <div className="relative">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="예: atopic dermatitis AND acupuncture"
                className="w-full pl-5 pr-16 py-4 text-lg border border-gray-300 rounded-xl focus:ring-4 focus:ring-tkm-light focus:border-tkm-main transition-shadow outline-none"
              />
              <button
                type="submit"
                disabled={isSearching}
                className="absolute right-2 top-2 bottom-2 px-6 bg-tkm-main hover:bg-tkm-dark text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center min-w-[100px]"
              >
                {isSearching ? <Loader2 className="animate-spin" size={20} /> : <Search size={20} />}
              </button>
            </div>
            {query && (
              <div className="text-sm text-green-700 bg-green-50 p-3 rounded-lg flex items-start gap-2 border border-green-100">
                <span className="font-semibold whitespace-nowrap">✨ 시소러스 확장:</span>
                <span className="break-all font-mono text-xs">
                  ("atopic dermatitis"[MeSH] OR "eczema" OR "초기 태열" OR "아토피 피부염") AND ("acupuncture"[MeSH] OR "electroacupuncture" OR "침술" OR "경혈")
                </span>
              </div>
            )}
          </div>
        </form>
      </div>

      {/* Results Section */}
      {results.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">검색 결과 ({results.length}건)</h2>
            <button className="text-sm text-tkm-main font-semibold hover:underline bg-tkm-light px-4 py-2 rounded-lg">
              결과 인덱싱 스토리지에 저장
            </button>
          </div>
          <div className="space-y-4">
            {results.map(item => {
              const dbOption = DB_OPTIONS.find(db => db.id === item.source);
              return (
                <div key={item.id} className="bg-white p-6 rounded-xl border border-gray-200 hover:shadow-md transition-shadow group">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${dbOption?.color || 'bg-gray-100'}`}>
                          {item.source}
                        </span>
                        <span className="text-xs text-gray-500 font-medium">{item.year}</span>
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 group-hover:text-tkm-main transition-colors">
                        {item.title}
                      </h3>
                      <p className="text-sm text-gray-600 font-medium">{item.authors}</p>
                      <p className="text-sm text-gray-500 mt-2 line-clamp-2 leading-relaxed">{item.abstract}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
