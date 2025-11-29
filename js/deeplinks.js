;(function(){
  const isNative = !!(window.Capacitor && window.Capacitor.getPlatform && window.Capacitor.getPlatform() !== 'web');
  const App = isNative ? (window.Capacitor.App || window.Capacitor.Plugins?.App) : null;

  // Signal that a dedicated deep link handler is active so generic handlers can no-op
  try { window.__DEEPLINK_HANDLER_ACTIVE = true; } catch(_){}

  function navigateTo(path){
    try { window.location.replace(path); } catch(_){ window.location.href = path; }
  }

  function handleDeepLinkUrl(rawUrl){
    try{
      const url = new URL(rawUrl);
      const protocol = url.protocol; // e.g., vendplug:, https:
      const host = url.host;         // may be '' for custom scheme without host
      const pathname = (url.pathname || '').replace(/^\//,'');

      // Extract reference if present
      const reference = url.searchParams.get('reference') || url.searchParams.get('ref');

      // Case 1: Custom scheme vendplug://*
      if (protocol === 'vendplug:') {
        if (pathname === 'payment-success' && reference) {
          try { localStorage.setItem('paystack:pendingRef', reference); } catch(_){}
          navigateTo(`/payment-success.html?reference=${encodeURIComponent(reference)}&from=deeplink`);
          return;
        }
        if (pathname === 'wallet') {
          navigateTo('/buyer-wallet.html?from=deeplink');
          return;
        }
        // Default fallback for custom scheme
        if (reference) {
          try { localStorage.setItem('paystack:pendingRef', reference); } catch(_){}
          navigateTo(`/payment-success.html?reference=${encodeURIComponent(reference)}&from=deeplink`);
          return;
        }
      }

      // Case 2: App Links (https://vendplug.com.ng/payment-success?reference=...)
      if (protocol === 'https:' && /vendplug\.com\.ng$/i.test(host)) {
        if (pathname === 'payment-success' && reference) {
          try { localStorage.setItem('paystack:pendingRef', reference); } catch(_){}
          navigateTo(`/payment-success.html?reference=${encodeURIComponent(reference)}&from=applink`);
          return;
        }
        if (pathname === 'buyer-wallet.html' || pathname === 'wallet') {
          navigateTo('/buyer-wallet.html?from=applink');
          return;
        }
      }
    }catch(_){/* ignore */}
  }

  // Listen for deep links opened into the app
  try{
    if (App && typeof App.addListener === 'function') {
      App.addListener('appUrlOpen', ({ url }) => {
        handleDeepLinkUrl(url);
      });
    }
  }catch(_){/* ignore */}

  // If the app was cold-started by a deep link, try to process current URL
  try{
    const current = window.location.href;
    if (/vendplug:/.test(current) || /vendplug\.com\.ng/.test(current)) {
      handleDeepLinkUrl(current);
    }
  }catch(_){}
})();

