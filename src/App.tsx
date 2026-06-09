import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SessionsProvider } from './contexts/SessionsContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import NewSession from './pages/NewSession';
import LiveSession from './pages/LiveSession';
import Progress from './pages/Progress';
import Group from './pages/Group';
import type { ReactNode } from 'react';
import Loader from './components/Loader';

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="page loading"><Loader /></div>;
  if (!user) return <Navigate to="/login" />;
  return <>{children}</>;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SessionsProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/session/new" element={<ProtectedRoute><NewSession /></ProtectedRoute>} />
          <Route path="/session/:id" element={<ProtectedRoute><LiveSession /></ProtectedRoute>} />
          <Route path="/progress" element={<ProtectedRoute><Progress /></ProtectedRoute>} />
          <Route path="/group" element={<ProtectedRoute><Group /></ProtectedRoute>} />
        </Routes>
        </SessionsProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
