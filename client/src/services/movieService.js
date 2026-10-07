import api from './api';

export const fetchMovies   = (params) => api.get('/movies', { params });
export const fetchMovie    = (id)     => api.get(`/movies/${id}`);
export const fetchFilters  = ()       => api.get('/movies/meta/filters');

export const addToWatchlist      = (movieId) => api.post(`/watchlist/${movieId}`);
export const removeFromWatchlist = (movieId) => api.delete(`/watchlist/${movieId}`);
export const fetchWatchlist      = (params)  => api.get('/watchlist', { params });
