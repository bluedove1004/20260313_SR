import { useState } from 'react';
import { Settings, Key, Shield, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useSettingsStore } from '../../store/useSettingsStore';

export default function SettingsPage() {
  const { openAiApiKey, setOpenAiApiKey } = useSettingsStore();
  const [keyInput, setKeyInput] = useState(openAiApiKey);
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = () => {
    setOpenAiApiKey(keyInput);
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

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-8 border-b border-gray-100 bg-gray-50/50">
          <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <Key className="text-tkm-main" size={20} />
            OpenAI API 설정 (GPT-4 강화 추출용)
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            PICO 추출 성공률을 높이기 위해 ChatGPT(GPT-4o) 모델을 활용한 강화 추출 기능을 사용할 수 있습니다.
          </p>
        </div>

        <div className="p-8 space-y-6">
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
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-tkm-main outline-none transition-all font-mono text-sm"
            />
            
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-3">
              <AlertCircle className="text-blue-500 shrink-0" size={20} />
              <div className="text-xs text-blue-700 leading-relaxed">
                <p className="font-bold mb-1">보안 안내</p>
                입력하신 API Key는 서버 DB에 저장되지 않으며, 현재 브라우저 탭의 메모리에만 유지됩니다. 브라우저를 닫거나 새로고침(또는 세션 종료) 시 삭제되므로 안심하고 사용하셔도 됩니다.
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4">
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
    </div>
  );
}
