document.addEventListener('DOMContentLoaded', () => {
  let agent = (typeof getCurrentUserOfRole === 'function' ? getCurrentUserOfRole('agent') : null) || getCurrentUser();
  let token = (typeof getAuthTokenForRole === 'function' ? getAuthTokenForRole('agent') : null) || getAuthToken();
  const BACKEND = window.BACKEND_URL || "";

  if (!token) {
    alert('Unauthorized. Please log in again.');
    redirectToLogin();
    return;
  }

  const addProductForm = document.getElementById('addProductForm');
  const productList = document.getElementById('productList');
  const categorySelect = document.getElementById('productCategory');
  const categoryChips = document.getElementById('productCategoryChips');
  const preparingEl = document.getElementById('profilePreparing');
  const submitBtnGlobal = document.querySelector('.submit-btn');
  const photosContainer = document.getElementById('photosContainer');
  const photoCount = document.getElementById('photoCount');
  const imageInput = document.getElementById('productImages');
  const isiOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  let formReady = false;

  // Store for managing photos (both existing URLs and new files)
  let currentPhotos = {
    existing: [], // Array of {url, index} for existing images from DB
    newFiles: [] // Array of File objects for newly selected images
  };

  // Bootstrap: ensure agent profile is ready, then render categories and load data
  (async function init() {
    try {
      if (preparingEl) preparingEl.classList.remove('hidden');
      if (submitBtnGlobal) submitBtnGlobal.disabled = true;

      await ensureAgentProfileReady();

      // Render categories as read-only chips and hide native select (iOS shows "2 items")
      if (categorySelect) {
        const categories = Array.isArray(agent?.category) ? agent.category : (agent?.category ? [agent.category] : []);
        if (categories.length) {
          try { categorySelect.multiple = true; } catch(_) {}
          try { categorySelect.size = Math.min(6, Math.max(3, categories.length)); } catch(_) {}
          try { categorySelect.disabled = true; } catch(_) {}
          categorySelect.innerHTML = categories.map(cat => `<option value="${cat}" selected>${cat}</option>`).join('');
          renderCategoryChips(categories);
          try { categorySelect.classList.add('hidden'); } catch(_) {}
        } else {
          categorySelect.innerHTML = `<option value="" selected>No category found</option>`;
          if (categoryChips) {
            categoryChips.classList.add('hidden');
            categoryChips.innerHTML = '';
          }
        }
      }

      fetchAgentProducts();
      initializePhotoInterface();

      formReady = true;
    } finally {
      if (submitBtnGlobal) submitBtnGlobal.disabled = !formReady;
      if (preparingEl) preparingEl.classList.add('hidden');
    }
  })();

  function renderCategoryChips(categories) {
    if (!categoryChips) return;
    categoryChips.innerHTML = categories.map(c => `<span class="chip">${c}</span>`).join('');
    categoryChips.classList.remove('hidden');
  }

  async function ensureAgentProfileReady() {
    try {
      const r = await fetch(`${BACKEND}/api/agents/profile?force=1`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (r.status === 401) {
        const rr = await fetch(`${BACKEND}/api/auth/refresh`, { method: 'POST', credentials: 'include' });
        if (rr.ok) {
          const data = await rr.json().catch(() => ({}));
          if (data && data.token) {
            localStorage.setItem('vendplug-agent-token', data.token);
            token = data.token;
            const r2 = await fetch(`${BACKEND}/api/agents/profile?force=1`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            if (r2.ok) {
              const prof = await r2.json().catch(() => ({}));
              if (prof && prof.agent) {
                agent = prof.agent;
                localStorage.setItem('vendplugAgent', JSON.stringify(agent));
                return;
              }
            }
          }
        }
      } else if (r.ok) {
        const prof = await r.json().catch(() => ({}));
        if (prof && prof.agent) {
          agent = prof.agent;
          localStorage.setItem('vendplugAgent', JSON.stringify(agent));
          return;
        }
      }
      // If all fails, continue with cached agent
    } catch (_) {
      // Network issue: continue with cached agent
    }
  }

  // ✅ Form submission (guard against double-binding if inline script also binds)
  if (!window.__agentProductsSubmitBound) {
    window.__agentProductsSubmitBound = true;
    addProductForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!formReady) {
        if (typeof showOverlay === 'function') {
          return showOverlay({ type:'info', title:'Please wait', message:'Preparing your account. Try again in a moment.' });
        }
        return alert('Please wait while your account is prepared. Try again shortly.');
      }
      submitProduct();
    });
  }

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
    if (window.__agentSubmitting) {
      return;
    }
    window.__agentSubmitting = true;
    const id = document.getElementById('productId').value;
    const name = document.getElementById('productName').value;
    const price = Number(document.getElementById('productPrice').value);
    const description = document.getElementById('productDescription').value;
    const stock = Number(document.getElementById('productStock').value);
    // Determine categories from select (supports single or multiple); fallback to agent profile
    let selectedCategories = [];
    if (categorySelect) {
      if (categorySelect.multiple) {
        selectedCategories = Array.from(categorySelect.selectedOptions).map(o => o.value).filter(Boolean);
      } else {
        if (categorySelect.value) selectedCategories = [categorySelect.value];
      }
    }
    if (!selectedCategories.length) {
      const fromProfile = Array.isArray(agent?.category) ? agent.category : (agent?.category ? [agent.category] : []);
      selectedCategories = fromProfile.filter(Boolean);
    }

    if (!selectedCategories.length) {
      const msg = 'Please select at least one category before saving.';
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
    // Backward compatibility: send single 'category' plus 'categories' array
    formData.append('category', selectedCategories[0]);
    formData.append('categories', JSON.stringify(selectedCategories));

    // Handle photo updates
    if (id) {
      // Updating existing product
      // Build keep list and primary decision from current UI state
      const keptAdditionalUrls = (currentPhotos.existing || [])
        .filter(p => !p.isPrimary)
        .map(p => p.url);
      const keepPrimary = (currentPhotos.existing || []).some(p => p.isPrimary);

      // Send explicit kept additional images and primary decision
      formData.append('keptAdditionalImages', JSON.stringify(keptAdditionalUrls));
      formData.append('keepPrimary', keepPrimary ? 'true' : 'false');

      // If there are existing photos kept, hint backend to preserve primary when adding more
      if (keepPrimary) {
        formData.append('keepExistingImages', 'true');
        formData.append('preservePrimary', 'true');
      }
      
      // If we want to clear all images and replace them
      if (currentPhotos.existing.length === 0 && currentPhotos.newFiles.length > 0) {
        formData.append('clearImages', 'true');
        // No primary yet – allow first upload to become primary
        // (do not append preservePrimary)
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

      // Force onboarding progress refresh (first product step)
      try {
        await fetch(`${BACKEND}/api/agents/profile?force=1`, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch (_) {}
      
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
      window.__agentSubmitting = false;
    }
  }

  async function fetchAgentProducts() {
    try {
      // Lightweight retry with backoff; avoids parsing HTML error pages as JSON
      const fetchWithRetry = async (url, opts, attempts = 3) => {
        let lastErr;
        for (let i = 0; i < attempts; i++) {
          try {
            const r = await fetch(url, { cache: 'no-store', ...opts });
            if (!r.ok) {
              const txt = await r.text().catch(() => '');
              if (r.status >= 500 || r.status === 429 || r.status === 502 || r.status === 503 || r.status === 504) {
                lastErr = new Error(`Upstream error ${r.status}`);
              } else {
                throw new Error(`Request failed (${r.status}): ${txt || r.statusText}`);
              }
            } else {
              try {
                return await r.json();
              } catch (_) {
                throw new Error('Bad response format');
              }
            }
          } catch (e) {
            lastErr = e;
          }
          const delay = [300, 800, 1500][i] || 1500;
          await new Promise(r => setTimeout(r, delay));
        }
        throw lastErr || new Error('Request failed');
      };

      const products = await fetchWithRetry(`${BACKEND}/api/agent-products/mine`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      productList.innerHTML = '';
      if (!Array.isArray(products) || !products.length) {
        productList.innerHTML = `
          <div class="no-products">
            <i class="fas fa-box-open" style="font-size: 3rem; margin-bottom: 15px;"></i>
            <p>You haven't added any products yet</p>
            <p>Use the form above to add your first product</p>
          </div>
        `;
        return;
      }

      products.forEach(product => {
        const productCard = document.createElement('div');
        productCard.className = 'product-card';

        const thumb = product.image ? (window.optimizeImage ? optimizeImage(product.image, 640) : product.image) : null;
        productCard.innerHTML = `
          <div class="card-media">
            ${thumb ? `<img class="card-img" src="${thumb}" alt="${product.name}">` : `<div class="card-img" style="display:flex;align-items:center;justify-content:center;font-weight:700;color:var(--muted);">No Image</div>`}
            <span class="price-chip">₦${Number(product.price || 0).toLocaleString()}</span>
          </div>
          <div class="product-info">
            <h3 class="product-name">${product.name}</h3>
            <p class="product-description">${product.description || ''}</p>
            <div class="product-meta">
              <span>Category: ${Array.isArray(product.category) ? product.category.join(', ') : (product.category || '')}</span>
              <span>Stock: ${(() => {
                const stock = Number(product.stock ?? 0);
                const reserved = Number(product.reserved ?? 0);
                const available = Math.max(0, stock - reserved);
                return available <= 0 ? 'Out of Stock' : available;
              })()}</span>
            </div>
            <div class="product-actions">
              <button class="action-btn edit-btn" data-id="${product._id}">
                <i class="fa-solid fa-pen-to-square"></i> Edit
              </button>
              <button class="action-btn delete-btn" data-id="${product._id}">
                <i class="fa-solid fa-trash"></i> Delete
              </button>
            </div>
          </div>
        `;
        productList.appendChild(productCard);
      });

      // Attach handlers after render for consistent behavior
      document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const id = e.currentTarget.dataset.id;
          try {
            const r = await fetch(`${BACKEND}/api/agent-products/${id}`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            if (!r.ok) {
              const txt = await r.text().catch(()=>'');
              throw new Error(txt || `Failed to load product (${r.status})`);
            }
            const product = await r.json();
            if (window.editProduct) {
              window.editProduct(product);
            }
          } catch (err) {
            console.error(err);
            if (typeof showOverlay === 'function') {
              showOverlay({ type:'error', title:'Error', message:'Error loading product details' });
            } else {
              alert('Error loading product details');
            }
          }
        });
      });

      document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const id = e.currentTarget.dataset.id;
          deleteProduct(id);
        });
      });
    } catch (err) {
      console.error(err);
      productList.innerHTML = `
        <div class="no-products">
          <i class="fas fa-exclamation-triangle" style="font-size: 3rem; margin-bottom: 15px;"></i>
          <p>Error loading products</p>
          <p>Please try again later</p>
        </div>
      `;
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

      if (!res.ok) {
        const txt = await res.text().catch(()=>'');
        throw new Error(txt || 'Delete failed');
      }
      const result = await res.json().catch(()=>({}));

      await fetchAgentProducts();
      alert('✅ Product deleted');
    } catch (err) {
      console.error(err);
      alert('❌ Failed to delete product: ' + err.message);
    }
  }

  function resetForm() {
    addProductForm.reset();
    document.getElementById('productId').value = '';
    currentPhotos = { existing: [], newFiles: [] };
    initializePhotoInterface();

    // Restore UI labels
    const formTitle = document.getElementById('formTitle');
    if (formTitle) formTitle.textContent = 'Add New Product';
    const submitText = document.getElementById('submitButtonText');
    if (submitText) submitText.textContent = 'Add Product';
  }

  // Edit product function
  window.editProduct = function(prod) {
    const formTitle = document.getElementById('formTitle');
    if (formTitle) formTitle.textContent = 'Edit Product';
    const submitText = document.getElementById('submitButtonText');
    if (submitText) submitText.textContent = 'Update Product';

    // Ensure form is visible when editing
    const toggleBtn = document.getElementById('toggleForm');
    if (addProductForm && addProductForm.classList.contains('hidden')) {
      addProductForm.classList.remove('hidden');
      if (toggleBtn) toggleBtn.innerHTML = '<i class="fas fa-times"></i> Close Form';
    }
    document.getElementById('productId').value = prod._id;
    document.getElementById('productName').value = prod.name;
    document.getElementById('productPrice').value = prod.price;
    document.getElementById('productDescription').value = prod.description || '';
    document.getElementById('productStock').value = prod.stock || 0;

    // Load existing images (mark primary for precise update semantics)
    const allImages = [prod.image, ...(prod.images || [])].filter(Boolean);
    currentPhotos.existing = allImages.map((url, index) => ({
      url,
      id: `existing-${index}`,
      index,
      isPrimary: index === 0 && url === prod.image
    }));
    currentPhotos.newFiles = [];
    
    renderPhotos();

    // Scroll to form
    document.querySelector('.product-form')?.scrollIntoView({ behavior: 'smooth' });
  };

  // Expose photo management functions for inline script access
  window.getCurrentPhotos = () => currentPhotos;
  window.deleteProduct = deleteProduct;

  // Toggle form visibility
  const toggleFormButton = document.getElementById('toggleForm');
  if (toggleFormButton) {
    toggleFormButton.addEventListener('click', () => {
      addProductForm.classList.toggle('hidden');
      toggleFormButton.innerHTML = addProductForm.classList.contains('hidden')
        ? '<i class="fas fa-plus"></i> Show Form'
        : '<i class="fas fa-times"></i> Close Form';
    });
  }

});
