document.addEventListener('DOMContentLoaded', () => {
  const vendor = JSON.parse(localStorage.getItem('vendplugVendor'));
  const token = vendor?.token;
  const BACKEND = window.BACKEND_URL || "";

  if (!token) {
    alert('Unauthorized. Please log in again.');
    window.location.href = '/vendor-login.html';
    return;
  }

  const addProductForm = document.getElementById('addProductForm');
  const msg = document.getElementById('msg');
  const productList = document.getElementById('productList');

  fetchVendorProducts();

  // 🔁 Handle form submission
  addProductForm.addEventListener('submit', (e) => {
    e.preventDefault();
    submitProduct();
  });

  // 🧠 Submit (create or update)
  async function submitProduct() {
    const id = document.getElementById('productId').value;
    const name = document.getElementById('productName').value;
    const price = Number(document.getElementById('productPrice').value);
    const description = document.getElementById('productDescription').value;
    const stock = Number(document.getElementById('productStock').value);
    const imageFile = document.getElementById('productImage').files[0];
  
    const endpoint = id
      ? `${BACKEND}/api/vendor-products/${id}`
      : `${BACKEND}/api/vendor-products`;
  
    const method = id ? 'PUT' : 'POST';
  
    try {
      const options = {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      };
  
      if (id) {
        // ✅ Editing: use JSON body
        options.headers['Content-Type'] = 'application/json';
        options.body = JSON.stringify({ name, price, description, stock });
      } else {
        // ✅ Creating: use FormData — no need to send category
        const formData = new FormData();
        formData.append('name', name);
        formData.append('price', price);
        formData.append('description', description);
        formData.append('stock', stock);
        if (imageFile) formData.append('productImage', imageFile);
        options.body = formData;
      }
  
      const res = await fetch(endpoint, options);
      const result = await res.json();
  
      if (!res.ok) throw new Error(result.message || 'Upload failed');
  
      resetForm();
      await fetchVendorProducts();
      alert(id ? '✅ Product updated' : '✅ Product added');
    } catch (err) {
      console.error(err);
      alert('❌ ' + err.message);
    }
  }
  

  // 🔁 Load vendor products
  async function fetchVendorProducts() {
    try {
      const res = await fetch(`${BACKEND}/api/vendor-products/mine`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const products = await res.json();

      productList.innerHTML = '';
      if (!Array.isArray(products) || !products.length) {
        productList.innerHTML = '<p>No products found.</p>';
        return;
      }

      products.forEach(product => {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.innerHTML = `
          ${product.image ? `<img src="${BACKEND}${product.image}" style="width:100%; border-radius:8px;" />` : ''}
          <h3>${product.name}</h3>
          <p>₦${product.price.toLocaleString()}</p>
          <p>Category: ${product.category}</p>
          <p>${product.description || ''}</p>
        `;
        productList.appendChild(card);
      });
    } catch (err) {
      console.error(err);
      productList.innerHTML = '<p>Error loading products.</p>';
    }
  }

  // 🔄 Reset form
  function resetForm() {
    addProductForm.reset();
    document.getElementById('productId').value = '';
  }
});
