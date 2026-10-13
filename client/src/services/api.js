import axios from 'axios';

export const TOKEN_KEY = 'hm_token';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api', timeout: 20000 });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Unwrap the response body and turn failures into Errors that carry the backend's own message.
api.interceptors.response.use(
  (res) => res.data,
  (error) => {
    const body = error.response?.data;
    const err = new Error(
      body?.message || (error.code === 'ECONNABORTED' ? 'The server took too long to respond' : error.request && !error.response ? 'Cannot reach the server. Check that the API is running' : 'Request failed')
    );
    err.status = error.response?.status;
    err.code = body?.code;
    err.details = body?.errors;
    if (err.status === 401 && localStorage.getItem(TOKEN_KEY) && !error.config.url.includes('/auth/login')) {
      window.dispatchEvent(new CustomEvent('auth:expired', { detail: err.message }));
    }
    return Promise.reject(err);
  }
);

export default api;
