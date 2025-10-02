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
    console.log('🔔 PWA install prompt available', e);
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
    console.log('🔍 Checking if should show install prompt...');
    
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      console.log('❌ PWA already installed - not showing banner');
      return;
    }

    // Check if user has dismissed before
    if (localStorage.getItem('vp_install_dismissed')) {
      console.log('❌ User previously dismissed - not showing banner');
      return;
    }

    console.log('✅ Showing install banner');
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
      console.log('No install prompt available - showing manual instructions');
      showManualInstallInstructions();
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

  // Show manual install instructions
  function showManualInstallInstructions() {
    const instructions = document.createElement('div');
    instructions.id = 'pwa-manual-instructions';
    instructions.innerHTML = `
      <div style="
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        color: #333;
        padding: 24px;
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.3);
        z-index: 10001;
        max-width: 320px;
        text-align: center;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      ">
        <div style="font-size: 18px; font-weight: 600; margin-bottom: 16px;">📱 Install VendPlug</div>
        <div style="font-size: 14px; line-height: 1.4; margin-bottom: 20px;">
          <strong>Chrome/Edge:</strong> Look for the install icon in the address bar<br><br>
          <strong>Safari:</strong> Tap the share button, then "Add to Home Screen"<br><br>
          <strong>Firefox:</strong> Look for the install icon in the address bar
        </div>
        <button onclick="this.parentElement.parentElement.remove()" style="
          background: #00cc99;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
        ">Got it!</button>
      </div>
    `;
    document.body.appendChild(instructions);
    
    // Auto-remove after 10 seconds
    setTimeout(() => {
      if (instructions.parentNode) {
        instructions.remove();
      }
    }, 10000);
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

  // Fallback: Check for installability after a delay
  setTimeout(() => {
    if (!deferredPrompt && !isPWAInstalled() && !localStorage.getItem('vp_install_dismissed')) {
      console.log('🔄 Fallback: Checking PWA installability...');
      // Try to show a manual install option
      showManualInstallOption();
    }
  }, 3000);

  // Additional fallback for slower connections
  setTimeout(() => {
    if (!deferredPrompt && !isPWAInstalled() && !localStorage.getItem('vp_install_dismissed')) {
      console.log('🔄 Second fallback: Showing install option...');
      showManualInstallOption();
    }
  }, 8000);

  // Show manual install option
  function showManualInstallOption() {
    console.log('📱 Showing manual install option');
    createInstallBanner();
  }

  // Expose functions globally
  window.installPWA = installPWA;
  window.isPWAInstalled = isPWAInstalled;
})();


