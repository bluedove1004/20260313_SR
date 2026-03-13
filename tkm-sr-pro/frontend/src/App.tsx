import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import SearchPage from './modules/search/SearchPage';
import DedupPage from './modules/dedup/DedupPage';
import RctScreeningPage from './modules/screening_rct/RctScreeningPage';
import DashboardPage from './modules/dashboard/DashboardPage';
import ExtractionPage from './modules/extraction/ExtractionPage';

function MockPage({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-center h-full text-2xl font-bold text-gray-400">
      {title} 모듈 개발 예정
    </div>
  );
}

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/dedup" element={<DedupPage />} />
          <Route path="/screening-rct" element={<RctScreeningPage />} />
          <Route path="/screening-fulltext" element={<MockPage title="본문 데이터 기반 RCT 선별 보조" />} />
          <Route path="/extraction" element={<ExtractionPage />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
