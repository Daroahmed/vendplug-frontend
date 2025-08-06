// /frontend/js/buyer-vendors-category.js

document.addEventListener("DOMContentLoaded", async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const selectedCategory = urlParams.get("category") || "all";

    const title = document.getElementById("categoryTitle");
    const vendorList = document.getElementById("vendorList");
    const stateFilter = document.getElementById("stateFilter");
  
    const formatCategory = str => str ? str.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : "All Categories";

    title.textContent = `Vendors in ${formatCategory(selectedCategory)}`;
  
    async function fetchVendors(state = "") {
      vendorList.innerHTML = "<p class='col-span-full text-center'>Loading vendors...</p>";
      try {
        const res = await fetch(`/api/vendors?category=${selectedCategory}${state ? `&state=${state}` : ""}`);
        const vendors = await res.json();
  
        vendorList.innerHTML = "";
  
        if (!vendors.length) {
          vendorList.innerHTML = "<p class='col-span-full text-center'>No vendors found.</p>";
          return;
        }
  
        vendors.forEach(v => {
          const card = document.createElement("div");
          card.className = "border rounded-lg shadow-md overflow-hidden";
          card.innerHTML = `
            <img src="${v.image || '/img/default-vendor.jpg'}" alt="${v.name}" class="w-full h-40 object-cover"/>
            <div class="p-3">
              <h3 class="font-bold text-lg">${v.name}</h3>
              <p class="text-sm text-gray-600">${v.location}</p>
              <p class="text-sm mt-1">${v.shopDescription || ""}</p>
              <button onclick="window.location.href='/vendor-shop.html?vendorId=${v._id}'"
                      class="mt-3 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                View Shop
              </button>
            </div>
          `;
          vendorList.appendChild(card);
        });
      } catch (err) {
        vendorList.innerHTML = "<p class='col-span-full text-center text-red-600'>Error loading vendors.</p>";
      }
    }
  
    stateFilter.addEventListener("change", (e) => {
      fetchVendors(e.target.value);
    });
  
    fetchVendors(); // initial load
  });
  