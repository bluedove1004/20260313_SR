import { useState, useEffect } from 'react';
import { BarChart3, Users, FileText, CheckCircle2, ChevronRight, PieChart, Activity } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { apiClient } from '../../api/client';

export default function DashboardPage() {
  const [stats, setStats] = useState({
    totalSearched: 0,
    deduplicated: 0,
    rctFiltered: 0,
    extracted: 0
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await apiClient.get('/search/dashboard_stats/');
        setStats(response.data);
      } catch (error) {
        console.error("Failed to fetch dashboard stats", error);
      }
    };
    fetchStats();
  }, []);

  const calculatePercentage = (value: number, total: number) => {
    return total === 0 ? 0 : Math.round((value / total) * 100);
  };

  const recentActivities = [
    { id: 1, action: "Deduplication Completed", source: "PubMed, CNKI, Cochrane", count: 832, time: "2 hours ago" },
    { id: 2, action: "RCT Screening Batch #4", source: "AI Auto-predicted", count: 120, time: "5 hours ago" },
    { id: 3, action: "PICO Extraction Updated", source: "User 'Dr. Kim'", count: 12, time: "1 day ago" },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
            <PieChart className="text-tkm-main" size={32} />
            Project Overview
          </h1>
          <p className="mt-2 text-gray-500 text-lg">
            '아토피 피부염 무작위 대조군 연구' 체계적 문헌고찰 프로젝트 파이프라인 진행 상태
          </p>
        </div>
        <button className="px-5 py-2.5 bg-white border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 shadow-sm">
          Export PRISMA Diagram (SVG)
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Searched */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">1. Integrated Search</h3>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><BarChart3 size={20} /></div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-black text-gray-900">{stats.totalSearched.toLocaleString()}</div>
            <p className="text-sm text-gray-500 mt-1 font-medium">Raw records from 6 DBs</p>
          </div>
        </div>

        {/* Deduplicated */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">2. Unique Records</h3>
            <div className="p-2 bg-yellow-50 text-yellow-600 rounded-lg"><Users size={20} /></div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-black text-gray-900">{stats.deduplicated.toLocaleString()}</div>
            <p className="text-sm text-gray-500 mt-1 font-medium flex items-center gap-1">
               <span className="text-green-600 font-bold">-{calculatePercentage(stats.totalSearched - stats.deduplicated, stats.totalSearched)}%</span> via AI Deduplication
            </p>
          </div>
        </div>

        {/* RCT Filtered */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">3. RCT Classified</h3>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><FileText size={20} /></div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-black text-gray-900">{stats.rctFiltered.toLocaleString()}</div>
            <p className="text-sm text-gray-500 mt-1 font-medium flex items-center gap-1">
               <span className="text-green-600 font-bold">-{calculatePercentage(stats.deduplicated - stats.rctFiltered, stats.deduplicated)}%</span> Non-RCT Excluded
            </p>
          </div>
        </div>

        {/* Extracted */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-tkm-main ring-1 ring-tkm-main flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-tkm-main opacity-5 rounded-bl-full -mr-8 -mt-8"></div>
          <div className="flex items-center justify-between relative z-10">
            <h3 className="text-sm font-bold text-tkm-main uppercase tracking-wider">4. PICO Extracted</h3>
            <div className="p-2 bg-tkm-main text-white rounded-lg"><CheckCircle2 size={20} /></div>
          </div>
          <div className="mt-4 relative z-10">
            <div className="text-3xl font-black text-gray-900">{stats.extracted.toLocaleString()}</div>
            <p className="text-sm text-tkm-main mt-1 font-bold">Ready for Meta-Analysis</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Quick Actions / Pipeline Flow */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-6 border-b pb-4">Pipeline Status & Quick Actions</h2>
          <div className="space-y-4">
            
            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:border-tkm-main transition-colors group">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">1</div>
                <div>
                  <h4 className="font-bold text-gray-900">Search Databases</h4>
                  <p className="text-sm text-gray-500">Run federated search across multiple registries</p>
                </div>
              </div>
              <NavLink to="/search" className="flex items-center gap-1 text-sm font-bold text-tkm-main opacity-0 group-hover:opacity-100 transition-opacity">
                Go to Module <ChevronRight size={16} />
              </NavLink>
            </div>
            
            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:border-tkm-main transition-colors group">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-yellow-100 text-yellow-600 flex items-center justify-center font-bold">2</div>
                <div>
                  <h4 className="font-bold text-gray-900">Review Deduplication Queue</h4>
                  <p className="text-sm text-gray-500">240 records require human review</p>
                </div>
              </div>
              <NavLink to="/dedup" className="flex items-center gap-1 text-sm font-bold text-tkm-main opacity-0 group-hover:opacity-100 transition-opacity">
                Go to Module <ChevronRight size={16} />
              </NavLink>
            </div>

            <div className="flex items-center justify-between p-4 border border-tkm-light bg-tkm-light/30 rounded-xl hover:border-tkm-main transition-colors group">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-bold animate-pulse">3</div>
                <div>
                  <h4 className="font-bold text-gray-900">Pending RCT Screening</h4>
                  <p className="text-sm text-gray-500">AI has classified 120 new records to screen</p>
                </div>
              </div>
              <NavLink to="/screening-rct" className="flex items-center gap-1 text-sm font-bold text-tkm-main">
                Review Now <ChevronRight size={16} />
              </NavLink>
            </div>
            
          </div>
        </div>

        {/* Activity Log */}
        <div className="bg-gray-50 rounded-2xl border border-gray-200 p-6">
           <h2 className="text-lg font-bold text-gray-900 mb-6">Recent Activities</h2>
           <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-300 before:to-transparent">
             {recentActivities.map((act) => (
               <div key={act.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                 <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-gray-200 text-gray-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                   <Activity size={16} />
                 </div>
                 <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl shadow-sm bg-white border border-gray-100">
                   <div className="flex items-center justify-between mb-1">
                     <div className="font-bold text-gray-900 text-sm">{act.action}</div>
                     <time className="text-xs font-medium text-gray-500">{act.time}</time>
                   </div>
                   <div className="text-xs text-gray-600">
                     {act.source} • <span className="font-medium text-tkm-main">{act.count} items</span>
                   </div>
                 </div>
               </div>
             ))}
           </div>
        </div>
      </div>
    </div>
  );
}
