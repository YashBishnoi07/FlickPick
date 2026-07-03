import React, { useContext, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import LoadingScreen from './components/LoadingScreen';
import BottomNav from './components/BottomNav';

const Landing = lazy(() => import('./components/Landing'));
const RoomSetup = lazy(() => import('./components/RoomSetup'));
const RoomCoordinator = lazy(() => import('./components/RoomCoordinator'));
const Auth = lazy(() => import('./components/Auth'));
const MatchesTab = lazy(() => import('./components/MatchesTab'));
const ChatTab = lazy(() => import('./components/ChatTab'));
const ProfileTab = lazy(() => import('./components/ProfileTab'));

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useContext(AuthContext);
  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/auth" />;
  return children;
};

function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <Router>
          <Suspense fallback={<LoadingScreen />}>
            <Routes>
              <Route path="/" element={<ProtectedRoute><Landing /></ProtectedRoute>} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/setup" element={<ProtectedRoute><RoomSetup /></ProtectedRoute>} />
              <Route path="/room/:roomId" element={<ProtectedRoute><RoomCoordinator /></ProtectedRoute>} />
              <Route path="/matches" element={<ProtectedRoute><MatchesTab /></ProtectedRoute>} />
              <Route path="/chat" element={<ProtectedRoute><ChatTab /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><ProfileTab /></ProtectedRoute>} />
            </Routes>
          </Suspense>
          <BottomNav />
        </Router>
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;
