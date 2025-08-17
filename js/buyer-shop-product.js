document.addEventListener('DOMContentLoaded', () => {
    const BACKEND = window.BACKEND_URL || "http://localhost:5000";
    const params = new URLSearchParams(window.location.search);
    const vendorId = params.get('vendor');
  
    const productGrid = document.getElementById('productGrid');
  
    if (!vendorId) {
      productGrid.innerHTML = `<p class="empty">❌ Vendor ID is missing</p>`;
      return;
    }
  
    fetch(`${BACKEND}/api/vendor-products/by-vendor?vendorId=${vendorId}`)
      .then(res => res.json())
      .then(products => {
        productGrid.innerHTML = '';
  
        if (!Array.isArray(products) || products.length === 0) {
          productGrid.innerHTML = `<p class="empty">No products found for this vendor.</p>`;
          return;
        }
  
        products.forEach(product => {
          const card = document.createElement('div');
          card.className = 'product-card';
          card.innerHTML = `
            ${product.image ? `<img src="${product.image}" alt="${product.name}" />` : ''}
            <h3>${product.name}</h3>
            <p>₦${product.price.toLocaleString()}</p>
            <p>Stock: ${product.stock ?? 'N/A'}</p>
            <p>${product.description || ''}</p>
          `;
          productGrid.appendChild(card);
        });
      })
      .catch(err => {
        console.error(err);
        productGrid.innerHTML = `<p class="empty">❌ Failed to load products</p>`;
      });
  });
  