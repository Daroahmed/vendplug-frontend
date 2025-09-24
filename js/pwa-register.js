// Register service worker and handle update lifecycle
(function(){
  if (!('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((reg) => {
      console.log('SW registered', reg.scope);
    }).catch((err) => console.warn('SW registration failed', err));
  });
})();


