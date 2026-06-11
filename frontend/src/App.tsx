import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import Capabilities from './pages/Capabilities';
import Operations from './pages/Operations';
import Contact from './pages/Contact';
import Platform from './pages/Platform';
import Process from './pages/Process';
import SystemStatus from './pages/SystemStatus';
import GlobalAnalytics from './pages/GlobalAnalytics';
import SupplyHub from './pages/SupplyHub';
import OperatorCenter from './pages/OperatorCenter';
import { AICopilot } from './components/AICopilot';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/capabilities" element={<Capabilities />} />
        <Route path="/operations" element={<Operations />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/platform" element={<Platform />} />
        <Route path="/process" element={<Process />} />
        <Route path="/system-status" element={<SystemStatus />} />
        <Route path="/analytics" element={<GlobalAnalytics />} />
        <Route path="/supply-hub" element={<SupplyHub />} />
        <Route path="/operator" element={<OperatorCenter />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <AICopilot />
    </Router>
  );
}
