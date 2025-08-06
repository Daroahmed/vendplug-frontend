// /frontend/js/buyer-vendors.js

document.addEventListener("DOMContentLoaded", () => {
    const container = document.getElementById("categoryContainer");
  
    vendorCategories.forEach(category => {
      const card = document.createElement("div");
      card.className = "border rounded-xl overflow-hidden shadow-md cursor-pointer hover:scale-105 transition-transform";
      card.innerHTML = `
        <img src="${category.image}" alt="${category.name}" class="w-full h-32 object-cover"/>
        <div class="p-2 text-center font-semibold">${category.name}</div>
      `;
      card.onclick = () => {
        window.location.href = `/buyer-vendors-category.html?category=${category.slug}`;
      };
      container.appendChild(card);
    });
  });
  