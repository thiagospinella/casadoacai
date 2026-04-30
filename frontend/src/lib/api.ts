import axios from 'axios';

// Cliente HTTP da Casa do Açaí
// Em dev, /api é proxado para http://localhost:3001 pelo vite.config.ts
// Em prod, defina VITE_API_URL com a URL completa da API
const baseURL = import.meta.env.VITE_API_URL ?? '/api';

export const api = axios.create({
  baseURL,
  withCredentials: true,
});

// Anexa JWT do localStorage automaticamente
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('casa_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
