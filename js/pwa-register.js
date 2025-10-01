// Register service worker and handle update lifecycle
(function(){
  if (!('serviceWorker' in navigator)) return;
  
  let deferredPrompt;
  let installButton;
  
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((reg) => {
      console.log('SW registered', reg.scope);
      // Proactively check for updates
      try { if (reg.update) reg.update(); } catch(_){}

      // Reload once when a new SW takes control to ensure fresh assets
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (window.__vp_sw_reloaded) return;
        window.__vp_sw_reloaded = true;
        location.reload();
      });

      // Listen for SW messages to show one-time toast
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'PRECACHE_READY') {
          try {
            if (!localStorage.getItem('vp_precache_toast_shown')) {
              window.showToast && window.showToast('Saved for offline use');
              localStorage.setItem('vp_precache_toast_shown', '1');
            }
          } catch(_){ }
        }
      });
    }).catch((err) => console.warn('SW registration failed', err));
  });

  // Handle PWA installation prompt
  window.addEventListener('beforeinstallprompt', (e) => {
    console.log('🔔 PWA install prompt available');
    // Prevent the mini-infobar from appearing on mobile
    e.preventDefault();
    // Stash the event so it can be triggered later
    deferredPrompt = e;
    // Show install button or banner
    showInstallPrompt();
  });

  // Handle successful installation
  window.addEventListener('appinstalled', (evt) => {
    console.log('✅ PWA was installed successfully');
    // Hide install button
    hideInstallPrompt();
    // Show success message
    if (window.showToast) {
      window.showToast('VendPlug installed successfully!');
    }
  });

  // Show install prompt (button or banner)
  function showInstallPrompt() {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      console.log('PWA already installed');
      return;
    }

    // Check if user has dismissed before
    if (localStorage.getItem('vp_install_dismissed')) {
      return;
    }

    // Create install banner
    createInstallBanner();
  }

  // Create install banner
  function createInstallBanner() {
    // Remove existing banner if any
    const existingBanner = document.getElementById('pwa-install-banner');
    if (existingBanner) {
      existingBanner.remove();
    }

    const banner = document.createElement('div');
    banner.id = 'pwa-install-banner';
    banner.innerHTML = `
      <div style="
        position: fixed;
        bottom: 20px;
        left: 20px;
        right: 20px;
        background: linear-gradient(135deg, #00cc99, #00a67e);
        color: white;
        padding: 16px;
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0, 204, 153, 0.3);
        z-index: 10000;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
        line-height: 1.4;
        display: flex;
        align-items: center;
        gap: 12px;
        animation: slideUp 0.3s ease-out;
      ">
        <div style="flex: 1;">
          <div style="font-weight: 600; margin-bottom: 4px;">📱 Install VendPlug</div>
          <div style="opacity: 0.9; font-size: 13px;">Get quick access and offline support</div>
        </div>
        <div style="display: flex; gap: 8px;">
          <button id="pwa-install-btn" style="
            background: rgba(255,255,255,0.2);
            border: 1px solid rgba(255,255,255,0.3);
            color: white;
            padding: 8px 16px;
            border-radius: 6px;
            font-size: 13px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
          ">Install</button>
          <button id="pwa-dismiss-btn" style="
            background: transparent;
            border: 1px solid rgba(255,255,255,0.3);
            color: white;
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 13px;
            cursor: pointer;
            transition: all 0.2s;
          ">×</button>
        </div>
      </div>
      <style>
        @keyframes slideUp {
          from { transform: translateY(100px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        #pwa-install-btn:hover {
          background: rgba(255,255,255,0.3);
        }
        #pwa-dismiss-btn:hover {
          background: rgba(255,255,255,0.1);
        }
      </style>
    `;

    document.body.appendChild(banner);

    // Add event listeners
    document.getElementById('pwa-install-btn').addEventListener('click', installPWA);
    document.getElementById('pwa-dismiss-btn').addEventListener('click', dismissInstallPrompt);

    // Auto-hide after 10 seconds
    setTimeout(() => {
      if (banner && banner.parentNode) {
        banner.style.animation = 'slideUp 0.3s ease-out reverse';
        setTimeout(() => banner.remove(), 300);
      }
    }, 10000);
  }

  // Install PWA
  function installPWA() {
    if (!deferredPrompt) {
      console.log('No install prompt available');
      return;
    }

    // Show the install prompt
    deferredPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    deferredPrompt.userChoice.then((choiceResult) => {
      if (choiceResult.outcome === 'accepted') {
        console.log('✅ User accepted the install prompt');
      } else {
        console.log('❌ User dismissed the install prompt');
      }
      // Clear the deferredPrompt
      deferredPrompt = null;
      hideInstallPrompt();
    });
  }

  // Dismiss install prompt
  function dismissInstallPrompt() {
    hideInstallPrompt();
    // Remember user dismissed it
    localStorage.setItem('vp_install_dismissed', '1');
  }

  // Hide install prompt
  function hideInstallPrompt() {
    const banner = document.getElementById('pwa-install-banner');
    if (banner) {
      banner.style.animation = 'slideUp 0.3s ease-out reverse';
      setTimeout(() => banner.remove(), 300);
    }
  }

  // Check if PWA is already installed
  function isPWAInstalled() {
    return window.matchMedia('(display-mode: standalone)').matches || 
           window.navigator.standalone === true;
  }

  // Expose functions globally
  window.installPWA = installPWA;
  window.isPWAInstalled = isPWAInstalled;
})();


