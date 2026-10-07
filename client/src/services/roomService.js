import api from './api';

export const createRoom        = (mode)         => api.post('/rooms', { mode });
export const joinRoom          = (code)         => api.post('/rooms/join', { code });
export const getRoom           = (code)         => api.get(`/rooms/${code}`);
export const submitPreferences = (code, prefs)  => api.put(`/rooms/${code}/preferences`, prefs);
export const startVoting       = (code)         => api.post(`/rooms/${code}/start-voting`);
export const castVote          = (code, movieId)=> api.post(`/rooms/${code}/vote`, { movieId });
export const revealRoom        = (code)         => api.post(`/rooms/${code}/reveal`);
export const getRoomHistory    = ()             => api.get('/rooms/history');
