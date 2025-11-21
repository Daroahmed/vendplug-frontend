// js/config.js
// Always prefer same-origin in production so cookies/paths match Nginx
(function () {
  const isLocal = window.location.hostname === "localhost";
  let backend = isLocal ? "http://localhost:5000" : window.location.origin;

  // Dev override: ?backend=http://host:port or localStorage BACKEND_URL_OVERRIDE
  try {
    const qs = new URLSearchParams(window.location.search);
    const qsBackend = qs.get('backend');
    const lsBackend = window.localStorage ? localStorage.getItem('BACKEND_URL_OVERRIDE') : null;
    if (qsBackend && /^https?:\/\//i.test(qsBackend)) backend = qsBackend;
    else if (lsBackend && /^https?:\/\//i.test(lsBackend)) backend = lsBackend;
  } catch (_) {}

  window.BACKEND_URL = backend;

  // Frontend URL for email verification links
  window.FRONTEND_URL = isLocal ? "http://localhost:5000" : window.location.origin;

  // Socket.IO configuration - always use same-origin
  window.SOCKET_URL = window.location.origin;

  // Paystack configuration
  window.PAYSTACK_PUBLIC_KEY = isLocal
    ? "pk_test_your_test_public_key_here"
    : "pk_live_your_live_public_key_here";

  // Deep link handling (App/Universal Links → route inside SPA)
  try {
    const isNative = !!(window.Capacitor && window.Capacitor.getPlatform && window.Capacitor.getPlatform() !== 'web');
    const App = isNative ? (window.Capacitor.App || window.Capacitor.Plugins?.App) : null;
    if (App && typeof App.addListener === 'function') {
      App.addListener('appUrlOpen', ({ url }) => {
        try {
          const u = new URL(url);
          // Only handle links from our own domain/scheme
          if (!u.host || u.host.endsWith('vendplug.com.ng')) {
            const pathAndQuery = u.pathname + (u.search || '');
            // Navigate inside web app
            window.location.href = pathAndQuery;
          }
        } catch (_) {}
      });
    }
  } catch (_) {}

  // Push Notifications bootstrap (FCM via @capacitor/push-notifications)
  // Usage: window.initPushForRole('buyer'|'agent'|'vendor'|'admin')
  window.initPushForRole = async function (role) {
    try {
      const isNative = !!(window.Capacitor && window.Capacitor.getPlatform && window.Capacitor.getPlatform() !== 'web');
      if (!isNative) return;
      const Push = window.Capacitor.PushNotifications || window.Capacitor.Plugins?.PushNotifications;
      if (!Push) return;

      const perm = await Push.requestPermissions();
      if (!perm || perm.receive !== 'granted') return;
      await Push.register();

      // Token registration
      Push.addListener('registration', async ({ value }) => {
        try {
          await fetch(`${window.BACKEND_URL}/api/devices/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              token: value,
              role,
              platform: window.Capacitor.getPlatform()
            })
          });
        } catch (_) {}
      });

      // Tap → deep-link
      Push.addListener('pushNotificationActionPerformed', (event) => {
        try {
          const url = event?.notification?.data?.url;
          if (url) {
            if (/^https?:\/\//i.test(url)) window.location.href = new URL(url).pathname + (new URL(url).search || '');
            else window.location.href = url;
          }
        } catch (_) {}
      });
    } catch (_) {}
  };
})();