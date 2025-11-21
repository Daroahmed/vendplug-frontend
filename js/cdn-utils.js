// Cloudinary URL optimizer - inserts simple transformation
// Example: https://res.cloudinary.com/xxx/image/upload/v123/abc.jpg -> .../upload/f_auto,q_auto,w_400/...
function optimizeImage(url, width = 400, opts = {}) {
  try {
    if (!url || typeof url !== 'string' || url.trim() === '') return svgPlaceholder(width, opts.height);
    const marker = '/upload/';
    const idx = url.indexOf(marker);
    if (idx === -1) return url; // Non-Cloudinary: return as-is
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
    if (!url || typeof url !== 'string') {
      return svgPlaceholder(width, height);
    }
    const marker = '/upload/';
    const idx = url.indexOf(marker);
    if (idx === -1) {
      // Not a Cloudinary URL — return lightweight inline SVG placeholder
      return svgPlaceholder(width, height);
    }
    const before = url.slice(0, idx + marker.length);
    const after = url.slice(idx + marker.length);
    const parts = ['e_blur:1000','q_1',`w_${width}`];
    if (height) parts.push(`h_${height}`);
    return `${before}${parts.join(',')}/${after}`;
  } catch (_) { return svgPlaceholder(width, height); }
}
window.blurPlaceholder = blurPlaceholder;

// Build a responsive srcset string for common widths
function buildSrcSet(url, widths = [320, 480, 640, 800, 1200]) {
  try {
    if (!url || typeof url !== 'string' || url.trim() === '') return '';
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
          // Ensure smooth reveal
          const reveal = ()=> {
            img.classList.add('img-loaded');
            try {
              const wrap = img.closest('.img-wrap');
              if (wrap) wrap.classList.add('loaded');
            } catch(_){}
          };
          const fail = ()=>{
            try {
              const w = img.width || 40, h = img.height || 30;
              img.src = svgPlaceholder(w, h);
            } catch(_){}
            reveal();
          };
          // if network error happens
          try { img.addEventListener('error', fail, { once:true }); } catch(_){}
          if ('decode' in img) { img.decode().then(reveal).catch(fail); }
          else { img.onload = reveal; }
        } catch(_){}
        obs.unobserve(img);
      });
    }, { rootMargin: '400px 0px' }) : null;

    window.lazyUpgradeImages = function(){
      try{
        const imgs = document.querySelectorAll('img[data-src], img[data-srcset], img.product-image, img.vendor-image, img.agent-image');
        imgs.forEach(img=>{
          // Ensure lazy attribute present for browsers doing native lazy loading
          try { img.loading = img.loading || 'lazy'; } catch(_) {}

          // Inject loader wrapper once
          try {
            // Do not wrap gallery thumbnails (keeps their fixed size), but wrap others
            const isThumb = !!(img.classList && img.classList.contains('gallery-thumbnail'));
            if (!isThumb && !img.closest('.img-wrap')) {
              const wrap = document.createElement('div');
              wrap.className = 'img-wrap';
              // Do not force wrapper dimensions; let existing CSS define card heights
              const parent = img.parentNode;
              parent && parent.insertBefore(wrap, img);
              wrap.appendChild(img);
              const loader = document.createElement('div');
              loader.className = 'img-loader';
              loader.innerHTML = '<div class="spinner"></div>';
              wrap.appendChild(loader);
              // If this image will be upgraded (has data-src/srcset), keep loader until real image decodes
              const willUpgrade = img.hasAttribute('data-src') || img.hasAttribute('data-srcset');
              if (!willUpgrade) {
                // No upgrade, reveal when current image loads
                if (img.complete && img.naturalWidth > 0) {
                  img.classList.add('img-loaded');
                  wrap.classList.add('loaded');
                } else {
                  const onLoaded = ()=>{ img.classList.add('img-loaded'); wrap.classList.add('loaded'); };
                  if ('decode' in img) { img.decode().then(onLoaded).catch(onLoaded); }
                  else { img.addEventListener('load', onLoaded, { once:true }); }
                }
              }
            }
          } catch(_){}

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

// Generate a tiny inline SVG placeholder (dark theme friendly)
function svgPlaceholder(width = 40, height = 30) {
  try {
    const w = Number(width) || 40;
    const h = Number(height) || 30;
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}' viewBox='0 0 ${w} ${h}'><rect width='100%' height='100%' fill='#1e1e1e'/><rect x='0' y='0' width='100%' height='100%' fill='url(#g)' opacity='0.35'/><defs><linearGradient id='g'><stop offset='0%' stop-color='#1e1e1e'/><stop offset='50%' stop-color='#2a2a2a'/><stop offset='100%' stop-color='#1e1e1e'/></linearGradient></defs></svg>`;
    return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);
  } catch (_) {
    return 'data:image/gif;base64,R0lGODlhAQABAIAAAAUEBAAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==';
  }
}
window.svgPlaceholder = svgPlaceholder;


