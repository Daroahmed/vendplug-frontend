// Global Product Search Component
// This can be included in any page to add product search functionality

class GlobalSearch {
  constructor(containerId, options = {}) {
    this.containerId = containerId;
    this.options = {
      placeholder: 'Search for products across all vendors...',
      showSuggestions: true,
      maxSuggestions: 5,
      ...options
    };
    
    this.searchTimeout = null;
    this.init();
  }

  init() {
    const container = document.getElementById(this.containerId);
    if (!container) {
      console.error('GlobalSearch: Container not found:', this.containerId);
      return;
    }

    this.render(container);
    this.attachEventListeners();
  }

  render(container) {
    container.innerHTML = `
      <div class="global-search-container">
        <div class="global-search-box">
          <input type="text" 
                 id="globalSearchInput" 
                 placeholder="${this.options.placeholder}" 
                 class="global-search-input">
          <button class="global-search-btn" onclick="globalSearch.performSearch()">
            <i class="fas fa-search"></i>
          </button>
        </div>
        <div id="globalSearchSuggestions" class="global-search-suggestions"></div>
      </div>
    `;

    // Add styles if not already present
    this.addStyles();
  }

  addStyles() {
    if (document.getElementById('global-search-styles')) return;

    const style = document.createElement('style');
    style.id = 'global-search-styles';
    style.textContent = `
      .global-search-container {
        position: relative;
        max-width: 500px;
        margin: 0 auto;
      }

      .global-search-box {
        display: flex;
        background: var(--bg-card, #2a2a2a);
        border: 2px solid var(--border, #3a3a3a);
        border-radius: 25px;
        overflow: hidden;
        transition: all 0.3s ease;
      }

      .global-search-box:focus-within {
        border-color: var(--primary, #00cc99);
        box-shadow: 0 0 0 3px rgba(0, 204, 153, 0.1);
      }

      .global-search-input {
        flex: 1;
        padding: 0.75rem 1rem;
        border: none;
        background: transparent;
        color: var(--text-light, #ffffff);
        font-size: 0.9rem;
        outline: none;
      }

      .global-search-input::placeholder {
        color: var(--muted, #6c757d);
      }

      .global-search-btn {
        padding: 0.75rem 1rem;
        background: var(--primary, #00cc99);
        border: none;
        color: var(--text-light, #000);
        cursor: pointer;
        transition: all 0.3s ease;
      }

      .global-search-btn:hover {
        background: var(--primary-dark, #00b894);
      }

      .global-search-suggestions {
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        background: var(--bg-card, #2a2a2a);
        border: 1px solid var(--border, #3a3a3a);
        border-radius: 8px;
        margin-top: 4px;
        max-height: 300px;
        overflow-y: auto;
        z-index: 1000;
        display: none;
      }

      .global-suggestion-item {
        padding: 0.75rem 1rem;
        cursor: pointer;
        border-bottom: 1px solid var(--border, #3a3a3a);
        transition: background 0.2s ease;
      }

      .global-suggestion-item:hover {
        background: var(--bg-secondary, #1a1a1a);
      }

      .global-suggestion-item:last-child {
        border-bottom: none;
      }

      .global-suggestion-product {
        font-weight: 600;
        color: var(--text-light, #ffffff);
        margin-bottom: 0.25rem;
      }

      .global-suggestion-vendor {
        font-size: 0.8rem;
        color: var(--muted, #6c757d);
      }
    `;
    
    document.head.appendChild(style);
  }

  attachEventListeners() {
    const searchInput = document.getElementById('globalSearchInput');
    const suggestions = document.getElementById('globalSearchSuggestions');

    if (!searchInput) return;

    // Input event listener
    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.trim();
      
      clearTimeout(this.searchTimeout);
      
      if (query.length < 2) {
        this.hideSuggestions();
        return;
      }

      // Debounce search
      this.searchTimeout = setTimeout(() => {
        this.searchProducts(query);
      }, 300);
    });

    // Enter key listener
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.performSearch();
      }
    });

    // Click outside to hide suggestions
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.global-search-container')) {
        this.hideSuggestions();
      }
    });
  }

  async searchProducts(query) {
    if (!this.options.showSuggestions) return;

    try {
      const response = await fetch(`${window.BACKEND_URL || window.location.origin}/api/products/search?q=${encodeURIComponent(query)}&limit=${this.options.maxSuggestions}`);
      const data = await response.json();
      
      if (data.success && data.products.length > 0) {
        this.showSuggestions(data.products);
      } else {
        this.hideSuggestions();
      }
    } catch (error) {
      console.error('Search error:', error);
      this.hideSuggestions();
    }
  }

  showSuggestions(products) {
    const suggestions = document.getElementById('globalSearchSuggestions');
    if (!suggestions) return;

    suggestions.innerHTML = '';
    
    products.forEach(product => {
      const suggestionItem = document.createElement('div');
      suggestionItem.className = 'global-suggestion-item';
      suggestionItem.innerHTML = `
        <div class="global-suggestion-product">${product.name}</div>
        <div class="global-suggestion-vendor">by ${product.vendor?.shopName || product.agent?.shopName || 'Unknown'}</div>
      `;
      
      suggestionItem.addEventListener('click', () => {
        window.location.href = `product-detail.html?id=${product._id}`;
      });
      
      suggestions.appendChild(suggestionItem);
    });
    
    suggestions.style.display = 'block';
  }

  hideSuggestions() {
    const suggestions = document.getElementById('globalSearchSuggestions');
    if (suggestions) {
      suggestions.style.display = 'none';
    }
  }

  performSearch() {
    const searchInput = document.getElementById('globalSearchInput');
    if (!searchInput) return;

    const query = searchInput.value.trim();
    if (query.length >= 2) {
      window.location.href = `search-results.html?q=${encodeURIComponent(query)}`;
    }
  }
}

// Global instance for easy access
let globalSearch;

// Initialize global search when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  const searchContainer = document.getElementById('globalSearchContainer');
  if (searchContainer) {
    globalSearch = new GlobalSearch('globalSearchContainer');
  }
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GlobalSearch;
}
