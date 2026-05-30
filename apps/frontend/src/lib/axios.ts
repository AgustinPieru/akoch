import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api/v1`
  : import.meta.env.DEV
  ? '/api/v1'
  : 'https://devoted-vibrancy-production-57b3.up.railway.app/api/v1';

const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// Inyectar access token en cada request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let isRefreshing = false;
let authFailed = false; // una vez que el refresh falla, no volver a intentar
let failedQueue: { resolve: (t: string) => void; reject: (e: unknown) => void }[] = [];

function processQueue(error: unknown, token: string | null = null) {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token!)));
  failedQueue = [];
}

function redirectToLogin() {
  authFailed = true;
  localStorage.removeItem('access_token');
  localStorage.removeItem('user');
  if (!window.location.pathname.startsWith('/login')) {
    window.location.href = '/login';
  }
}

// Manejo de 401: intenta refresh token silencioso
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    // Si ya sabemos que el auth falló, rechazar inmediatamente sin reintentar
    if (authFailed) return Promise.reject(error);

    if (error.response?.status === 401 && !original._retry) {
      // No intentar refresh en el propio endpoint de refresh
      if (original.url?.includes('/auth/refresh')) {
        redirectToLogin();
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          original.headers.Authorization = `Bearer ${token}`;
          return api(original);
        });
      }

      original._retry = true;
      isRefreshing = true;

      try {
        const { data } = await axios.post(`${BASE_URL}/auth/refresh`, {}, { withCredentials: true });
        const newToken = data.accessToken;
        localStorage.setItem('access_token', newToken);
        processQueue(null, newToken);
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch (refreshError) {
        processQueue(refreshError, null);
        redirectToLogin();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
