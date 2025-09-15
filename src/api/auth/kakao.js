// src/api/auth/kakao.js
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import http from '../../utils/authAxios';

const REST_API_KEY = process.env.REACT_APP_KAKAO_REST_KEY;

// Redirect URIs
export const WEB_REDIRECT_URI = 'https://yeodam.site/kakao/callback';
export const APP_REDIRECT_URI = 'yeodam://kakao/callback';

// (옵션) state 생성 유틸
function randomState() {
  try {
    return String(crypto.getRandomValues(new Uint32Array(1))[0]);
  } catch {
    return String(Date.now());
  }
}

// 카카오 authorize URL 생성
function buildAuthorizeUrl(redirectUri) {
  const enc = encodeURIComponent;
  const state = enc(randomState());
  return `https://kauth.kakao.com/oauth/authorize?client_id=${REST_API_KEY}&redirect_uri=${enc(
    redirectUri
  )}&response_type=code&state=${state}`;
}

/**
 * ✅ 네이티브/웹 통합 로그인 스타터
 * - 네이티브: 카카오(앱/브라우저)로 이동했다가 yeodam:// 로 앱 복귀
 * - 웹: 기존 서버 라우트 통해 리다이렉트
 */
export async function startKakaoLogin() {
  const isNative = Capacitor.isNativePlatform();

  if (isNative) {
    const url = buildAuthorizeUrl(APP_REDIRECT_URI);
    await Browser.open({ url, presentationStyle: 'popover' });
  } else {
    // 기존 서버 라우트를 통한 웹 로그인 시작(유지)
    window.location.href = getKakaoLoginUrl();
  }
}

/**
 * (웹 전용) 서버에서 카카오 로그인 시작 URL
 * - 네이티브에선 쓰지 말 것
 */
export const getKakaoLoginUrl = () =>
  `${http.defaults.baseURL}/auth/kakao/login`;

/**
 * ✅ code 교환
 * - 네이티브: redirectUri=APP_REDIRECT_URI
 * - 웹: redirectUri=WEB_REDIRECT_URI
 * 백엔드가 이 redirectUri를 그대로 사용해 토큰 교환해야 함
 */
export async function kakaoCallback(arg) {
  const code = typeof arg === 'string' ? arg : arg?.code;
  if (!code) throw new Error('kakaoCallback: code가 없습니다.');

  const redirectUri = Capacitor.isNativePlatform()
    ? APP_REDIRECT_URI
    : WEB_REDIRECT_URI;

  const { data } = await http.post('/auth/kakao/callback', {
    code,
    redirectUri, // ⬅️ 중요: 서버로 넘긴다
  });

  return data; // { jwtDto, userNickname, ... } 형태(서버 응답 형식 유지)
}
