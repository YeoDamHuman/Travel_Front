// src/components/AppBackHandler.js
import { useEffect, useRef } from 'react';
import { App } from '@capacitor/app';
// react-router를 쓴다면:
import { useLocation, useNavigate } from 'react-router-dom';
import { Toast } from '@capacitor/toast';

export default function AppBackHandler() {
  const navigate = useNavigate?.(); // react-router 없으면 undefined일 수 있으니 optional
  const location = useLocation?.() || { pathname: window.location.pathname };
  const lastBackTime = useRef(0);

  useEffect(() => {
    const remove = App.addListener('backButton', async (event) => {
      const isHome = location.pathname === '/' || location.pathname === '/home';

      // Capacitor가 주는 canGoBack(안 줄 수도 있음) + 브라우저 히스토리 길이로 보조 판단
      const canGoBack =
        (event && typeof event.canGoBack === 'boolean'
          ? event.canGoBack
          : false) || window.history.length > 1;

      // 홈이 아니고 뒤로갈 수 있으면: 페이지 뒤로가기
      if (!isHome && canGoBack) {
        if (navigate) {
          navigate(-1);
        } else {
          window.history.back();
        }
        return;
      }

      // 홈이거나 더 이상 갈 곳이 없으면: 1.5초 안에 두 번 눌러 종료
      const now = Date.now();
      if (now - lastBackTime.current < 1500) {
        App.exitApp();
      } else {
        lastBackTime.current = now;
        await Toast.show({ text: '한 번 더 누르면 앱이 종료됩니다' });
      }
    });

    return () => {
      remove.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, navigate]);

  return null;
}
