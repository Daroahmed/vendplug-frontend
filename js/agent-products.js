document.addEventListener('DOMContentLoaded', () => {
  const agent = getCurrentUser();
  const token = getAuthToken();
  const BACKEND = window.BACKEND_URL || "";

  if (!token) {
    alert('Unauthorized. Please log in again.');
    redirectToLogin();
    return;
  }

  const addProductForm = document.getElementById('addProductForm');
  const productList = document.getElementById('productList');
  const categorySelect = document.getElementById('productCategory');
  const photosContainer = document.getElementById('photosContainer');
  const photoCount = document.getElementById('photoCount');
  const imageInput = document.getElementById('productImages');

  // Store for managing photos (both existing URLs and new files)
  let currentPhotos = {
    existing: [], // Array of {url, index} for existing images from DB
    newFiles: [] // Array of File objects for newly selected images
  };

  // 👇 Load category
  if (categorySelect && agent?.category) {
    categorySelect.innerHTML = `<option value="${agent.category}" selected>${agent.category}</option>`;
  } else {
    categorySelect.innerHTML = `<option value="" selected>No category found</option>`;
  }

  fetchAgentProducts();
  initializePhotoInterface();

  // ✅ Form submission
  addProductForm.addEventListener('submit', (e) => {
    e.preventDefault();
    submitProduct();
  });

  // Initialize photo interface with + button
  function initializePhotoInterface() {
    photosContainer.innerHTML = '';
    renderAddButton();
    updatePhotoCount();
  }

  // Render the + button to add photos
  function renderAddButton() {
    // Only show + button if we haven't reached 5 photos
    if (getTotalPhotoCount() < 5) {
      const addBtn = document.createElement('div');
      addBtn.className = 'photo-add-btn';
      addBtn.innerHTML = '<i class="fas fa-plus"></i>';
      addBtn.onclick = () => imageInput.click();
      photosContainer.appendChild(addBtn);
    }
  }

  // Render all photos (existing + new)
  function renderPhotos() {
    photosContainer.innerHTML = '';
    
    // Render existing photos
    currentPhotos.existing.forEach((photo, index) => {
      const thumbnail = createPhotoThumbnail(photo.url, index, 'existing', photo.id);
      photosContainer.appendChild(thumbnail);
    });
    
    // Render new file photos
    currentPhotos.newFiles.forEach((file, index) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const thumbnail = createPhotoThumbnail(e.target.result, currentPhotos.existing.length + index, 'new', index);
        photosContainer.appendChild(thumbnail);
      };
      reader.readAsDataURL(file);
    });
    
    // Render add button if needed
    renderAddButton();
    updatePhotoCount();
  }

  // Create a photo thumbnail element
  function createPhotoThumbnail(src, displayIndex, type, id) {
    const wrapper = document.createElement('div');
    wrapper.className = 'photo-thumbnail';
    wrapper.dataset.type = type;
    wrapper.dataset.id = id;
    
    const img = document.createElement('img');
    img.src = src;
    img.alt = `Photo ${displayIndex + 1}`;
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'photo-delete-btn';
    deleteBtn.innerHTML = '<i class="fas fa-times"></i>';
    deleteBtn.title = 'Remove photo';
    deleteBtn.onclick = (e) => {
      e.stopPropagation();
      removePhoto(type, id);
    };
    
    // Add primary badge to first photo
    if (displayIndex === 0) {
      const badge = document.createElement('div');
      badge.className = 'photo-primary-badge';
      badge.textContent = 'Primary';
      wrapper.appendChild(badge);
    }
    
    wrapper.appendChild(img);
    wrapper.appendChild(deleteBtn);
    
    return wrapper;
  }

  // Remove a photo
  function removePhoto(type, id) {
    if (type === 'existing') {
      currentPhotos.existing = currentPhotos.existing.filter(p => p.id !== id);
    } else if (type === 'new') {
      currentPhotos.newFiles = currentPhotos.newFiles.filter((_, index) => index !== id);
    }
    renderPhotos();
    
    // Reset file input to allow re-selecting the same files
    if (imageInput) {
      imageInput.value = '';
    }
  }

  // Handle file selection
  imageInput?.addEventListener('change', function(e) {
    const files = Array.from(e.target.files);
    const remainingSlots = 5 - getTotalPhotoCount();
    
    if (remainingSlots <= 0) {
      alert('⚠️ Maximum 5 images allowed.');
      this.value = '';
      return;
    }
    
    // Add only the files that fit within the limit
    const filesToAdd = files.slice(0, remainingSlots);
    currentPhotos.newFiles.push(...filesToAdd);
    
    if (files.length > remainingSlots) {
      alert(`⚠️ Only ${remainingSlots} more image(s) can be added (${files.length} selected).`);
    }
    
    renderPhotos();
    this.value = ''; // Reset to allow re-selecting
  });

  // Get total photo count
  function getTotalPhotoCount() {
    return currentPhotos.existing.length + currentPhotos.newFiles.length;
  }

  // Update photo count display
  function updatePhotoCount() {
    const count = getTotalPhotoCount();
    photoCount.textContent = `${count} of 5`;
  }

  async function submitProduct() {
    const id = document.getElementById('productId').value;
    const name = document.getElementById('productName').value;
    const price = Number(document.getElementById('productPrice').value);
    const description = document.getElementById('productDescription').value;
    const stock = Number(document.getElementById('productStock').value);
    const category = agent?.category;

    if (!category) {
      const msg = 'Agent category is missing';
      if (typeof showOverlay === 'function') {
        return showOverlay({ type:'error', title:'Missing Category', message: msg });
      }
      return alert(msg);
    }

    const formData = new FormData();
    formData.append('name', name);
    formData.append('price', price);
    formData.append('description', description);
    formData.append('stock', stock);
    formData.append('category', category);

    // Handle photo updates
    if (id) {
      // Updating existing product
      // If there are existing photos to keep, pass them
      if (currentPhotos.existing.length > 0) {
        formData.append('keepExistingImages', 'true');
      }
      
      // If we want to clear all images and replace them
      if (currentPhotos.existing.length === 0 && currentPhotos.newFiles.length > 0) {
        formData.append('clearImages', 'true');
      }
    }

    // Append new image files
    currentPhotos.newFiles.forEach((file) => {
      formData.append('productImages', file);
    });

    const endpoint = id
      ? `${BACKEND}/api/agent-products/update/${id}`
      : `${BACKEND}/api/agent-products`;

    const submitBtn = addProductForm.querySelector('.submit-btn');
    const originalHTML = submitBtn?.innerHTML;

    try {
      // Show loading state
      if (submitBtn) {
        submitBtn.innerHTML = '<div class="spinner spinner-sm"></div> Processing...';
        submitBtn.disabled = true;
      }

      // Use makeAuthenticatedRequest if available, otherwise use fetch
      let res;
      if (typeof makeAuthenticatedRequest === 'function') {
        res = await makeAuthenticatedRequest(endpoint, {
          method: 'POST',
          body: formData,
        });
      } else {
        res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });
      }

      const result = await res.json();
      
      if (!res.ok) {
        if (res.status === 401) {
          if (typeof showOverlay === 'function') {
            showOverlay({ type:'error', title:'Session Expired', message:'Your session has expired. Please log in again.' });
          }
          if (typeof clearAuth === 'function') clearAuth();
          if (typeof redirectToLogin === 'function') redirectToLogin();
          return;
        }
        throw new Error(result.message || 'Upload failed');
      }

      resetForm();
      await fetchAgentProducts();
      
      const successMsg = id ? 'Product updated' : 'Product added';
      if (typeof showOverlay === 'function') {
        showOverlay({ type:'success', title:'Success', message: successMsg });
      } else {
        alert('✅ ' + successMsg);
      }
    } catch (err) {
      console.error(err);
      if (typeof showOverlay === 'function') {
        showOverlay({ type:'error', title:'Error', message: err.message });
      } else {
        alert('❌ ' + err.message);
      }
    } finally {
      // Restore button state
      if (submitBtn && originalHTML) {
        submitBtn.innerHTML = originalHTML;
        submitBtn.disabled = false;
      }
    }
  }

  async function fetchAgentProducts() {
    try {
      const res = await fetch(`${BACKEND}/api/agent-products/mine`, {
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
          ${product.image ? `<img src="${product.image}" style="width:100%; border-radius:8px;" />` : ''}
          <h3>${product.name}</h3>
          <p>₦${product.price.toLocaleString()}</p>
          <p>Stock: ${product.stock ?? 'Not specified'}</p>
          <p>Category: ${product.category}</p>
          <p>${product.description || ''}</p>
          <div class="product-actions">
            <button class="edit-btn" onclick='editProduct(${JSON.stringify(product)})'>Edit</button>
            <button class="delete-btn" onclick='deleteProduct("${product._id}")'>Delete</button>
          </div>
        `;
        productList.appendChild(card);
      });
    } catch (err) {
      console.error(err);
      productList.innerHTML = '<p>Error loading products.</p>';
    }
  }

  // ✅ Delete product
  async function deleteProduct(id) {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      const res = await fetch(`${BACKEND}/api/agent-products/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.message || 'Delete failed');

      await fetchAgentProducts();
      alert('✅ Product deleted');
    } catch (err) {
      console.error(err);
      alert('❌ Failed to delete productierre: ' + err.message);
    }
  }

  function resetForm() {
    addProductForm.reset();
    document.getElementById('productId').value = '';
    currentPhotos = { existing: [], newFiles: [] };
    initializePhotoInterface();
  }

  // Edit product function
  window.editProduct = function(prod) {
    const formTitle = document.getElementById('formTitle');
    if (formTitle) formTitle.textContent = 'Edit Product';
    document.getElementById('productId').value = prod._id;
    document.getElementById('productName').value = prod.name;
    document.getElementById('productPrice').value = prod.price;
    document.getElementById('productDescription').value = prod.description || '';
    document.getElementById('productStock').value = prod.stock || 0;

    // Load existing images
    const allImages = [prod.image, ...(prod.images || [])].filter(Boolean);
    currentPhotos.existing = allImages.map((url, index) => ({
      url,
      id: `existing-${index}`,
      index
    }));
    currentPhotos.newFiles = [];
    
    renderPhotos();

    // Scroll to form
    document.querySelector('.product-form')?.scrollIntoView({ behavior: 'smooth' });
  };

  // Expose photo management functions for inline script access
  window.getCurrentPhotos = () => currentPhotos;
  window.deleteProduct = deleteProduct;

});
