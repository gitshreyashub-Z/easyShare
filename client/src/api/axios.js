import axios from 'axios';

const configuredApiUrl = import.meta.env.VITE_API_URL?.trim().replace(/\/+$/, '');
export const API_BASE_URL = configuredApiUrl || (
  import.meta.env.DEV ? 'http://localhost:5000/api' : '/api'
);
export const API_ORIGIN = API_BASE_URL.endsWith('/api')
  ? API_BASE_URL.slice(0, -'/api'.length)
  : API_BASE_URL;

export const getApiUrl = (path) => `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
export const getUploadUrl = (filename) => `${API_ORIGIN}/uploads/${encodeURIComponent(filename)}`;

const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const user = JSON.parse(localStorage.getItem('pasteboxUser') || 'null');
  if (user?.token) config.headers.Authorization = `Bearer ${user.token}`;
  return config;
});

export default api;
