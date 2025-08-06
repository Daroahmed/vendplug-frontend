console.log("🛒 buyer-cart.js loaded");

const BACKEND = window.BACKEND_URL || "";
const cartContainer = document.getElementById("cartContainer");

const cart = JSON.parse(localStorage.getItem("vendplugVendorCart") || "[]");

// Group by vendorId
const grouped = {};
cart.forEach(item => {
  if (!grouped[item.vendorId]) grouped[item.vendorId] = [];
  grouped[item.vendorId].push(item.productId);
});

async function loadCart() {
  if (cart.length === 0) {
    cartContainer.innerHTML = "<p>Your cart is empty.</p>";
    return;
  }

  for (const vendorId in grouped) {
    try {
      const vendorRes = await fetch(`${BACKEND}/api/vendors/${vendorId}`);
      const vendor = await vendorRes.json();

      const productPromises = grouped[vendorId].map(id =>
        fetch(`${BACKEND}/api/products/${id}`).then(res => res.json())
      );
      const products = await Promise.all(productPromises);

      const groupDiv = document.createElement("div");
      groupDiv.className = "vendor-group";

      groupDiv.innerHTML = `
        <h3 class="vendor-title">${vendor.shopName}</h3>
        <div class="cart-items">
          ${products.map(p => `
            <div class="cart-item">
              <img src="${p.image || '/img/no-image.png'}" alt="${p.name}" />
              <div class="cart-item-details">
                <h4>${p.name}</h4>
                <p>₦${p.price.toLocaleString()}</p>
              </div>
            </div>
          `).join('')}
        </div>
        <button class="place-order-btn" onclick='placeOrder("${vendorId}")'>Place Order</button>
      `;

      cartContainer.appendChild(groupDiv);
    } catch (err) {
      console.error("❌ Error loading vendor cart:", err);
    }
  }
}

async function placeOrder(vendorId) {
  const token = localStorage.getItem("vendplug-token");
  if (!token) return alert("Please log in first");

  const productIds = grouped[vendorId];

  try {
    const res = await fetch(`${BACKEND}/api/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ vendorId, productIds })
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || "Order failed");
    }

    // Remove only this vendor’s items from cart
    const updatedCart = cart.filter(item => item.vendorId !== vendorId);
    localStorage.setItem("vendplugVendorCart", JSON.stringify(updatedCart));
    alert("✅ Order placed!");
    window.location.reload();

  } catch (err) {
    console.error("❌ Order error:", err);
    alert("Failed to place order.");
  }
}

loadCart();
