console.log("📦 buyer-vendor-orders.js loaded");

const BACKEND = window.BACKEND_URL || "";
const container = document.getElementById("vendorOrdersContainer");
const token = localStorage.getItem("vendplug-token");

if (!token) {
  container.innerHTML = "<p>Please log in to view your orders.</p>";
} else {
  fetchOrders();
}

async function fetchOrders() {
  try {
    const res = await fetch(`${BACKEND}/api/orders/buyer`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await res.json();

    if (!res.ok) throw new Error(data.message);

    if (!data.length) {
      container.innerHTML = "<p>You haven’t placed any vendor orders yet.</p>";
      return;
    }

    container.innerHTML = "";

    data.reverse().forEach(order => {
      const card = document.createElement("div");
      card.className = "order-card";

      const vendorName = order.vendor?.shopName || "Unknown Vendor";
      const statusClass = order.status.toLowerCase();

      card.innerHTML = `
        <div class="order-header">
          <h3>${vendorName}</h3>
          <span class="status-badge ${statusClass}">${order.status}</span>
        </div>
        <div class="product-list">
          ${order.products.map(p => `<p>• ${p.name} - ₦${p.price.toLocaleString()}</p>`).join("")}
        </div>
        <p style="font-size: 0.8rem; margin-top: 0.5rem;">🗓 ${new Date(order.createdAt).toLocaleString()}</p>
      `;

      container.appendChild(card);
    });

  } catch (err) {
    console.error("❌ Failed to load orders:", err);
    container.innerHTML = "<p>Error loading orders.</p>";
  }
}
