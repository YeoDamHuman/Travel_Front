// utils/authAxios.js
import axios from 'axios';
import { API_BASE_URL } from '../api/config';
import useUserStore from '../store/userStore';

const BASE_URL = API_BASE_URL || '';

const authAxios = axios.create({
  baseURL: BASE_URL, // 절대경로 강제
  withCredentials: false,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// 👉 토큰이 필요 없는 엔드포인트 목록
const NO_AUTH_PATHS = [
  '/auth/kakao/login',
  '/auth/kakao/callback',
  '/user/login',
  '/user/register',
  '/user/refresh',
  '/user/password',
  '/mail/send',
  '/mail/verify',
  '/mail/check-email',
  '/board',
];

function isNoAuthURL(rawUrl) {
  try {
    const u = new URL(rawUrl, API_BASE_URL || 'http://localhost');
    const path = u.pathname.replace(/\/+$/, '');
    return NO_AUTH_PATHS.some((p) => {
      const pp = p.replace(/\/+$/, '');
      return path === pp || path.startsWith(pp + '/');
    });
  } catch {
    return false;
  }
}

// ---- helpers ----
const jwtRegex = /^[A-Za-z0-9\-_]+=*\.[A-Za-z0-9\-_]+=*\.[A-Za-z0-9\-_+=/]*$/;

function normalizeBearer(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const stripped = raw.replace(/^Bearer\s+/i, '').trim();
  if (!jwtRegex.test(stripped)) return null;
  return `Bearer ${stripped}`;
}

let refreshPromise = null;

authAxios.interceptors.request.use((config) => {
  try {
    const full = new URL(
      config?.url ?? '',
      config?.baseURL ?? API_BASE_URL ?? ''
    );
    console.log(
      '[HTTP]',
      config.method?.toUpperCase(),
      full.toString(),
      'Auth?',
      !!config.headers?.Authorization
    );
  } catch {}
  const raw = useUserStore.getState().accessToken;
  const bearer = normalizeBearer(raw);
  // 공개 엔드포인트는 Authorization을 강제로 제거
  const url = config?.url || '';
  const isNoAuth = isNoAuthURL(url);
  if (isNoAuth) {
    if (config.headers?.Authorization) delete config.headers.Authorization;
    return config;
  }
  if (bearer) {
    config.headers = config.headers || {};
    config.headers.Authorization = bearer;
  } else if (config.headers?.Authorization) {
    delete config.headers.Authorization;
  }
  return config;
});

authAxios.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config;
    if (!error.response) return Promise.reject(error);
    if (error.response.status !== 401 || originalRequest?._retry) {
      return Promise.reject(error);
    }

    const refreshToken = useUserStore.getState().refreshToken;
    if (!refreshToken) {
      useUserStore.getState().logout?.();
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      if (!refreshPromise) {
        refreshPromise = authAxios.post('/user/refresh', { refreshToken });
      }
      const { data } = await refreshPromise;
      refreshPromise = null;

      const newRaw = data?.accessToken;
      const newBearer = normalizeBearer(newRaw);
      if (!newBearer) throw new Error('리프레시 응답에 accessToken 없음');

      if (typeof useUserStore.getState().login === 'function') {
        useUserStore.getState().login({ accessToken: newRaw, refreshToken });
      } else {
        useUserStore.setState({ accessToken: newRaw });
      }

      originalRequest.headers = originalRequest.headers || {};
      originalRequest.headers.Authorization = newBearer;

      return authAxios(originalRequest);
    } catch (e) {
      refreshPromise = null;
      useUserStore.getState().logout?.();
      window.location.href = '/login'; // 프론트 로그인 라우트로
      return Promise.reject(e);
    }
  }
);

export default authAxios;
