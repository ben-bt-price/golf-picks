import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import SetupPassword from './pages/SetupPassword';
import Dashboard from './pages/Dashboard';
import Draft from './pages/Draft';
import Standings from './pages/Standings';
import MyPicks from './pages/MyPicks';
import Admin from './pages/Admin';

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/setup" element={<SetupPassword />} />
        <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/draft/:majorId" element={<ProtectedRoute><Draft /></ProtectedRoute>} />
        <Route path="/standings" element={<ProtectedRoute><Standings /></ProtectedRoute>} />
        <Route path="/my-picks" element={<ProtectedRoute><MyPicks /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute adminOnly><Admin /></ProtectedRoute>} />
      </Routes>
    </AuthProvider>
  );
}
