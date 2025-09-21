// Ad Manager - Handles ad display and interaction

// Add closest polyfill for older browsers
if (!Element.prototype.closest) {
  Element.prototype.closest = function(s) {
    var el = this;
    do {
      if (el.matches(s)) return el;
      el = el.parentElement || el.parentNode;
    } while (el !== null && el.nodeType === 1);
    return null;
  };
}

class AdManager {
  constructor() {
    this.ads = [];
    this.currentUserType = this.getCurrentUserType();
    this.currentPage = this.getCurrentPage();
    this.carouselIndex = 0;
    this.carouselInterval = null;
    
    this.init();
  }

  init() {
    this.loadAds();
    this.setupEventListeners();
  }

  getCurrentUserType() {
    // Determine user type from localStorage or URL
    if (localStorage.getItem('vendplug-admin-token')) return 'admin';
    if (localStorage.getItem('vendplug-staff-token')) return 'staff';
    if (localStorage.getItem('vendplug-vendor-token')) return 'vendor';
    if (localStorage.getItem('vendplug-agent-token')) return 'agent';
    if (localStorage.getItem('vendplug-buyer-token')) return 'buyer';
    return 'buyer'; // default
  }

  shouldLoadAds() {
    // Don't load ads on admin or staff pages
    const currentPage = this.getCurrentPage();
    const userType = this.getCurrentUserType();
    
    if (userType === 'admin' || userType === 'staff') {
      return false;
    }
    
    // Don't load ads on admin dashboard pages
    if (currentPage.includes('admin-dashboard') || 
        currentPage.includes('admin') || 
        currentPage.includes('staff')) {
      return false;
    }
    
    return true;
  }

  getCurrentPage() {
    // Determine current page from URL
    const path = window.location.pathname;
    if (path.includes('buyer-home')) return 'buyer-home';
    if (path.includes('agent-home')) return 'agent-home';
    if (path.includes('vendor-home')) return 'vendor-home';
    if (path.includes('shop')) return 'shop';
    if (path.includes('category')) return 'category';
    if (path.includes('product')) return 'product';
    if (path.includes('search')) return 'search';
    return 'home';
  }

  async loadAds() {
    // Don't load ads on admin/staff pages
    if (!this.shouldLoadAds()) {
      console.log('🚫 Ads disabled for admin/staff pages');
      return;
    }

    try {
      const response = await fetch(`/api/admin-ads/public/ads?userType=${this.currentUserType}&page=${this.currentPage}`);
      const data = await response.json();
      
      if (data.success) {
        this.ads = data.data;
        this.renderAds();
      }
    } catch (error) {
      console.error('Error loading ads:', error);
    }
  }

  renderAds() {
    // Clear all existing ad containers first to prevent duplicates
    this.clearAllAdContainers();
    
    // Group ads by type and position
    const adsByType = this.groupAdsByType();
    const adsByPosition = this.groupAdsByPosition();
    
    // Render ads by type (for backward compatibility)
    this.renderBannerAds(adsByType.banner);
    this.renderCarouselAds(adsByType.carousel);
    this.renderInlineAds(adsByType.inline);
    this.renderPopupAds(adsByType.popup);
    
    // Render ads by position (only for ads that don't have a specific type-based renderer)
    this.renderAdsByPosition(adsByPosition);
  }

  clearAllAdContainers() {
    // Remove all existing ad containers to prevent duplicates
    const adContainers = document.querySelectorAll(`
      .ad-banner-container,
      .ad-carousel-container,
      .ad-hero-container,
      .ad-top-container,
      .ad-middle-container,
      .ad-bottom-container,
      .ad-sidebar-container,
      .ad-inline
    `);
    
    adContainers.forEach(container => {
      container.remove();
    });
  }

  groupAdsByType() {
    const grouped = {
      banner: [],
      carousel: [],
      inline: [],
      popup: []
    };

    this.ads.forEach(ad => {
      if (grouped[ad.type]) {
        grouped[ad.type].push(ad);
      }
    });

    return grouped;
  }

  groupAdsByPosition() {
    const grouped = {
      hero: [],
      top: [],
      middle: [],
      bottom: [],
      sidebar: [],
      popup: []
    };

    this.ads.forEach(ad => {
      if (grouped[ad.position]) {
        grouped[ad.position].push(ad);
      }
    });

    return grouped;
  }

  renderBannerAds(bannerAds) {
    if (!bannerAds.length) return;

    // Find or create banner container
    let container = document.querySelector('.ad-banner-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'ad-banner-container';
      
      // Insert at the top of main content
      const main = document.querySelector('main') || document.querySelector('.main-content');
      if (main) {
        main.insertBefore(container, main.firstChild);
      }
    }

    container.innerHTML = bannerAds.map(ad => this.createAdHTML(ad)).join('');
  }

  renderCarouselAds(carouselAds) {
    if (!carouselAds.length) return;

    // Find or create carousel container
    let container = document.querySelector('.ad-carousel-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'ad-carousel-container';
      
      // Insert at the top of main content
      const main = document.querySelector('main') || document.querySelector('.main-content');
      if (main) {
        main.insertBefore(container, main.firstChild);
      }
    }

    container.innerHTML = `
      <div class="ad-carousel">
        <div class="ad-carousel-track">
          ${carouselAds.map(ad => this.createAdHTML(ad)).join('')}
        </div>
        <div class="ad-carousel-controls">
          <button class="ad-carousel-prev">‹</button>
          <button class="ad-carousel-next">›</button>
        </div>
        <div class="ad-carousel-dots">
          ${carouselAds.map((_, index) => `<button class="ad-carousel-dot ${index === 0 ? 'active' : ''}" data-index="${index}"></button>`).join('')}
        </div>
      </div>
    `;

    this.initCarousel();
  }

  renderInlineAds(inlineAds) {
    if (!inlineAds.length) return;

    // Find category sections and product containers
    const containers = document.querySelectorAll('.category-section, .products-grid, .product-list, .category-scroll, .vendor-grid, .vendor-combined-layout, .agent-grid, .shop-grid');
    
    containers.forEach((container, containerIndex) => {
      // For category sections, insert ads between category groups
      if (container.classList.contains('category-section')) {
        this.insertInlineAdsInCategorySection(container, inlineAds, containerIndex);
      }
      // For product/vendor grids, insert ads between items
      else {
        this.insertInlineAdsInProductGrid(container, inlineAds, containerIndex);
      }
    });
  }

  insertInlineAdsInCategorySection(container, inlineAds, containerIndex) {
    // Insert ads at the end of each main category section (after the category-scroll)
    // Only show ads on every 2nd or 3rd category section to avoid over-saturation
    const categoryScroll = container.querySelector('.category-scroll');
    if (categoryScroll && containerIndex % 2 === 0) { // Every 2nd category section
      const adIndex = containerIndex % inlineAds.length;
      const ad = inlineAds[adIndex];
      
      const adElement = document.createElement('div');
      adElement.className = 'ad-inline ad-inline-category';
      adElement.innerHTML = this.createAdHTML(ad);
      
      // Insert after the category-scroll container
      categoryScroll.parentNode.insertBefore(adElement, categoryScroll.nextSibling);
    }
  }

  insertInlineAdsInProductGrid(container, inlineAds, containerIndex) {
    // Professional inline ad frequency based on page type
    const products = container.querySelectorAll('.product-card, .order-card, .item-card, .vendor-card, .shop-card, .agent-card, .business-card');
    if (products.length < 4) return; // Don't show ads if too few items
    
    // Determine ad frequency based on page type
    let adInterval;
    const currentPage = this.getCurrentPage();
    
    if (currentPage.includes('shop') || currentPage.includes('business')) {
      // Shop pages: every 8-10 products (professional e-commerce standard)
      adInterval = Math.min(10, Math.max(8, Math.floor(products.length / 3)));
    } else if (currentPage.includes('search')) {
      // Search results: every 6-8 results
      adInterval = Math.min(8, Math.max(6, Math.floor(products.length / 2)));
    } else {
      // Other pages: every 6-8 items
      adInterval = Math.min(8, Math.max(6, Math.floor(products.length / 2)));
    }
    
    // Insert ads at calculated intervals
    for (let i = adInterval; i < products.length; i += adInterval) {
      const adIndex = (containerIndex * 10 + i) % inlineAds.length;
      const ad = inlineAds[adIndex];
      
      const adElement = document.createElement('div');
      adElement.className = 'ad-inline ad-inline-product';
      adElement.innerHTML = this.createAdHTML(ad);
      
      products[i].parentNode.insertBefore(adElement, products[i]);
    }
  }

  renderAdsByPosition(adsByPosition) {
    // Only render position-based ads for types that don't have specific renderers
    // This prevents double-rendering of banner, carousel, inline, and popup ads
    
    // Hero position - at the very top (for any ad type)
    if (adsByPosition.hero.length) {
      this.renderHeroAds(adsByPosition.hero);
    }
    
    // Top position - after header, before main content (for any ad type)
    if (adsByPosition.top.length) {
      this.renderTopAds(adsByPosition.top);
    }
    
    // Middle position - between content sections (for any ad type)
    if (adsByPosition.middle.length) {
      this.renderMiddleAds(adsByPosition.middle);
    }
    
    // Bottom position - at the bottom of main content (for any ad type)
    if (adsByPosition.bottom.length) {
      this.renderBottomAds(adsByPosition.bottom);
    }
    
    // Sidebar position - in sidebar if available (for any ad type)
    if (adsByPosition.sidebar.length) {
      this.renderSidebarAds(adsByPosition.sidebar);
    }
    
    // Popup position - handled by renderPopupAds, so skip here to avoid duplicates
  }

  renderHeroAds(heroAds) {
    let container = document.querySelector('.ad-hero-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'ad-hero-container';
      
      // Insert at the very top of the page
      const body = document.body;
      body.insertBefore(container, body.firstChild);
    }
    
    container.innerHTML = heroAds.map(ad => this.createAdHTML(ad)).join('');
  }

  renderTopAds(topAds) {
    let container = document.querySelector('.ad-top-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'ad-top-container';
      
      // Insert after header, before main content
      const main = document.querySelector('main') || document.querySelector('.main-content');
      if (main) {
        main.insertBefore(container, main.firstChild);
      }
    }
    
    container.innerHTML = topAds.map(ad => this.createAdHTML(ad)).join('');
  }

  renderMiddleAds(middleAds) {
    // Middle ads are handled by inline ads logic
    this.renderInlineAds(middleAds);
  }

  renderBottomAds(bottomAds) {
    let container = document.querySelector('.ad-bottom-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'ad-bottom-container';
      
      // Insert at the bottom of main content
      const main = document.querySelector('main') || document.querySelector('.main-content');
      if (main) {
        main.appendChild(container);
      }
    }
    
    container.innerHTML = bottomAds.map(ad => this.createAdHTML(ad)).join('');
  }

  renderSidebarAds(sidebarAds) {
    let container = document.querySelector('.ad-sidebar-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'ad-sidebar-container';
      
      // Insert in sidebar if available, otherwise create a floating sidebar
      const sidebar = document.querySelector('.sidebar, .side-nav, .navigation');
      if (sidebar) {
        sidebar.appendChild(container);
      } else {
        // Create floating sidebar
        container.style.cssText = `
          position: fixed;
          right: 20px;
          top: 50%;
          transform: translateY(-50%);
          width: 300px;
          z-index: 1000;
        `;
        document.body.appendChild(container);
      }
    }
    
    container.innerHTML = sidebarAds.map(ad => this.createAdHTML(ad)).join('');
  }

  renderPopupAds(popupAds) {
    if (!popupAds.length) return;

    popupAds.forEach(ad => {
      if (this.shouldShowPopup(ad)) {
        this.showPopupAd(ad);
      }
    });
  }

  shouldShowPopup(ad) {
    // Check if popup should be shown based on settings
    if (ad.popupSettings.showOnFirstVisit && !localStorage.getItem('hasVisited')) {
      return true;
    }
    
    if (ad.popupSettings.showOnLogin && this.isLoginPage()) {
      return true;
    }

    // Check if already shown in this session
    if (ad.popupSettings.showOncePerSession && sessionStorage.getItem(`ad-shown-${ad._id}`)) {
      return false;
    }

    return true;
  }

  isLoginPage() {
    return window.location.pathname.includes('login') || 
           window.location.pathname.includes('register');
  }

  showPopupAd(ad) {
    const popup = document.createElement('div');
    popup.className = 'ad-popup-overlay';
    popup.innerHTML = `
      <div class="ad-popup">
        <button class="ad-popup-close">×</button>
        <div class="ad-popup-content">
          ${this.createAdHTML(ad)}
        </div>
      </div>
    `;

    document.body.appendChild(popup);

    // Auto close if specified
    if (ad.popupSettings.autoClose > 0) {
      setTimeout(() => {
        this.closePopup(popup);
      }, ad.popupSettings.autoClose);
    }

    // Show delay
    setTimeout(() => {
      popup.style.opacity = '1';
    }, ad.popupSettings.showDelay || 0);

    // Mark as shown
    sessionStorage.setItem(`ad-shown-${ad._id}`, 'true');
  }

  closePopup(popup) {
    popup.style.opacity = '0';
    setTimeout(() => {
      popup.remove();
    }, 300);
  }

  createAdHTML(ad) {
    const clickHandler = `adManager.handleAdClick('${ad._id}')`;
    
    return `
      <div class="ad-item ad-${ad.type}" data-ad-id="${ad._id}">
        <div class="ad-image" onclick="${clickHandler}">
          <img src="${ad.image}" alt="${ad.imageAlt || ad.title}" loading="lazy">
        </div>
        <div class="ad-content">
          <h3 class="ad-title">${ad.title}</h3>
          ${ad.description ? `<p class="ad-description">${ad.description}</p>` : ''}
          ${ad.link ? `<a href="${ad.link}" class="ad-link" onclick="${clickHandler}">${ad.linkText}</a>` : ''}
        </div>
      </div>
    `;
  }

  initCarousel() {
    const track = document.querySelector('.ad-carousel-track');
    const prevBtn = document.querySelector('.ad-carousel-prev');
    const nextBtn = document.querySelector('.ad-carousel-next');
    const dots = document.querySelectorAll('.ad-carousel-dot');

    if (!track) return;

    const ads = track.querySelectorAll('.ad-item');
    const totalAds = ads.length;
    let currentIndex = 0;

    const updateCarousel = () => {
      const translateX = -currentIndex * 100;
      track.style.transform = `translateX(${translateX}%)`;
      
      dots.forEach((dot, index) => {
        dot.classList.toggle('active', index === currentIndex);
      });
    };

    const nextSlide = () => {
      currentIndex = (currentIndex + 1) % totalAds;
      updateCarousel();
    };

    const prevSlide = () => {
      currentIndex = (currentIndex - 1 + totalAds) % totalAds;
      updateCarousel();
    };

    // Event listeners
    nextBtn?.addEventListener('click', nextSlide);
    prevBtn?.addEventListener('click', prevSlide);
    
    dots.forEach((dot, index) => {
      dot.addEventListener('click', () => {
        currentIndex = index;
        updateCarousel();
      });
    });

    // Auto play
    const carouselAds = this.ads.filter(ad => ad.type === 'carousel');
    if (carouselAds.length > 0 && carouselAds[0].carouselSettings.autoPlay) {
      this.carouselInterval = setInterval(nextSlide, carouselAds[0].carouselSettings.autoPlayInterval || 5000);
    }
  }

  async handleAdClick(adId) {
    try {
      await fetch(`/api/admin-ads/public/ads/${adId}/click`, {
        method: 'POST'
      });
    } catch (error) {
      console.error('Error recording ad click:', error);
    }
  }

  setupEventListeners() {
    // Close popup ads
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('ad-popup-close')) {
        const popupOverlay = e.target.closest ? e.target.closest('.ad-popup-overlay') : e.target.parentElement.closest('.ad-popup-overlay');
        if (popupOverlay) {
          this.closePopup(popupOverlay);
        }
      }
    });

    // Pause carousel on hover
    document.addEventListener('mouseenter', (e) => {
      if (e.target && e.target.closest && e.target.closest('.ad-carousel')) {
        clearInterval(this.carouselInterval);
      }
    }, true);

    document.addEventListener('mouseleave', (e) => {
      if (e.target && e.target.closest && e.target.closest('.ad-carousel')) {
        const carouselAds = this.ads.filter(ad => ad.type === 'carousel');
        if (carouselAds.length > 0 && carouselAds[0].carouselSettings.autoPlay) {
          this.carouselInterval = setInterval(() => {
            const nextBtn = document.querySelector('.ad-carousel-next');
            if (nextBtn) nextBtn.click();
          }, carouselAds[0].carouselSettings.autoPlayInterval || 5000);
        }
      }
    }, true);
  }

  destroy() {
    if (this.carouselInterval) {
      clearInterval(this.carouselInterval);
    }
  }

  // Method to refresh ads (can be called externally)
  refreshAds() {
    this.loadAds();
  }
}

// Initialize ad manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.adManager = new AdManager();
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  if (window.adManager) {
    window.adManager.destroy();
  }
});
