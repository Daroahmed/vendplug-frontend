// Cloudinary URL optimizer - inserts simple transformation
// Example: https://res.cloudinary.com/xxx/image/upload/v123/abc.jpg -> .../upload/f_auto,q_auto,w_400/...
function optimizeImage(url, width = 400) {
  try {
    if (!url || typeof url !== 'string') return url;
    const marker = '/upload/';
    const idx = url.indexOf(marker);
    if (idx === -1) return url;
    const before = url.slice(0, idx + marker.length);
    const after = url.slice(idx + marker.length);
    return `${before}f_auto,q_auto,w_${width}/${after}`;
  } catch (_) { return url; }
}

window.optimizeImage = optimizeImage;


