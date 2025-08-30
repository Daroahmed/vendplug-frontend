document.addEventListener('DOMContentLoaded', () => {
  const accountNumberEl = document.getElementById('accountNumber');
  const balanceEl = document.getElementById('balance');
  const buyer = JSON.parse(localStorage.getItem('vendplugBuyer'));

  if (!buyer || !buyer.token) {
    alert('Unauthorized. Please log in again.');
    window.location.href = '/buyer-auth.html';
    return;
  }

  const token = buyer.token;
  const resolvedNameEl = document.getElementById('resolvedName');

  fetchWallet();
  fetchTransactions();

  document.getElementById('filterBtn')?.addEventListener('click', () => {
    const start = document.getElementById('startDate').value;
    const end = document.getElementById('endDate').value;
    fetchTransactions(start, end);
  });

  async function fetchWallet() {
    try {
      const res = await fetch(`${window.BACKEND_URL}/api/wallet/buyer`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      accountNumberEl.textContent = data.virtualAccount || 'Not available';
      balanceEl.textContent = Number(data.balance || 0).toLocaleString('en-NG');
    } catch (err) {
      accountNumberEl.textContent = 'Error';
      balanceEl.textContent = 'Error';
    }
  }

  async function fetchTransactions(startDate = '', endDate = '') {
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const res = await fetch(`${window.BACKEND_URL}/api/wallet/transactions?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Failed to fetch');
      }

      const data = await res.json();
      const container = document.getElementById('transactionsList');
      container.innerHTML = '';

      if (!Array.isArray(data.transactions)) {
        throw new Error('Missing transaction data');
      }

      if (!data.transactions.length) {
        container.innerHTML = '<p>No transactions found for selected period.</p>';
        return;
      }

      const nameCache = {};

      for (const txn of data.transactions) {
        const isSender = txn.from === data.accountNumber;
        const otherAccount = isSender ? txn.to : txn.from;
        const direction = isSender ? 'Sent to' : 'Received from';

        if (!nameCache[otherAccount]) {
          try {
            const lookupRes = await fetch(`${window.BACKEND_URL}/api/wallet/lookup/${otherAccount}`);
            const lookupData = await lookupRes.json();
            nameCache[otherAccount] =
              lookupData.user?.fullName ||
              lookupData.user?.name ||
              lookupData.user?.businessName ||
              'Unknown';
          } catch {
            nameCache[otherAccount] = 'Unknown';
          }
        }

        const card = document.createElement('div');
        card.className = 'transaction-card';
        card.innerHTML = `
          <div class="transaction-header">
            <div class="transaction-type ${txn.status === 'failed' ? 'transaction-failed' : 'transaction-success'}">
              ${txn.type}
            </div>
            <div class="transaction-amount">
              ₦${txn.amount.toLocaleString()}
            </div>
          </div>
          <div class="transaction-direction">${direction}: ${nameCache[otherAccount]} (${otherAccount})</div>
          <div class="transaction-meta">
            Ref: ${txn.ref}<br />
            Status: ${txn.status}<br />
            By: ${txn.initiatorType || 'N/A'}<br />
            Date: ${new Date(txn.createdAt).toLocaleString()}
          </div>
        `;
        container.appendChild(card);
      }
    } catch (err) {
      console.error('Error fetching transactions:', err);
      document.getElementById('transactionsList').innerHTML = '<p>Error loading transactions.</p>';
    }
  }

  async function resolveUser() {
    const acct = document.getElementById('recipientAccount').value.trim();
    const display = document.getElementById('userNameResolved');
    resolvedNameEl.value = '';
    display.textContent = '🔍 Resolving...';

    if (!acct) {
      display.textContent = '';
      return;
    }

    try {
      const res = await fetch(`${window.BACKEND_URL}/api/wallet/lookup/${acct}`);
      const data = await res.json();

      const name =
        data.user?.fullName || data.user?.name || data.user?.businessName;

      if (name && data.role) {
        display.textContent = `✅ Recipient: ${name} (${data.role})`;
        resolvedNameEl.value = name;
      } else {
        display.textContent = '❌ User not found';
      }
    } catch {
      display.textContent = '⚠️ Error resolving account number';
    }
  }

  async function handleTransfer() {
    const acct = document.getElementById('recipientAccount').value.trim();
    const amount = Number(document.getElementById('transferAmount').value);
    if (!acct || amount <= 0) return alert('Enter valid account and amount');

    try {
      const res = await fetch(`${window.BACKEND_URL}/api/wallet/transfer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fromAccountNumber: accountNumberEl.textContent.trim(),
          toAccountNumber: acct,
          amount,
        }),
      });

      const data = await res.json();
      alert(data.message || 'Transfer successful');
      fetchWallet();
      fetchTransactions();
    } catch {
      alert('Transfer failed');
    }
  }


  // Funding Modal Functions
  function showFundingModal() {
    document.getElementById('fundingModal').style.display = 'block';
  }

  function closeFundingModal() {
    document.getElementById('fundingModal').style.display = 'none';
    document.getElementById('fundingAmount').value = '';
  }

  async function initiateFunding() {
    const amount = Number(document.getElementById('fundingAmount').value);
    if (!amount || amount < 100) {
      alert('Please enter a valid amount (minimum ₦100)');
      return;
    }

    const fundBtn = document.querySelector('.fund-btn');
    fundBtn.classList.add('loading');

    try {
      // Initialize wallet funding with our new Paystack integration
      const res = await fetch(`${window.BACKEND_URL}/api/paystack/fund-wallet`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ 
          amount,
          email: buyer.email 
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to initialize payment');
      }
      
      const paymentData = await res.json();
      
      if (!paymentData.success) {
        throw new Error(paymentData.message || 'Payment initialization failed');
      }

      const { authorizationUrl, reference } = paymentData.data;

      // Redirect to Paystack payment page
      console.log('🚀 Redirecting to Paystack:', authorizationUrl);
      window.location.href = authorizationUrl;
    } catch (error) {
      console.error('Payment initialization error:', error);
      alert('Error initializing payment. Please try again.');
      fundBtn.classList.remove('loading');
    }
  }

  // Payment verification function
  async function verifyPayment(reference) {
    try {
      console.log('🔍 Verifying payment:', reference);
      
      const verifyRes = await fetch(`${window.BACKEND_URL}/api/paystack/verify-payment?reference=${reference}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const verifyData = await verifyRes.json();
      
      if (verifyRes.ok && verifyData.success) {
        alert('🎉 Payment successful! Your wallet has been credited.');
        fetchWallet(); // Refresh wallet balance
        fetchTransactions(); // Refresh transaction history
        closeFundingModal();
      } else {
        throw new Error(verifyData.message || 'Payment verification failed');
      }
    } catch (error) {
      console.error('❌ Payment verification error:', error);
      alert('❌ Error verifying payment. Please contact support if your wallet is not credited.');
    }
  }

  // Global
  window.handleTransfer = handleTransfer;
  window.resolveUser = resolveUser;
  window.showFundingModal = showFundingModal;
  window.closeFundingModal = closeFundingModal;
  window.initiateFunding = initiateFunding;
});
