
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Cadastro from './pages/Cadastro';
import Busca from './pages/Busca';
import PFNRDashboard from './pages/PFNRDashboard';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"            element={<Dashboard />} />
        <Route path="/cadastro"    element={<Cadastro />} />
        <Route path="/busca"       element={<Busca />} />
        <Route path="/pfnr"        element={<PFNRDashboard />} />
        {/* fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
