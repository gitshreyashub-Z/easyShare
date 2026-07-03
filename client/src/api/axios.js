import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api'||import.meta.env.VITE_API_URL,
});

api.interceptors.request.use((config) => {
  const user = JSON.parse(localStorage.getItem('pasteboxUser') || 'null');
  if (user?.token) config.headers.Authorization = `Bearer ${user.token}`;
  return config;
});

export default api;