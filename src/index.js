import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './styles/tailwind.css';
import App from './App';

// Kakao SDK 초기화
if (window.Kakao && !window.Kakao.isInitialized()) {
  const jsKey = process.env.REACT_APP_KAKAO_JS_KEY;
  if (jsKey) {
    window.Kakao.init(jsKey);
    console.log('[Kakao] SDK initialized:', window.Kakao.isInitialized());
  } else {
    console.warn('[Kakao] JavaScript key not found in .env');
  }
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
