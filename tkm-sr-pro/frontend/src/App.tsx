import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import SearchPage from './modules/search/SearchPage';
import DedupPage from './modules/dedup/DedupPage';
import RctScreeningPage from './modules/screening_rct/RctScreeningPage';
import DashboardPage from './modules/dashboard/DashboardPage';
import ExtractionPage from './modules/extraction/ExtractionPage';
import FulltextScreeningPage from './modules/screening_fulltext/FulltextScreeningPage';
import ProjectsPage from './modules/projects/ProjectsPage';
import RobAssessmentPage from './modules/rob_assessment/RobAssessmentPage';
import SettingsPage from './modules/settings/SettingsPage';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/dedup" element={<DedupPage />} />
          <Route path="/screening-rct" element={<RctScreeningPage />} />
          <Route path="/screening-fulltext" element={<FulltextScreeningPage />} />
          <Route path="/extraction" element={<ExtractionPage />} />
          <Route path="/rob" element={<RobAssessmentPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
