import axios from 'axios';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

if (!apiBaseUrl) {
  throw new Error('VITE_API_BASE_URL is not defined');
}

export const api = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

const PUBLIC_AUTH_PATHS = ['/login', '/forgot-password', '/activate', '/reset-password', '/verify-email-change'];

function isPublicAuthPath(pathname: string): boolean {
  return PUBLIC_AUTH_PATHS.some((path) => pathname.startsWith(path));
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      if (typeof window !== 'undefined' && !isPublicAuthPath(window.location.pathname)) {
        window.location.replace('/login');
      }
    }

    return Promise.reject(error);
  },
);
