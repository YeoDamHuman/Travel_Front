import React, { useEffect } from 'react';
import AppRoutes from './routes';
import { attachAppUrlOpenListener } from './app/deeplink';

function App() {
  useEffect(() => {
    // 앱 시작 시 딱 한 번만 딥링크 리스너 부착
    attachAppUrlOpenListener();
  }, []);
  return (
    <div className="bg-background min-h-screen">
      <AppRoutes />
    </div>
  );
}

export default App;
