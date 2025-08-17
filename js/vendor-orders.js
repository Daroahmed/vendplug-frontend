document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem("vendplug-token");
  const ordersContainer = document.getElementById("orders-container");

  if (!token) {
    alert("Session expired. Please log in again.");
    window.location.href = "vendor-login.html";
    return;
  }

  // Fetch vendor orders
  async function fetchOrders() {
    try {
      const res = await fetch("/api/orders/vendor", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error("Failed to fetch orders");

      const orders = await res.json();
      renderOrders(orders);
    } catch (err) {
      console.error(err);
      ordersContainer.innerHTML =
        `<p class="text-red-500">Error loading orders.</p>`;
    }
  }

  // Render Orders
  function renderOrders(orders) {
    ordersContainer.innerHTML = "";

    if (orders.length === 0) {
      ordersContainer.innerHTML =
        `<p class="text-gray-400">No orders yet.</p>`;
      return;
    }

    orders.forEach(order => {
      const div = document.createElement("div");
      div.className = "p-4 bg-gray-800 rounded-lg shadow";

      div.innerHTML = `
        <p><strong>Order ID:</strong> ${order._id}</p>
        <p><strong>Buyer:</strong> ${order.buyer?.name || "N/A"}</p>
        <p><strong>Status:</strong> 
          <span class="px-2 py-1 rounded text-sm ${
            order.status === "pending"
              ? "bg-yellow-600"
              : order.status === "accepted"
              ? "bg-green-600"
              : "bg-red-600"
          }">${order.status}</span>
        </p>
        <div class="mt-3 flex space-x-2">
          ${
            order.status === "pending"
              ? `<button class="accept-btn bg-green-500 px-3 py-1 rounded" data-id="${order._id}">Accept</button>
                 <button class="reject-btn bg-red-500 px-3 py-1 rounded" data-id="${order._id}">Reject</button>`
              : `<button class="update-btn bg-blue-500 px-3 py-1 rounded" data-id="${order._id}">Update Status</button>`
          }
        </div>
      `;

      ordersContainer.appendChild(div);
    });

    attachEventListeners();
  }

  // Attach listeners to buttons
  function attachEventListeners() {
    document.querySelectorAll(".accept-btn").forEach(btn => {
      btn.addEventListener("click", () =>
        updateOrderStatus(btn.dataset.id, "accepted")
      );
    });

    document.querySelectorAll(".reject-btn").forEach(btn => {
      btn.addEventListener("click", () =>
        updateOrderStatus(btn.dataset.id, "rejected")
      );
    });

    document.querySelectorAll(".update-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const newStatus = prompt(
          "Enter new status (e.g., in_progress, delivered):"
        );
        if (newStatus) updateOrderStatus(btn.dataset.id, newStatus);
      });
    });
  }

  // Update order status
  async function updateOrderStatus(orderId, status) {
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });

      if (!res.ok) throw new Error("Failed to update order");

      fetchOrders(); // reload orders
    } catch (err) {
      console.error(err);
      alert("Error updating order status.");
    }
  }

  fetchOrders();
});
