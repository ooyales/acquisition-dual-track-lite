import { Routes, Route } from 'react-router-dom';
import AppShell from './components/layout/AppShell';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import GuidedIntakePage from './pages/GuidedIntakePage';
import RequestListPage from './pages/RequestListPage';
import RequestDetailPage from './pages/RequestDetailPage';
import ApprovalQueuePage from './pages/ApprovalQueuePage';
import AdvisoryQueuePage from './pages/AdvisoryQueuePage';
import CLINBuilderPage from './pages/CLINBuilderPage';
import LOAPage from './pages/LOAPage';
import ForecastPage from './pages/ForecastPage';
import ExecutionListPage from './pages/ExecutionListPage';
import ExecutionCreatePage from './pages/ExecutionCreatePage';
import ExecutionDetailPage from './pages/ExecutionDetailPage';
import AIAssistantPage from './pages/AIAssistantPage';
import PipelineDashboardPage from './pages/PipelineDashboardPage';
import AdminConfigPage from './pages/AdminConfigPage';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<AppShell />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/intake" element={<GuidedIntakePage />} />
        <Route path="/requests" element={<RequestListPage />} />
        <Route path="/requests/:id" element={<RequestDetailPage />} />
        <Route path="/requests/:id/clins" element={<CLINBuilderPage />} />
        <Route path="/approvals" element={<ApprovalQueuePage />} />
        <Route path="/advisory" element={<AdvisoryQueuePage />} />
        <Route path="/loa" element={<LOAPage />} />
        <Route path="/forecasts" element={<ForecastPage />} />
        <Route path="/execution" element={<ExecutionListPage />} />
        <Route path="/execution/new" element={<ExecutionCreatePage />} />
        <Route path="/execution/:id" element={<ExecutionDetailPage />} />
        <Route path="/ai" element={<AIAssistantPage />} />
        <Route path="/pipeline" element={<PipelineDashboardPage />} />
        <Route path="/admin" element={<AdminConfigPage />} />
      </Route>
    </Routes>
  );
}
