import React, { useState } from 'react';
import { Search, Sparkles, Loader2, Save } from 'lucide-react';
import { useSearchStore } from '../../store/useSearchStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useProjectStore } from '../../store/useProjectStore';
import { apiClient } from '../../api/client';

const DB_OPTIONS = [
  { id: 'pubmed', label: 'PubMed' },
  { id: 'scienceon', label: 'ScienceON' },
  { id: 'riss', label: 'RISS' },
  { id: 'cini', label: 'CiNii' },
  { id: 'oasis', label: 'OASIS' },
];

const CATEGORIES = ['전체', '한약', '일반침', '전침', '봉약침', '뜸', '추나', '부항', '매선'];

const SearchPage: React.FC = () => {
  const { selectedDBs, toggleDB } = useSearchStore();
  const { openAiApiKey, searchLimit } = useSettingsStore();
  const [isSearching, setIsSearching] = useState(false);
  const [isExpanding, setIsExpanding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  
  const [diseaseInput, setDiseaseInput] = useState<string>('');
  const [formulaInput, setFormulaInput] = useState<string>('');
  const [includeRct, setIncludeRct] = useState<boolean>(true);
  const [expandedQuery, setExpandedQuery] = useState<string>('');
  const [category, setCategory] = useState<string>('전체');
  const { currentProjectId } = useProjectStore();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!diseaseInput && !formulaInput && !expandedQuery) || selectedDBs.length === 0) return;

    setIsSearching(true);
    try {
      const response = await apiClient.post('/search/federated_search/', {
        query: `${diseaseInput} ${formulaInput}`.trim(),
        disease: diseaseInput,
        formula: formulaInput,
        category,
        include_rct: includeRct,
        exact_query: expandedQuery,
        api_key: openAiApiKey,
        dbs: selectedDBs,
        max_results: searchLimit,
      });
      setResults(response.data.results || []);
      if (!expandedQuery && response.data.expanded_query) {
        setExpandedQuery(response.data.expanded_query);
      }
    } catch (error) {
      console.error('Search error:', error);
      alert('검색 중 오류가 발생했습니다.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleExpand = async () => {
    if (!diseaseInput && !formulaInput) return;
    setIsExpanding(true);
    try {
      const response = await apiClient.post('/search/expand_query/', {
        disease: diseaseInput,
        formula: formulaInput,
        category,
        include_rct: includeRct,
        api_key: openAiApiKey,
      });
      setExpandedQuery(response.data.expanded_query || '');
    } catch (error) {
      console.error('Expand error:', error);
      alert('쿼리 확장 중 오류가 발생했습니다.');
    } finally {
      setIsExpanding(false);
    }
  };

  const handleSave = async () => {
    if (results.length === 0) return;
    setIsSaving(true);
    try {
      const payload = results.map(r => ({ ...r, _project_id: currentProjectId }));
      const response = await apiClient.post('/search/save_records/', payload);
      const savedCount = response.data.saved_count || 0;
      const skipped = response.data.skipped || 0;
      alert(`총 ${savedCount}건 저장 완료!${skipped > 0 ? ` (중복 제외 ${skipped}건)` : ''}`);
    } catch (error) {
      console.error('Save error:', error);
      alert('저장 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 text-gray-900">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Federated Search</h1>
        <p className="mt-2 text-gray-500 text-lg font-medium">
          다중 원천 데이터베이스를 동시에 검색하고 한의학 시소러스를 활용해 쿼리를 자동 확장합니다.
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <form onSubmit={handleSearch} className="space-y-6">
          <div className="space-y-4">
            <label className="block text-sm font-semibold">대상 데이터베이스 선택</label>
            <div className="flex flex-wrap gap-3">
              {DB_OPTIONS.map(db => {
                const isSelected = selectedDBs.includes(db.id) || selectedDBs.includes(db.label);
                return (
                  <button
                    key={db.id}
                    type="button"
                    onClick={() => toggleDB(db.id)}
                    className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${
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
            <label className="block text-sm font-semibold">TKM 연구 분류 선택 (C)</label>
            <div className="flex flex-wrap gap-3">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${
                    category === cat 
                      ? 'bg-purple-600 text-white ring-2 ring-purple-600 ring-offset-2' 
                      : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <label className="block text-sm font-semibold text-gray-700">A. 대상 질환 (Population)</label>
              <input
                type="text"
                value={diseaseInput}
                onChange={(e) => setDiseaseInput(e.target.value)}
                placeholder="예: 'premenstrual syndrome' pms"
                className="w-full px-5 py-5 border border-gray-300 rounded-xl focus:ring-4 focus:ring-purple-200 focus:border-purple-600 outline-none text-lg"
              />
              <p className="text-[11px] text-gray-400 font-medium">* 공백으로 구분하며 '...'로 묶을 수 있습니다.</p>
            </div>
            
            <div className="space-y-4">
              <label className="block text-sm font-semibold text-gray-700">B. 처방명/중재 (Intervention)</label>
              <input
                type="text"
                value={formulaInput}
                onChange={(e) => setFormulaInput(e.target.value)}
                placeholder="예: 소요산"
                className="w-full px-5 py-5 border border-gray-300 rounded-xl focus:ring-4 focus:ring-purple-200 focus:border-purple-600 outline-none text-lg"
              />
              <p className="text-[11px] text-gray-400 font-medium">* 구성 본초와 다국어 명칭으로 자동 확장됩니다.</p>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeRct}
                  onChange={(e) => setIncludeRct(e.target.checked)}
                  className="w-5 h-5 accent-tkm-main"
                />
                <span className="text-sm font-bold text-gray-700">D. RCT 필터 필수 적용</span>
              </label>
            </div>
            
            <button
              type="button"
              onClick={handleExpand}
              disabled={isExpanding || (!diseaseInput && !formulaInput)}
              className="px-8 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-extrabold transition-all disabled:opacity-50 flex items-center shadow-lg"
            >
              {isExpanding ? <Loader2 className="animate-spin mr-2" size={18} /> : <Sparkles className="mr-2" size={18} />}
              AI 자동 확장 (A AND (B OR C) AND D)
            </button>
          </div>
            
          <label className="block text-sm font-semibold text-gray-700 mt-6 font-bold">최종 완성 쿼리 (직접 수정 가능)</label>
          <textarea
            value={expandedQuery}
            onChange={(e) => setExpandedQuery(e.target.value)}
            placeholder="AI 버튼을 눌러 확장을 수행하세요."
            rows={5}
            className="w-full px-5 py-4 font-mono text-sm border border-gray-300 rounded-xl focus:ring-4 focus:ring-tkm-light focus:border-tkm-main transition-shadow outline-none resize-none bg-black text-green-400"
          />
            
            <button
              type="submit"
              disabled={isSearching || (!diseaseInput && !formulaInput && !expandedQuery)}
              className="w-full py-5 mt-2 bg-tkm-main hover:bg-tkm-primary text-white rounded-xl font-bold text-xl shadow-xl transition-all disabled:opacity-50 flex items-center justify-center translate-y-0 active:translate-y-1"
            >
              {isSearching ? <Loader2 className="animate-spin mr-2" size={24} /> : <Search className="mr-2" size={24} />}
              {isSearching ? '발굴 중...' : '최종 완성 쿼리로 통합 검색 수행'}
            </button>
        </form>
      </div>

      {results.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">검색 결과 ({results.length}건)</h2>
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold transition-all shadow-md flex items-center"
            >
              <Save className="mr-2" size={18} />
              {isSaving ? '저장 중...' : '결과 저장'}
            </button>
          </div>
          <div className="grid grid-cols-1 gap-4">
            {results.map((item, idx) => (
              <div key={idx} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex gap-2">
                    <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded font-bold uppercase">{item.source}</span>
                    <span className="text-[10px] bg-purple-50 text-purple-600 px-2 py-0.5 rounded font-bold">{item.year || 'No Year'}</span>
                  </div>
                </div>
                <h3 className="text-lg font-bold mb-2 leading-tight">
                  <a href={item.url} target="_blank" rel="noopener noreferrer" className="hover:text-tkm-main transition-colors">
                    {item.title}
                  </a>
                </h3>
                <p className="text-sm text-gray-500 line-clamp-2 italic mb-3">{item.authors}</p>
                {item.abstract && (
                   <p className="text-xs text-gray-600 line-clamp-3 bg-gray-50 p-4 rounded-xl border border-dashed border-gray-200">
                    {item.abstract}
                   </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchPage;
