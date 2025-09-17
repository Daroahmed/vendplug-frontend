console.log("📦 buyer-order-details.js loaded");

const BACKEND = window.BACKEND_URL || "";
const token = getAuthToken();
const buyer = getCurrentUser();
const detailsDiv = document.getElementById("orderDetails");

// Copy to clipboard function
function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    // Show a temporary success message
    const button = event.target.closest('.copy-btn');
    const originalText = button.innerHTML;
    button.innerHTML = '<i class="fas fa-check"></i> Copied!';
    button.style.background = '#28a745';
    
    setTimeout(() => {
      button.innerHTML = originalText;
      button.style.background = '#00cc99';
    }, 2000);
  }).catch(err => {
    console.error('Failed to copy: ', err);
    alert('Failed to copy to clipboard');
  });
}

// validate login + order
if (!token || !buyer) {
  window.location.href = "/buyer-auth.html";
}

const params = new URLSearchParams(window.location.search);
const orderId = params.get("orderId");

if (!orderId) {
  detailsDiv.innerHTML = "<p>Invalid order request.</p>";
} else {
  fetchOrderDetails(orderId);
}

async function fetchOrderDetails(id) {
  try {
    const res = await fetch(`${BACKEND}/api/buyer-orders/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Failed to fetch order");

    renderOrderDetails(data);
  } catch (err) {
    console.error("❌ fetchOrderDetails error:", err);
    detailsDiv.innerHTML = "<p>Failed to load order details.</p>";
  }
}

function renderOrderDetails(order) {
  const vendorName = order.vendor || "Unknown Vendor";
  const statuses = ["pending", "accepted", "preparing", "out_for_delivery", "delivered"];
  const currentIndex = statuses.indexOf(order.status);

  detailsDiv.innerHTML = `
    <div class="order-header">
      <div class="order-id">Order #: <span id="orderNumber">${order._id}</span></div>
      <div class="current-status" id="currentStatus">${order.status}</div>
    </div>
    
    <div class="info-row">
      <strong>Order ID:</strong> 
      <span>${order._id}</span>
      <button onclick="copyToClipboard('${order._id}')" class="copy-btn" title="Copy Order ID">
        <i class="fas fa-copy"></i> Copy
      </button>
    </div>
    
    <div class="info-row">
      <strong>Vendor ID:</strong> 
      <span>${order.vendorId || "N/A"}</span>
      ${order.vendorId ? `<button onclick="copyToClipboard('${order.vendorId}')" class="copy-btn" title="Copy Vendor ID">
        <i class="fas fa-copy"></i> Copy
      </button>` : ''}
    </div>
    
    <div class="info-row">
      <strong>Vendor:</strong> 
      <span>${vendorName}</span>
    </div>
    
    <div class="info-row">
      <strong>Delivery Address:</strong> 
      <span>${order.deliveryLocation || "N/A"}</span>
    </div>
    
    <div class="info-row">
      <strong>Total Amount:</strong> 
      <span>₦${Number(order.totalAmount).toLocaleString()}</span>
    </div>
    
    <div class="info-row">
      <strong>Ordered At:</strong> 
      <span>${new Date(order.createdAt).toLocaleString()}</span>
    </div>
    
    <h4 style="margin-top: 1.5rem; color: #00cc99;">Products:</h4>
    <ul>
      ${order.products.map(p => `
        <li>${p.name} - ₦${Number(p.price).toLocaleString()} × ${p.quantity}</li>
      `).join("")}
    </ul>
    
    <h4 style="margin-top: 1.5rem; color: #00cc99;">Status Timeline:</h4>
    <ul class="status-timeline">
      ${statuses.map((st, i) => `
        <li class="${i <= currentIndex ? "status-active" : ""}">
          ${st.replace(/_/g, " ")}
        </li>`).join("")}
    </ul>
    
    <div style="margin-top: 1.5rem;">
      <button id="confirmBtn" ${order.status !== "delivered" ? "disabled" : ""}>
        Confirm Delivery
      </button>
    </div>
  `;

  const confirmBtn = document.getElementById("confirmBtn");
  if (confirmBtn) {
    confirmBtn.addEventListener("click", () => confirmReceipt(order._id));
  }
}

async function confirmReceipt(orderId) {
  try {
    const res = await fetch(`/api/buyer-orders/${orderId}/confirm`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      }
    });
    

    const data = await res.json();
    if (res.ok) {
      alert("✅ Delivery confirmed!");
      fetchOrderDetails(orderId); // reload status
    } else {
      alert(`❌ ${data.message || "Failed to confirm"}`);
    }
  } catch (err) {
    console.error("❌ confirmReceipt error:", err);
  }
}
