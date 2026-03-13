import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { Search, Layers, FileCheck, FileText, Database } from 'lucide-react';

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen w-full bg-gray-50 text-gray-900 font-sans">
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-xl font-bold text-tkm-dark flex items-center gap-2">
            <Layers className="text-tkm-main" />
            TKM-SR Pro
          </h1>
          <p className="text-xs text-gray-500 mt-1">AI-based SR Platform</p>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <NavLink to="/" className={({isActive}: {isActive: boolean}) => `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive ? 'bg-tkm-light text-tkm-main font-medium' : 'text-gray-600 hover:bg-gray-100'}`}>
            <Search size={20} /> 실시간 통합 검색
          </NavLink>
          <NavLink to="/dedup" className={({isActive}: {isActive: boolean}) => `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive ? 'bg-tkm-light text-tkm-main font-medium' : 'text-gray-600 hover:bg-gray-100'}`}>
            <Layers size={20} /> 중복 문헌 검토
          </NavLink>
          <NavLink to="/screening-rct" className={({isActive}: {isActive: boolean}) => `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive ? 'bg-tkm-light text-tkm-main font-medium' : 'text-gray-600 hover:bg-gray-100'}`}>
            <FileCheck size={20} /> RCT 자동 선별
          </NavLink>
          <NavLink to="/screening-fulltext" className={({isActive}: {isActive: boolean}) => `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive ? 'bg-tkm-light text-tkm-main font-medium' : 'text-gray-600 hover:bg-gray-100'}`}>
            <FileText size={20} /> 원문 분석 선별
          </NavLink>
          <NavLink to="/extraction" className={({isActive}: {isActive: boolean}) => `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive ? 'bg-tkm-light text-tkm-main font-medium' : 'text-gray-600 hover:bg-gray-100'}`}>
            <Database size={20} /> 핵심 정보 추출
          </NavLink>
        </nav>
      </aside>
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
