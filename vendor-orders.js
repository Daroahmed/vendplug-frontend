console.log("🧾 vendor-orders.js loaded");

const BACKEND = window.BACKEND_URL || "";
const container = document.getElementById("vendorOrdersContainer");
const token = localStorage.getItem("vendplug-token");

if (!token) {
  container.innerHTML = "<p>Please log in to view your orders.</p>";
} else {
  loadVendorOrders();
}

async function loadVendorOrders() {
  try {
    const res = await fetch(`${BACKEND}/api/orders/vendor`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const orders = await res.json();
    if (!res.ok) throw new Error(orders.message);

    if (!orders.length) {
      container.innerHTML = "<p>No buyer orders yet.</p>";
      return;
    }

    container.innerHTML = "";

    orders.reverse().forEach(order => {
      const card = document.createElement("div");
      card.className = "order-card";

      const statusClass = order.status.toLowerCase();

      card.innerHTML = `
        <div class="order-header">
          <h3>Buyer: ${order.buyer?.fullName || "Unknown"}</h3>
          <span class="status-badge ${statusClass}">${order.status}</span>
        </div>
        <div class="product-list">
          ${order.products.map(p => `<p>• ${p.name} - ₦${p.price.toLocaleString()}</p>`).join("")}
        </div>
        <p style="font-size: 0.8rem; margin-top: 0.5rem;">🕒 ${new Date(order.createdAt).toLocaleString()}</p>
        <div class="action-buttons">
          ${order.status === "pending" ? `
            <button class="accept-btn" onclick="updateStatus('${order._id}', 'accepted')">Accept</button>
            <button class="reject-btn" onclick="updateStatus('${order._id}', 'rejected')">Reject</button>
          ` : ""}
          ${order.status === "accepted" ? `
            <button class="fulfill-btn" onclick="updateStatus('${order._id}', 'fulfilled')">Mark as Fulfilled</button>
          ` : ""}
        </div>
      `;

      container.appendChild(card);
    });

  } catch (err) {
    console.error("❌ Error loading vendor orders:", err);
    container.innerHTML = "<p>Could not load orders.</p>";
  }
}

async function updateStatus(orderId, newStatus) {
  try {
    const res = await fetch(`${BACKEND}/api/orders/${orderId}/status`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ status: newStatus })
    });

    const data = await res.json();

    if (!res.ok) throw new Error(data.message);
    alert(`✅ Order marked as "${newStatus}"`);
    loadVendorOrders();

  } catch (err) {
    console.error("❌ Failed to update status:", err);
    alert("Failed to update order status.");
  }
}

function toggleNotificationDropdown() {
    const dropdown = document.getElementById("notificationDropdown");
    dropdown.style.display = dropdown.style.display === "none" ? "block" : "none";
  }
  
  // Fetch unread count + list
  async function fetchBuyerNotifications() {
    try {
      const res = await fetch(`${BACKEND}/api/notifications/buyer/unread`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
  
      const badge = document.getElementById("notificationBadge");
      const list = document.getElementById("notificationList");
  
      if (!data.length) {
        badge.style.display = "none";
        list.innerHTML = "<p>No new notifications</p>";
        return;
      }
  
      badge.style.display = "inline-block";
      badge.textContent = data.length;
  
      list.innerHTML = data.map(n => `
        <div style="margin-bottom: 0.75rem; border-bottom: 1px solid #444; padding-bottom: 0.5rem;">
          <p style="margin: 0; font-size: 0.9rem;">${n.message}</p>
          <small>${new Date(n.createdAt).toLocaleString()}</small>
        </div>
      `).join("");
    } catch (err) {
      console.error("❌ Failed to fetch notifications", err);
    }
  }
  
  // Re-fetch when dropdown is opened
  document.querySelector("[onclick='toggleNotificationDropdown()']").addEventListener("click", fetchBuyerNotifications);
  
  // Also fetch periodically (optional)
  setInterval(fetchBuyerNotifications, 30000);
  
  // Reuse this when Socket.IO event comes in
  socket.on("buyer-order-update", (data) => {
    alert(`🔔 ${data.message}`);
    fetchBuyerNotifications();
    loadVendorOrders(); // refresh order list
  });
  
