// app-lock.js - Local biometric app unlock for Capacitor builds
;(function(){
  const isNative = !!(window.Capacitor && window.Capacitor.getPlatform && window.Capacitor.getPlatform() !== 'web');
  const App = isNative ? (window.Capacitor.App || window.Capacitor.Plugins?.App) : null;
  const Bio = isNative ? (window.BiometricAuth || window.Capacitor.Plugins?.BiometricAuth) : null;
  const Prefs = isNative ? (window.Capacitor.Preferences || window.Capacitor.Plugins?.Preferences) : null;

  const STORAGE = {
    async get(key, def){
      try {
        if (Prefs && Prefs.get) {
          const { value } = await Prefs.get({ key });
          return value != null ? JSON.parse(value) : def;
        }
      } catch(_) {}
      try {
        const raw = localStorage.getItem(key);
        return raw != null ? JSON.parse(raw) : def;
      } catch(_) { return def; }
    },
    async set(key, val){
      try {
        const str = JSON.stringify(val);
        if (Prefs && Prefs.set) {
          await Prefs.set({ key, value: str });
          return;
        }
      } catch(_) {}
      try { localStorage.setItem(key, JSON.stringify(val)); } catch(_) {}
    }
  };

  const KEY_ENABLED = 'applock:enabled';
  const KEY_IDLE_MS = 'applock:idleMs';
  const KEY_LAST_UNLOCK = 'applock:lastUnlockMs';
  const KEY_SUGGESTED = 'applock:suggested';

  const DEFAULT_IDLE_MS = 5 * 60 * 1000; // 5 minutes

  function createLockOverlay(){
    let el = document.getElementById('vp-app-lock');
    if (el) return el;
    const styleId = 'vp-app-lock-style';
    if (!document.getElementById(styleId)){
      const s = document.createElement('style');
      s.id = styleId;
      s.textContent = `
        #vp-app-lock{position:fixed;inset:0;background:rgba(0,0,0,.6);backdrop-filter:blur(3px);z-index:100000;display:none;align-items:center;justify-content:center}
        #vp-app-lock .card{width:min(92vw,380px);background:#1e1e1e;border:1px solid rgba(255,255,255,.1);border-radius:14px;color:#fff;box-shadow:0 20px 60px rgba(0,0,0,.45);padding:22px;text-align:center}
        #vp-app-lock .icon{font-size:42px;margin-bottom:10px;color:#00cc99}
        #vp-app-lock .title{font-weight:700;margin:8px 0 4px}
        #vp-app-lock .msg{opacity:.9;margin-bottom:14px}
        #vp-app-lock .actions{display:flex;gap:8px;justify-content:center;margin-top:8px}
        #vp-app-lock .btn{background:#00cc99;color:#00110b;border:none;padding:10px 16px;border-radius:8px;cursor:pointer;font-weight:700}
        #vp-app-lock .btn.secondary{background:transparent;color:#fff;border:1px solid rgba(255,255,255,.15)}
      `;
      document.head.appendChild(s);
    }
    el = document.createElement('div');
    el.id = 'vp-app-lock';
    el.innerHTML = `
      <div class="card">
        <div class="icon">🔒</div>
        <div class="title">Unlock VendPlug</div>
        <div class="msg">Use your device biometrics to continue.</div>
        <div class="actions">
          <button class="btn" id="vp-app-lock-unlock">Unlock</button>
          <button class="btn secondary" id="vp-app-lock-cancel">Cancel</button>
        </div>
      </div>`;
    document.body.appendChild(el);
    return el;
  }

  async function isBiometricAvailable(){
    if (!isNative || !Bio) return false;
    try {
      const res = await (Bio.isAvailable ? Bio.isAvailable() : Promise.resolve(false));
      if (typeof res === 'boolean') return res;
      return !!(res && (res.isAvailable === true || res.available === true));
    } catch(_) { return false; }
  }

  async function verifyBiometric(reason){
    if (!isNative || !Bio) throw new Error('Biometric plugin not available');
    const opts = { reason: reason || 'Unlock with biometrics', title: 'Unlock VendPlug' };
    if (Bio.verify) return Bio.verify(opts);
    if (Bio.auth) return Bio.auth(opts);
    throw new Error('Biometric verify not supported');
  }

  let busy = false;
  async function maybeLock(force){
    if (busy) return;
    const enabled = await STORAGE.get(KEY_ENABLED, false);
    if (!enabled) return;
    const idleMs = await STORAGE.get(KEY_IDLE_MS, DEFAULT_IDLE_MS);
    const last = await STORAGE.get(KEY_LAST_UNLOCK, 0);
    const shouldPrompt = force || (Date.now() - Number(last || 0) > Number(idleMs || DEFAULT_IDLE_MS));
    if (!shouldPrompt) return;

    const overlay = createLockOverlay();
    overlay.style.display = 'flex';

    const doUnlock = async () => {
      if (busy) return;
      busy = true;
      try {
        const avail = await isBiometricAvailable();
        if (!avail) throw new Error('Biometrics unavailable');
        await verifyBiometric('Unlock your session');
        await STORAGE.set(KEY_LAST_UNLOCK, Date.now());
        overlay.style.display = 'none';
      } catch (e) {
        // Stay locked; optionally inform user
      } finally {
        busy = false;
      }
    };

    const unlockBtn = document.getElementById('vp-app-lock-unlock');
    const cancelBtn = document.getElementById('vp-app-lock-cancel');
    if (unlockBtn) unlockBtn.onclick = doUnlock;
    if (cancelBtn) cancelBtn.onclick = () => { /* remain locked */ };

    // Auto-attempt once
    doUnlock();
  }

  async function suggestEnableIfEligible(){
    if (!isNative) return;
    const already = await STORAGE.get(KEY_SUGGESTED, false);
    if (already) return;
    const authenticated = !!(window.getAuthToken && window.getAuthToken());
    if (!authenticated) return;
    const avail = await isBiometricAvailable();
    if (!avail) { await STORAGE.set(KEY_SUGGESTED, true); return; }

    // Simple prompt
    const allow = confirm('Enable biometric unlock on this device? You can change this later in settings.');
    await STORAGE.set(KEY_SUGGESTED, true);
    if (allow) {
      await AppLock.enable(true);
      alert('Biometric unlock enabled.');
    }
  }

  const AppLock = {
    async enable(on){
      await STORAGE.set(KEY_ENABLED, !!on);
      if (on) {
        await STORAGE.set(KEY_IDLE_MS, await STORAGE.get(KEY_IDLE_MS, DEFAULT_IDLE_MS));
        await STORAGE.set(KEY_LAST_UNLOCK, Date.now());
      }
    },
    async setIdleMinutes(mins){
      const ms = Math.max(1, Number(mins || 5)) * 60 * 1000;
      await STORAGE.set(KEY_IDLE_MS, ms);
    },
    async verifyNow(){
      await maybeLock(true);
    },
    async isEnabled(){
      return !!(await STORAGE.get(KEY_ENABLED, false));
    }
  };
  window.AppLock = AppLock;

  // Hook lifecycle
  document.addEventListener('DOMContentLoaded', () => {
    // First-run suggestion after login
    setTimeout(() => { suggestEnableIfEligible(); }, 800);
  });

  // Lock on resume/visibility
  try {
    if (App && typeof App.addListener === 'function') {
      App.addListener('appStateChange', async ({ isActive }) => {
        if (isActive) await maybeLock(false);
      });
    }
  } catch(_) {}
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') { maybeLock(false); }
  });
})();

