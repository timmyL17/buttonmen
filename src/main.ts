import './style.css';
import { warmUpAi } from './ai/client';
import { App } from './ui/app';

new App(document.getElementById('app')!);
warmUpAi();

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}
