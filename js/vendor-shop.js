console.log("✅ vendor-shop.js loaded");

const BACKEND = window.BACKEND_URL || "";
const urlParams = new URLSearchParams(window.location.search);
const vendorId = urlParams.get("vendorId");

const vendorShopName = document.getElementById("vendorShopName");
const vendorDetails = document.getElementById("vendorDetails");
const messageVendorBtn = document.getElementById("messageVendorBtn");
const vendorProducts = document.getElementById("vendorProducts");

async function loadVendorShop() {
  try {
    const res = await fetch(`${BACKEND}/api/vendors/${vendorId}`);
    const data = await res.json();

    vendorShopName.textContent = data.shopName;
    vendorDetails.innerHTML = `
      ${data.shopDescription || "No description"} <br/>
      <strong>Location:</strong> ${data.location}
    `;
    messageVendorBtn.onclick = () => {
      const phone = data.phoneNumber.replace(/\D/g, "");
      window.open(`https://wa.me/234${phone}`, "_blank");
    };

  } catch (err) {
    vendorShopName.textContent = "Vendor not found";
    vendorDetails.textContent = "";
    console.error("❌ Failed to load vendor info", err);
  }
}

async function loadVendorProducts() {
  try {
    const res = await fetch(`${BACKEND}/api/products/vendor/${vendorId}`);
    const products = await res.json();

    if (!products.length) {
      vendorProducts.innerHTML = "<p>No products listed yet.</p>";
      return;
    }

    vendorProducts.innerHTML = "";
    products.forEach(p => {
      const card = document.createElement("div");
      card.className = "product-card";

      card.innerHTML = `
        <img src="${p.image || '/img/no-image.png'}" alt="${p.name}" />
        <h4>${p.name}</h4>
        <p>₦${p.price.toLocaleString()}</p>
        <button onclick="addToCart('${p._id}')">Add to Cart</button>
      `;
      vendorProducts.appendChild(card);
    });

  } catch (err) {
    vendorProducts.innerHTML = "<p>Failed to load products.</p>";
    console.error("❌ Product load error", err);
  }
}

function addToCart(productId) {
  let cart = JSON.parse(localStorage.getItem("vendplugVendorCart") || "[]");
  cart.push({ productId, vendorId });
  localStorage.setItem("vendplugVendorCart", JSON.stringify(cart));
  alert("🛒 Added to cart!");
}

loadVendorShop();
loadVendorProducts();
