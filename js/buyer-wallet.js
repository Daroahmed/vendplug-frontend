document.addEventListener('DOMContentLoaded', () => {
  const accountNumberEl = document.getElementById('accountNumber');
  const balanceEl = document.getElementById('balance');
  const buyer = getCurrentUser();
  const token = getAuthToken();

  if (!buyer || !token) {
    alert('Unauthorized. Please log in again.');
    redirectToLogin();
    return;
  }
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

        // Prefer backend-provided initiatorName for incoming funds (accurate sender)
        let displayName = '';
        if (!isSender && txn.initiatorName && txn.initiatorName !== 'Unknown') {
          displayName = txn.initiatorName;
        } else {
          // Known system sources (e.g., escrow/paystack)
          const acctLower = (otherAccount || '').toString().toLowerCase();
          const knownMap = {
            escrow: 'Escrow',
            paystack: 'Paystack',
            system: 'System',
            platform: 'VendPlug',
            vendplug: 'VendPlug',
          };
          if (knownMap[acctLower]) {
            displayName = knownMap[acctLower];
          }

          // Heuristics from reference string
          if (!displayName && typeof txn.ref === 'string') {
            const refUpper = txn.ref.toUpperCase();
            if (refUpper.includes('PAYSTACK')) displayName = 'Paystack';
            if (refUpper.includes('VENDPLUG')) displayName = 'VendPlug';
          }

          // If we still don't have a name, try initiatorType as a hint
          if (!displayName && txn.initiatorType) {
            displayName = txn.initiatorType;
          }

          // Final fallback: resolve counterparty by account number (cached)
          if (!displayName) {
            if (!nameCache[otherAccount]) {
              try {
                const lookupRes = await fetch(`${window.BACKEND_URL}/api/wallet/lookup/${otherAccount}`);
                const lookupData = await lookupRes.json();
                nameCache[otherAccount] =
                  lookupData.user?.fullName ||
                  lookupData.user?.name ||
                  lookupData.user?.businessName ||
                  '';
              } catch {
                nameCache[otherAccount] = '';
              }
            }
            displayName = nameCache[otherAccount] || '';
          }
        }
        if (!displayName) displayName = 'Unknown';

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
          <div class="transaction-direction">${direction}: ${displayName} (${otherAccount})</div>
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

  // Transfer and resolve functions removed - transfers not used anymore


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
  // Removed: handleTransfer, resolveUser
  window.showFundingModal = showFundingModal;
  window.closeFundingModal = closeFundingModal;
  window.initiateFunding = initiateFunding;
});
