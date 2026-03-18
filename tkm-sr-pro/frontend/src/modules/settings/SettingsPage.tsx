import { useState } from 'react';
import { Settings, Key, Shield, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useSettingsStore } from '../../store/useSettingsStore';

export default function SettingsPage() {
  const { openAiApiKey, setOpenAiApiKey, searchLimit, setSearchLimit } = useSettingsStore();
  const [keyInput, setKeyInput] = useState(openAiApiKey);
  const [limitInput, setLimitInput] = useState(searchLimit);
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = () => {
    setOpenAiApiKey(keyInput);
    setSearchLimit(limitInput);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
          <Settings className="text-tkm-main" size={32} />
          시스템 설정
        </h1>
        <p className="mt-2 text-gray-500 text-lg">
          AI 분석 및 외부 연동을 위한 설정을 관리합니다.
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden divide-y divide-gray-100">
        {/* API Key Setting */}
        <div className="p-8 space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <Key className="text-tkm-main" size={24} />
            <h3 className="text-lg font-bold text-gray-800">
              OpenAI API 설정 (GPT-4 강화 추출용)
            </h3>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-gray-700">OpenAI API Key</label>
              <span className="flex items-center gap-1 text-[10px] font-bold text-orange-500 bg-orange-50 px-2 py-0.5 rounded uppercase tracking-wider">
                <Shield size={10} /> Session Only
              </span>
            </div>
            
            <input
              type="password"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              placeholder="sk-..."
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-tkm-main outline-none transition-all font-mono text-sm shadow-sm"
            />
          </div>
        </div>

        {/* Search Limit Setting */}
        <div className="p-8 space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <AlertCircle className="text-tkm-main" size={24} />
            <h3 className="text-lg font-bold text-gray-800">
              검색 엔진 설정
            </h3>
          </div>

          <div className="space-y-4">
            <label className="text-sm font-bold text-gray-700">최대 검색 결과 한도 (Max Results)</label>
            <div className="flex items-center gap-4">
              <input
                type="number"
                value={limitInput}
                onChange={(e) => setLimitInput(Number(e.target.value))}
                min={1}
                max={5000}
                className="w-32 px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-tkm-main outline-none transition-all shadow-sm font-bold text-center"
              />
              <p className="text-sm text-gray-500">
                각 데이터베이스별로 검색할 최대 건수를 지정합니다. (기본 200건, 최대 5000건 권장)
              </p>
            </div>
          </div>
        </div>

        {/* Save Action */}
        <div className="p-8 bg-gray-50 flex justify-between items-center">
          <div className="flex items-center gap-2 text-xs text-blue-700 leading-relaxed max-w-md">
            <AlertCircle size={16} className="shrink-0" />
            API 키는 현재 세션에만 유지되며, 검색 한도는 브라우저에 저장됩니다.
          </div>
          <button
            onClick={handleSave}
            className={`flex items-center gap-2 px-8 py-3 rounded-xl font-bold transition-all shadow-lg ${
              isSaved 
              ? 'bg-green-600 text-white shadow-green-100' 
              : 'bg-tkm-main text-white hover:bg-tkm-dark shadow-tkm-light'
            }`}
          >
            {isSaved ? (
              <>
                <CheckCircle2 size={18} /> 설정 저장됨
              </>
            ) : (
              '설정 적용하기'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
