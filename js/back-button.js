// Minimal floating back button for desktop/PWA
;(function(){
  try{
    const isTouch = matchMedia('(pointer: coarse)').matches;
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    // Show only on desktop or standalone and when not the root/home
    const shouldEnable = !isTouch || isStandalone;
    if (!shouldEnable) return;

    const style = document.createElement('style');
    style.textContent = `
      .vp-back-btn{position:fixed;bottom:20px;left:20px;z-index:9999;display:none;align-items:center;gap:8px;background:rgba(30,30,30,.9);color:#fff;border:1px solid rgba(255,255,255,.1);padding:10px 12px;border-radius:999px;box-shadow:0 8px 24px rgba(0,0,0,.35);cursor:pointer;user-select:none}
      .vp-back-btn svg{width:16px;height:16px}
      .vp-back-btn.show{display:flex}
      @media (max-width: 768px){ .vp-back-btn{bottom:16px;left:16px} }
    `;
    document.head.appendChild(style);

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'vp-back-btn';
    btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M15 18l-6-6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg><span>Back</span>';

    function canGoBack(){
      // Heuristic: history length > 1 or there is a referrer from same origin
      const sameOriginRef = document.referrer && new URL(document.referrer).origin === location.origin;
      return (window.history.length > 1) || sameOriginRef;
    }

    function updateVisibility(){
      // Always show on desktop/PWA; let click handler decide behavior
      if (shouldEnable) btn.classList.add('show'); else btn.classList.remove('show');
    }

    btn.addEventListener('click', function(){
      if (canGoBack()) {
        window.history.back();
        setTimeout(updateVisibility, 350);
      } else {
        window.location.href = '/public-buyer-home.html';
      }
    });

    function mount(){
      if (!document.body.contains(btn)) {
        document.body.appendChild(btn);
      }
      updateVisibility();
    }
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', mount);
    } else {
      // DOM is already ready (likely when script injected late) → mount now
      mount();
    }

    window.addEventListener('popstate', updateVisibility);
    window.addEventListener('hashchange', updateVisibility);
  }catch(_){/* no-op */}
})();


