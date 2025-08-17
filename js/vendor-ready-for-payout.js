document.addEventListener("DOMContentLoaded", async () => {
    const container = document.getElementById("readyPayoutContainer");
    const token = localStorage.getItem("vendplug-token");
  
    if (!token) {
      container.innerHTML = `<p class="empty">Session expired. Please log in again.</p>`;
      return;
    }
  
    try {
      // Fetch orders marked as "ready_for_payout"
      const res = await fetch("/api/vendor/orders/ready-for-payout", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
  
      if (!res.ok) {
        throw new Error("Failed to fetch ready for payout orders");
      }
  
      const orders = await res.json();
  
      if (!orders.length) {
        container.innerHTML = `<p class="empty">No orders ready for payout yet.</p>`;
        return;
      }
  
      container.innerHTML = "";
      orders.forEach(order => {
        const card = document.createElement("div");
        card.className = "order-card";
        card.innerHTML = `
          <h3>Order #${order._id}</h3>
          <div class="order-info">
            <p><strong>Buyer:</strong> ${order.buyer?.name || "Unknown"}</p>
            <p><strong>Total:</strong> ₦${order.totalAmount || 0}</p>
            <p><strong>Status:</strong> ${order.status}</p>
          </div>
          <button class="payout-btn" data-id="${order._id}">Request Payout</button>
        `;
        container.appendChild(card);
      });
  
      // Handle payout requests
      document.querySelectorAll(".payout-btn").forEach(btn => {
        btn.addEventListener("click", async (e) => {
          const orderId = e.target.getAttribute("data-id");
  
          try {
            const payoutRes = await fetch(`/api/vendor/orders/${orderId}/request-payout`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
            });
  
            if (!payoutRes.ok) throw new Error("Failed to request payout");
  
            e.target.disabled = true;
            e.target.textContent = "Payout Requested ✅";
          } catch (err) {
            alert("Error: " + err.message);
          }
        });
      });
    } catch (err) {
      container.innerHTML = `<p class="empty">Error: ${err.message}</p>`;
    }
  });
  