import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { WatchlistProvider } from './context/WatchlistContext';
import { ToastProvider } from './context/ToastContext';
import ProtectedRoute from './components/ProtectedRoute';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProfilePage from './pages/ProfilePage';
import ExplorePage from './pages/ExplorePage';
import MovieDetailPage from './pages/MovieDetailPage';
import WatchlistPage from './pages/WatchlistPage';
import NotFoundPage from './pages/NotFoundPage';
import CreateRoomPage from './pages/CreateRoomPage';
import JoinRoomPage from './pages/JoinRoomPage';
import LobbyPage from './pages/LobbyPage';
import PreferencesPage from './pages/PreferencesPage';
import ShortlistPage from './pages/ShortlistPage';
import VotingPage from './pages/VotingPage';
import RevealPage from './pages/RevealPage';
import RoomHistoryPage from './pages/RoomHistoryPage';

export default function App() {
  return (
    <AuthProvider>
      <WatchlistProvider>
        <ToastProvider>
          <BrowserRouter>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/explore" element={<ExplorePage />} />
            <Route path="/movies/:id" element={<MovieDetailPage />} />
            <Route path="/watchlist"  element={<ProtectedRoute><WatchlistPage /></ProtectedRoute>} />
            <Route path="/profile"    element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
            <Route path="/rooms/create"  element={<ProtectedRoute><CreateRoomPage /></ProtectedRoute>} />
            <Route path="/rooms/join"    element={<ProtectedRoute><JoinRoomPage /></ProtectedRoute>} />
            <Route path="/rooms/history" element={<ProtectedRoute><RoomHistoryPage /></ProtectedRoute>} />
            <Route path="/rooms/:code"              element={<ProtectedRoute><LobbyPage /></ProtectedRoute>} />
            <Route path="/rooms/:code/preferences"  element={<ProtectedRoute><PreferencesPage /></ProtectedRoute>} />
            <Route path="/rooms/:code/shortlist"    element={<ProtectedRoute><ShortlistPage /></ProtectedRoute>} />
            <Route path="/rooms/:code/vote"         element={<ProtectedRoute><VotingPage /></ProtectedRoute>} />
            <Route path="/rooms/:code/reveal"       element={<ProtectedRoute><RevealPage /></ProtectedRoute>} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
          </BrowserRouter>
        </ToastProvider>
      </WatchlistProvider>
    </AuthProvider>
  );
}
