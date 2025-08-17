document.addEventListener("DOMContentLoaded", () => {
    const token = localStorage.getItem("vendplug-token");
    const vendorData = JSON.parse(localStorage.getItem("vendplugVendor"));
    const payoutQueueContainer = document.getElementById("payoutQueueContainer");
  
    if (!token || !vendorData) {
      alert("Session expired. Please log in again.");
      window.location.href = "vendor-login.html";
      return;
    }
  
    // Fetch vendor payout queue (pending_receipt orders)
    async function fetchPayoutQueue() {
      try {
        const response = await fetch("/api/orders/vendor/payout-queue", {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        });
  
        if (!response.ok) {
          throw new Error("Failed to fetch payout queue");
        }
  
        const data = await response.json();
        renderPayoutQueue(data);
      } catch (error) {
        console.error("Error fetching payout queue:", error);
        payoutQueueContainer.innerHTML = `<p class="empty">Error loading payout queue. Please try again later.</p>`;
      }
    }
  
    // Render payout queue list
    function renderPayoutQueue(orders) {
      if (!orders || orders.length === 0) {
        payoutQueueContainer.innerHTML = `<p class="empty">No orders in payout queue yet.</p>`;
        return;
      }
  
      payoutQueueContainer.innerHTML = "";
      orders.forEach(order => {
        const orderCard = document.createElement("div");
        orderCard.classList.add("order-card");
  
        orderCard.innerHTML = `
          <div class="order-header">
            <span class="order-id">Order #${order._id}</span>
            <span class="status">${order.status}</span>
          </div>
          <div><strong>Amount:</strong> ₦${order.totalAmount}</div>
          <div><strong>Buyer:</strong> ${order.buyer?.name || "N/A"}</div>
          <p class="waiting-message">⏳ Waiting for buyer confirmation…</p>
        `;
  
        payoutQueueContainer.appendChild(orderCard);
      });
    }
  
    fetchPayoutQueue();
  });
  