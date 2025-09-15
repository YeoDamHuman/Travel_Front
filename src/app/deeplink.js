// src/app/deeplink.js
import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { kakaoCallback } from '../api/auth/kakao';
import useUserStore from '../store/userStore';

let attached = false;

export function attachAppUrlOpenListener() {
  if (attached) return;
  attached = true;

  App.addListener('appUrlOpen', async ({ url }) => {
    try {
      if (!url) return;

      // ex) yeodam://kakao/callback?code=xxx&state=yyy
      const u = new URL(url);
      if (u.protocol !== 'yeodam:') return;
      if (u.host !== 'kakao') return;
      if (u.pathname !== '/callback') return;

      const code = u.searchParams.get('code');

      // (가능하면) 외부 브라우저/탭 닫기
      try {
        await Browser.close();
      } catch {}

      if (!code) return;

      // ⬇️ 서버로 code(+ redirectUri) 보내서 교환
      const res = await kakaoCallback({ code });
      // 서버 응답 예: { jwtDto, userNickname, userEmail, userName, profileImageUrl, userRole, ... }
      const {
        jwtDto = {},
        userNickname,
        userEmail,
        userName,
        profileImageUrl,
        userRole,
      } = res || {};

      // ✅ 당신의 userStore.login은 객체 인자를 받음
      useUserStore.getState().login({
        accessToken: jwtDto?.accessToken,
        refreshToken: jwtDto?.refreshToken,
        nickname: userNickname,
        profileImageUrl,
        userRole,
        userEmail,
        userName,
      });

      window.location.replace('/');
    } catch (e) {
      console.error('[appUrlOpen] error:', e);
    }
  });
}
