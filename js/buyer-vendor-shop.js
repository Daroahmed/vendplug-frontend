document.addEventListener('DOMContentLoaded', () => {
    const BACKEND = window.BACKEND_URL || "http://localhost:5000";
    const params = new URLSearchParams(window.location.search);
    const state = params.get('state') || localStorage.getItem('vendorShopState');
    const category = params.get('category') || localStorage.getItem('vendorShopCategory');
  
    const vendorGrid = document.getElementById('vendorGrid');
  
    if (!state || !category) {
      vendorGrid.innerHTML = `<p class="empty">❌ Missing state or category</p>`;
      return;
    }
  
    fetch(`${BACKEND}/api/vendors/by-category?state=${state}&category=${category}`)
      .then(res => res.json())
      .then(vendors => {
        vendorGrid.innerHTML = '';
  
        if (!Array.isArray(vendors) || vendors.length === 0) {
          vendorGrid.innerHTML = `<p class="empty">No shops found in this category/state.</p>`;
          return;
        }
  
        vendors.forEach(vendor => {
          const div = document.createElement('div');
          div.className = 'vendor-card';
          div.innerHTML = `
            <img src="${vendor.brandImage || '/assets/placeholder.jpg'}" alt="${vendor.businessName}" />
            <h3>${vendor.businessName}</h3>
            <p>${vendor.totalTransactions} transactions</p>
            <div class="actions">
              <button class="btn" onclick="viewShop('${vendor._id}')">Shop</button>
              <button class="btn" onclick="viewProfile('${vendor._id}')">Profile</button>
            </div>
          `;
          vendorGrid.appendChild(div);
        });
      })
      .catch(err => {
        console.error(err);
        vendorGrid.innerHTML = `<p class="empty">Error loading shops.</p>`;
      });
  });
  
  // 🔗 Redirect to vendor’s product listing
  function viewShop(vendorId) {
    window.location.href = `/vendor-shop-products.html?vendor=${vendorId}`;
  }
  
  // 👤 Show profile modal or redirect
  function viewProfile(vendorId) {
    window.location.href = `/vendor-profile.html?vendor=${vendorId}`;
  }
  