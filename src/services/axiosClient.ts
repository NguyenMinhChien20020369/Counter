import axios from 'axios';

const ACCESS_TOKEN_KEY = 'counter.accessToken';
const TOKEN_TYPE_KEY = 'counter.tokenType';

const api = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const accessToken = sessionStorage.getItem(ACCESS_TOKEN_KEY);
  const tokenType = sessionStorage.getItem(TOKEN_TYPE_KEY) || 'Bearer';

  if (accessToken) {
    config.headers.set('Authorization', `${tokenType} ${accessToken}`);
  }

  return config;
});

export const saveAuthToken = (accessToken: string, tokenType: string) => {
  sessionStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  sessionStorage.setItem(TOKEN_TYPE_KEY, tokenType);
};

export const clearAuthToken = () => {
  sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_TYPE_KEY);
};

export const hasAuthToken = () => Boolean(sessionStorage.getItem(ACCESS_TOKEN_KEY));

export default api;
