// Cloudinary URL optimizer - inserts simple transformation
// Example: https://res.cloudinary.com/xxx/image/upload/v123/abc.jpg -> .../upload/f_auto,q_auto,w_400/...
function optimizeImage(url, width = 400, opts = {}) {
  try {
    if (!url || typeof url !== 'string') return url;
    const marker = '/upload/';
    const idx = url.indexOf(marker);
    if (idx === -1) return url;
    const before = url.slice(0, idx + marker.length);
    const after = url.slice(idx + marker.length);
    const parts = [`f_auto`,`q_auto`,`w_${width}`];
    if (opts.height) parts.push(`h_${opts.height}`);
    if (opts.crop) parts.push(`c_${opts.crop}`);
    return `${before}${parts.join(',')}/${after}`;
  } catch (_) { return url; }
}

window.optimizeImage = optimizeImage;

// Tiny blurred placeholder (LQIP)
function blurPlaceholder(url, width = 40, height) {
  try {
    if (!url || typeof url !== 'string') return url;
    const marker = '/upload/';
    const idx = url.indexOf(marker);
    if (idx === -1) return url;
    const before = url.slice(0, idx + marker.length);
    const after = url.slice(idx + marker.length);
    const parts = ['e_blur:1000','q_1',`w_${width}`];
    if (height) parts.push(`h_${height}`);
    return `${before}${parts.join(',')}/${after}`;
  } catch (_) { return url; }
}
window.blurPlaceholder = blurPlaceholder;

// Build a responsive srcset string for common widths
function buildSrcSet(url, widths = [320, 480, 640, 800, 1200]) {
  try {
    return widths.map(w => `${optimizeImage(url, w)} ${w}w`).join(', ');
  } catch (_) { return ''; }
}
window.buildSrcSet = buildSrcSet;

// Minimal IntersectionObserver-based lazy upgrader for LQIP -> full
(function(){
  try{
    const io = 'IntersectionObserver' in window ? new IntersectionObserver((entries, obs)=>{
      entries.forEach(entry=>{
        if (!entry.isIntersecting) return;
        const img = entry.target;
        try {
          const realSrc = img.getAttribute('data-src');
          const realSrcSet = img.getAttribute('data-srcset');
          if (realSrc) img.src = realSrc;
          if (realSrcSet) img.srcset = realSrcSet;
          img.onload = ()=> img.classList.add('img-loaded');
        } catch(_){}
        obs.unobserve(img);
      });
    }, { rootMargin: '200px 0px' }) : null;

    window.lazyUpgradeImages = function(){
      try{
        const imgs = document.querySelectorAll('img[data-src], img[data-srcset]');
        imgs.forEach(img=>{
          if (io) { io.observe(img); }
          else {
            // Fallback: upgrade immediately
            const realSrc = img.getAttribute('data-src');
            const realSrcSet = img.getAttribute('data-srcset');
            if (realSrc) img.src = realSrc;
            if (realSrcSet) img.srcset = realSrcSet;
          }
        });
      }catch(_){}
    };

    // Auto-run on DOM ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', ()=>window.lazyUpgradeImages && window.lazyUpgradeImages());
    } else {
      window.lazyUpgradeImages && window.lazyUpgradeImages();
    }
  }catch(_){}
})();


