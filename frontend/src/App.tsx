import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import Capabilities from './pages/Capabilities';
import Operations from './pages/Operations';
import Contact from './pages/Contact';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/capabilities" element={<Capabilities />} />
        <Route path="/operations" element={<Operations />} />
        <Route path="/contact" element={<Contact />} />
      </Routes>
    </Router>
  );
}
