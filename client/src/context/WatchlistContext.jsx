import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { addToWatchlist, fetchWatchlist, removeFromWatchlist } from '../services/movieService';
import { useAuth } from './AuthContext';

const WatchlistContext = createContext(null);

export function WatchlistProvider({ children }) {
  const { user } = useAuth();
  // savedIds: Set of movie _id strings the user has saved
  const [savedIds, setSavedIds] = useState(new Set());

  useEffect(() => {
    if (!user) { setSavedIds(new Set()); return; }
    fetchWatchlist()
      .then((r) => setSavedIds(new Set(r.data.savedIds ?? [])))
      .catch(() => {});
  }, [user]);

  const add = useCallback(async (movieId) => {
    // Optimistic
    setSavedIds((prev) => new Set([...prev, movieId]));
    try {
      await addToWatchlist(movieId);
    } catch {
      setSavedIds((prev) => { const n = new Set(prev); n.delete(movieId); return n; });
    }
  }, []);

  const remove = useCallback(async (movieId) => {
    // Optimistic
    setSavedIds((prev) => { const n = new Set(prev); n.delete(movieId); return n; });
    try {
      await removeFromWatchlist(movieId);
    } catch {
      setSavedIds((prev) => new Set([...prev, movieId]));
    }
  }, []);

  const toggle = useCallback((movieId) => {
    savedIds.has(movieId) ? remove(movieId) : add(movieId);
  }, [savedIds, add, remove]);

  return (
    <WatchlistContext.Provider value={{ savedIds, toggle }}>
      {children}
    </WatchlistContext.Provider>
  );
}

export const useWatchlist = () => useContext(WatchlistContext);
