// Minimal floating back button for desktop/PWA
;(function(){
  try{
    const isTouch = matchMedia('(pointer: coarse)').matches;
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    // Show desktop floating back button only on non-touch, but do NOT early return
    const shouldEnable = !isTouch;

    // Desktop-only floating button UI
    if (shouldEnable) {
      const style = document.createElement('style');
      style.textContent = `
        .vp-back-btn{position:fixed;bottom:20px;left:20px;z-index:9999;display:none;align-items:center;gap:8px;background:rgba(30,30,30,.9);color:#fff;border:1px solid rgba(255,255,255,.1);padding:10px 12px;border-radius:999px;box-shadow:0 8px 24px rgba(0,0,0,.35);cursor:grab;user-select:none;touch-action:none}
        .vp-back-btn.dragging{cursor:grabbing;opacity:.95}
        .vp-back-btn svg{width:16px;height:16px}
        .vp-back-btn.show{display:flex}
        @media (max-width: 768px){ .vp-back-btn{bottom:16px;left:16px} }
      `;
      document.head.appendChild(style);
    }

    // Ensure singleton instance even if script is included multiple times
    const existing = document.querySelector('.vp-back-btn');
    if (shouldEnable) {
      if (existing) {
        // If more than one exists, keep the first and remove extras
        const extras = Array.from(document.querySelectorAll('.vp-back-btn')).slice(1);
        extras.forEach(el => { try{ el.remove(); }catch(_){ } });
      }
    }
    const btn = existing || document.createElement('button');
    if (shouldEnable && !existing) {
      btn.type = 'button';
      btn.className = 'vp-back-btn';
      btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M15 18l-6-6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg><span>Back</span>';
    }

    function canGoBack(){
      // Heuristic: history length > 1 or there is a referrer from same origin
      const sameOriginRef = document.referrer && new URL(document.referrer).origin === location.origin;
      return (window.history.length > 1) || sameOriginRef;
    }

    function updateVisibility(){
      // Always show on desktop/PWA; let click handler decide behavior
      if (shouldEnable) btn.classList.add('show'); else btn.classList.remove('show');
    }

    if (shouldEnable && !btn.__vpBound) btn.addEventListener('click', function(){
      if (btn._dragMoved) return; // ignore click right after drag
      if (canGoBack()) {
        window.history.back();
        setTimeout(updateVisibility, 350);
      } else {
        window.location.href = '/public-buyer-home.html';
      }
    });

    // ---- Drag to move (mouse/touch) ----
    const storageKey = `vp_back_btn_pos:${location.pathname}`;
    function loadPos(){
      try{
        const raw = localStorage.getItem(storageKey);
        if (!raw) return;
        const pos = JSON.parse(raw);
        // switch from bottom-based default to top/left for free placement
        btn.style.bottom = 'auto';
        if (typeof pos.top === 'number') btn.style.top = pos.top + 'px';
        if (typeof pos.left === 'number') btn.style.left = pos.left + 'px';
      }catch(_){/* ignore */}
    }
    function clamp(n, min, max){ return Math.max(min, Math.min(max, n)); }
    function savePos(){
      try{
        const top = parseFloat(getComputedStyle(btn).top);
        const left = parseFloat(getComputedStyle(btn).left);
        if (Number.isFinite(top) && Number.isFinite(left)){
          localStorage.setItem(storageKey, JSON.stringify({ top, left }));
        }
      }catch(_){/* ignore */}
    }

    let startX=0, startY=0, startLeft=0, startTop=0;
    function onPointerDown(e){
      try{ e.preventDefault(); }catch(_){ }
      btn.classList.add('dragging');
      btn._dragMoved = false;
      // If we're still using bottom, convert to top for free move
      const rect = btn.getBoundingClientRect();
      btn.style.bottom = 'auto';
      btn.style.top = rect.top + 'px';
      btn.style.left = rect.left + 'px';
      startX = (e.touches ? e.touches[0].clientX : e.clientX) || 0;
      startY = (e.touches ? e.touches[0].clientY : e.clientY) || 0;
      startLeft = parseFloat(btn.style.left) || rect.left;
      startTop = parseFloat(btn.style.top) || rect.top;
      window.addEventListener('mousemove', onPointerMove, { passive:false });
      window.addEventListener('touchmove', onPointerMove, { passive:false });
      window.addEventListener('mouseup', onPointerUp, { passive:true, once:true });
      window.addEventListener('touchend', onPointerUp, { passive:true, once:true });
    }
    function onPointerMove(e){
      try{ e.preventDefault(); }catch(_){ }
      const x = (e.touches ? e.touches[0].clientX : e.clientX) || 0;
      const y = (e.touches ? e.touches[0].clientY : e.clientY) || 0;
      const dx = x - startX;
      const dy = y - startY;
      if (Math.abs(dx) + Math.abs(dy) > 3) btn._dragMoved = true;
      const vw = window.innerWidth; const vh = window.innerHeight;
      const br = btn.getBoundingClientRect();
      const newLeft = clamp(startLeft + dx, 8, vw - br.width - 8);
      const newTop = clamp(startTop + dy, 8, vh - br.height - 8);
      btn.style.left = newLeft + 'px';
      btn.style.top = newTop + 'px';
    }
    function onPointerUp(){
      btn.classList.remove('dragging');
      window.removeEventListener('mousemove', onPointerMove);
      window.removeEventListener('touchmove', onPointerMove);
      savePos();
      // small delay so click after drag is ignored
      setTimeout(()=>{ btn._dragMoved = false; }, 50);
    }
    if (shouldEnable && !btn.__vpBound) {
      btn.addEventListener('mousedown', onPointerDown);
      btn.addEventListener('touchstart', onPointerDown, { passive:false });
      btn.__vpBound = true; // prevent double-binding if script reinjected
    }

    function mount(){
      if (shouldEnable) {
        if (!document.body.contains(btn)) {
          document.body.appendChild(btn);
        }
        loadPos();
        updateVisibility();
      }
    }
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', mount);
    } else {
      // DOM is already ready (likely when script injected late) → mount now
      mount();
    }

    window.addEventListener('popstate', updateVisibility);
    window.addEventListener('hashchange', updateVisibility);

  // ---- Native Android back button handling (Capacitor) ----
  try {
    const isNativeEnv = !!(window.Capacitor && window.Capacitor.getPlatform && window.Capacitor.getPlatform() !== 'web');
    if (isNativeEnv && !window.__vpNativeBackBound) {
      const App = window.Capacitor.App || window.Capacitor.Plugins?.App;

      // History guard: ensure there's always at least one entry to consume back presses
      // so the OS doesn't immediately minimize the app when on a root screen.
      try {
        const guardKey = '__vp_back_guard__';
        const ensureGuard = () => {
          try {
            // If history has only one entry, add a guard state
            if (window.history.length <= 1 || !history.state || history.state.__vp !== guardKey) {
              try { history.replaceState({ __vp: guardKey }, document.title, location.href); } catch(_) {}
              try { history.pushState({ __vp: guardKey }, document.title, location.href); } catch(_) {}
            }
          } catch(_){}
        };
        // Install guard on load and on visibility regain
        ensureGuard();
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') ensureGuard();
        });
        // Re-arm guard after a pop when at root
        window.addEventListener('popstate', () => {
          try {
            const path = (location.pathname || '').replace(/^\//, '');
            const isRoot = !path || path === 'public-buyer-home.html' || path === 'index.html';
            if (isRoot) {
              // Re-arm guard so another back press won't exit the app
              ensureGuard();
            }
          } catch(_){}
        });
      } catch(_){}

      if (App && typeof App.addListener === 'function') {
        App.addListener('backButton', async ({ canGoBack } = {}) => {
          try {
            const path = (location.pathname || '').replace(/^\//, '');
            const isRoot = !path || path === 'public-buyer-home.html' || path === 'index.html';

            // Prefer Capacitor's canGoBack signal (more reliable than history length)
            let nativeCanGoBack = !!canGoBack;
            try {
              if (!nativeCanGoBack && typeof App.canGoBack === 'function') {
                const res = await App.canGoBack();
                // Capacitor can return { value: boolean } or { canGoBack: boolean } depending on version
                nativeCanGoBack = !!(res && (res.value === true || res.canGoBack === true));
              }
            } catch(_){}

            if (nativeCanGoBack) {
              window.history.back();
              return;
            }

            // Fallback: heuristic using referrer or history length
            const sameOriginRef = document.referrer && new URL(document.referrer).origin === location.origin;
            if (!isRoot && (sameOriginRef || window.history.length > 1)) {
              window.history.back();
              return;
            }

            if (!isRoot) {
              // No back stack → route to app home instead of exiting
              // Use replace to avoid adding extra history entry
              window.location.replace('/public-buyer-home.html');
              return;
            }
            // At root with no back stack → let default behavior (exit) occur
          } catch(_){ /* ignore */ }
        });
        window.__vpNativeBackBound = true;
      }
    }
  } catch(_){ /* ignore */ }
  }catch(_){/* no-op */}
})();


