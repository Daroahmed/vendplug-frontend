
document.addEventListener("DOMContentLoaded", () => {
    const token = localStorage.getItem("vendplug-token");
    const vendor = JSON.parse(localStorage.getItem("vendplugVendor"));
  
    if (!token || !vendor?._id) {
      alert("Unauthorized. Please login again.");
      return (window.location.href = "/vendor-login.html");
    }
  
    const orderContainer = document.getElementById("orderContainer");
    const bellIcon = document.getElementById("notificationBell");
    const badge = document.getElementById("notificationBadge");
  
    fetchOrders();
    fetchNotifications();
  
    // Join vendor room for real-time notifications
    const socket = io(window.BACKEND_URL, {
      query: { userId: `vendor_${vendor._id}` },
    });
  
    socket.on("vendor-order-update", (data) => {
      console.log("🔔 Vendor order update:", data);
      badge.style.display = "inline-block";
      fetchOrders(); // Refresh orders on new update
    });
  
    async function fetchOrders() {
      try {
        const res = await fetch(`${window.BACKEND_URL}/api/orders/vendor`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        orderContainer.innerHTML = "";
  
        if (!res.ok) throw new Error(data.message);
  
        if (data.length === 0) {
          orderContainer.innerHTML = "<p>No orders yet.</p>";
          return;
        }
  
        data.forEach((order) => {
          const card = document.createElement("div");
          card.className = "order-card";
          card.innerHTML = `
            <div class="order-header">
              <div>🛒 Order #${order._id}</div>
              <div>${new Date(order.createdAt).toLocaleString()}</div>
            </div>
            <div><strong>Status:</strong> ${order.status}</div>
            <div><strong>Total:</strong> ₦${order.totalAmount.toLocaleString()}</div>
            <div><strong>Delivery Option:</strong> ${order.deliveryOption}</div>
            <div><strong>Buyer Note:</strong> ${order.note || "N/A"}</div>
            <div class="order-items">
              <strong>Items:</strong>
              <ul>
                ${order.items
                  .map(
                    (item) =>
                      `<li>${item.name} x ${item.qty} - ₦${item.price.toLocaleString()}</li>`
                  )
                  .join("")}
              </ul>
            </div>
          `;
          orderContainer.appendChild(card);
        });
      } catch (err) {
        console.error("❌ Error loading vendor orders:", err);
        orderContainer.innerHTML = "<p>Failed to load orders</p>";
      }
    }
  
    async function fetchNotifications() {
      try {
        const res = await fetch(`${window.BACKEND_URL}/api/notifications/unread?vendor=true`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
  
        if (Array.isArray(data) && data.length > 0) {
          badge.style.display = "inline-block";
          badge.textContent = data.length;
        } else {
          badge.style.display = "none";
        }
      } catch (err) {
        console.error("🔕 Failed to fetch vendor notifications", err);
      }
    }
  });
  