document.addEventListener('DOMContentLoaded', () => {
    const BACKEND = window.BACKEND_URL || "http://localhost:5002";
    const params = new URLSearchParams(window.location.search);
    const vendorId = params.get('vendor');
  
    if (!vendorId) {
      alert('Vendor ID missing');
      return;
    }
  
    fetch(`${BACKEND}/api/vendors/${vendorId}`)
      .then(res => res.json())
      .then(vendor => {
        document.getElementById('shopName').textContent = vendor.shopName || 'Unnamed Shop';
        document.getElementById('vendorCategory').textContent = vendor.category || 'Not specified';
        document.getElementById('vendorAddress').textContent = vendor.businessAddress || 'N/A';
        document.getElementById('vendorPhone').textContent = vendor.phoneNumber || 'N/A';
        document.getElementById('vendorAccountNumber').textContent = vendor.virtualAccount || 'N/A';
        document.getElementById('brandImage').src = vendor.brandImage || '/assets/vendor-placeholder.jpg';
  
        // Optional: Set transactions if you’re tracking
        document.getElementById('vendorTransactions').textContent = vendor.totalTransactions || 0;
      })
      .catch(err => {
        console.error(err);
        alert('Error loading vendor profile');
      });
  });
  
  function copyAccount() {
    const accNum = document.getElementById('vendorAccountNumber').textContent;
    navigator.clipboard.writeText(accNum)
      .then(() => alert('Account number copied!'))
      .catch(() => alert('Failed to copy'));
  }
  