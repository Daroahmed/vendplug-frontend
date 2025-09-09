// Admin Dashboard JavaScript
class AdminDashboard {
    constructor() {
        this.currentSection = 'dashboard';
        this.adminToken = localStorage.getItem('admin-token');
        this.currentPage = {
            users: 1,
            orders: 1,
            payouts: 1,
            disputes: 1
        };
        this.currentLimit = 20;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.checkAuth();
        this.loadDashboardData();
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = link.getAttribute('data-section');
                if (section && section !== 'logout') {
                    this.showSection(section);
                }
            });
        });

        // Logout
        document.getElementById('logoutBtn').addEventListener('click', (e) => {
            e.preventDefault();
            this.logout();
        });

        // Search and filter events
        document.getElementById('userSearch')?.addEventListener('input', this.debounce(() => this.searchUsers(), 500));
        document.getElementById('orderSearch')?.addEventListener('input', this.debounce(() => this.searchOrders(), 500));
    }

    checkAuth() {
        if (!this.adminToken) {
            window.location.href = 'admin-login.html';
            return;
        }
    }

    async loadDashboardData() {
        try {
            const response = await fetch('/api/admin/dashboard', {
                headers: {
                    'Authorization': `Bearer ${this.adminToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                if (response.status === 401) {
                    this.logout();
                    return;
                }
                throw new Error('Failed to load dashboard data');
            }

            const data = await response.json();
            this.updateDashboardCards(data.data.counts);
            this.updateRecentOrders(data.data.recentOrders);
            this.updateRecentTransactions(data.data.recentTransactions);

        } catch (error) {
            console.error('❌ Dashboard data error:', error);
            this.showError('Failed to load dashboard data');
        }
    }

    updateDashboardCards(counts) {
        document.getElementById('totalUsers').textContent = counts.totalBuyers + counts.totalVendors + counts.totalAgents;
        document.getElementById('totalOrders').textContent = counts.totalOrders;
        document.getElementById('pendingPayouts').textContent = counts.pendingPayouts;
        document.getElementById('processingPayouts').textContent = counts.processingPayouts;
        document.getElementById('openDisputes').textContent = counts.openDisputes || 0;
        document.getElementById('underReviewDisputes').textContent = counts.underReviewDisputes || 0;
        
        // Update assigned disputes if the element exists
        const assignedDisputesElement = document.getElementById('assignedDisputes');
        if (assignedDisputesElement) {
            assignedDisputesElement.textContent = counts.assignedDisputes || 0;
        }
        
        // Update escalated disputes
        const escalatedDisputesElement = document.getElementById('escalatedDisputes');
        if (escalatedDisputesElement) {
            escalatedDisputesElement.textContent = counts.escalatedDisputes || 0;
        }
    }

    updateRecentOrders(orders) {
        const container = document.getElementById('recentOrders');
        if (!orders || orders.length === 0) {
            container.innerHTML = '<p>No recent orders</p>';
            return;
        }

        const ordersHTML = orders.map(order => `
            <div style="padding: 10px; border-bottom: 1px solid #eee;">
                <div style="font-weight: 600;">${order.orderId || 'N/A'}</div>
                <div style="font-size: 0.9rem; color: #666;">
                    ${order.buyer?.fullName || 'Unknown'} → ${order.vendor?.shopName || 'Unknown'}
                </div>
                <div style="font-size: 0.8rem; color: #999;">
                    ${new Date(order.createdAt).toLocaleDateString()} - ${order.status}
                </div>
            </div>
        `).join('');

        container.innerHTML = ordersHTML;
    }

    updateRecentTransactions(transactions) {
        const container = document.getElementById('recentTransactions');
        if (!transactions || transactions.length === 0) {
            container.innerHTML = '<p>No recent transactions</p>';
            return;
        }

        const transactionsHTML = transactions.map(transaction => `
            <div style="padding: 10px; border-bottom: 1px solid #eee;">
                <div style="font-weight: 600;">₦${transaction.amount?.toLocaleString()}</div>
                <div style="font-size: 0.9rem; color: #666;">
                    ${transaction.initiatedBy?.fullName || transaction.initiatedBy?.shopName || 'Unknown'} - ${transaction.type}
                </div>
                <div style="font-size: 0.8rem; color: #999;">
                    ${new Date(transaction.createdAt).toLocaleDateString()}
                </div>
            </div>
        `).join('');

        container.innerHTML = transactionsHTML;
    }

    showSection(section) {
        // Hide all sections
        document.querySelectorAll('.content-section').forEach(s => s.style.display = 'none');
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));

        // Show selected section
        document.getElementById(`${section}-section`).style.display = 'block';
        document.querySelector(`[data-section="${section}"]`).classList.add('active');

        this.currentSection = section;

        // Load section data
        switch (section) {
            case 'users':
                this.loadUsers();
                break;
            case 'orders':
                this.loadOrders();
                break;
            case 'payouts':
                this.loadPayouts();
                break;
            case 'disputes':
                this.loadDisputes();
                break;
            case 'escalated-disputes':
                this.loadEscalatedDisputes();
                break;
            case 'staff-activity':
                this.loadStaffActivity();
                break;
        }
    }

    async loadUsers() {
        try {
            const response = await fetch(`/api/admin/users?page=${this.currentPage.users}&limit=${this.currentLimit}`, {
                headers: {
                    'Authorization': `Bearer ${this.adminToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) throw new Error('Failed to load users');

            const data = await response.json();
            this.displayUsers(data.data);

        } catch (error) {
            console.error('❌ Load users error:', error);
            this.showError('Failed to load users');
        }
    }

    async searchUsers() {
        const search = document.getElementById('userSearch').value;
        const role = document.getElementById('userRole').value;
        const status = document.getElementById('userStatus').value;

        try {
            const params = new URLSearchParams({
                page: 1,
                limit: this.currentLimit
            });
            if (search) params.append('search', search);
            if (role) params.append('role', role);
            if (status) params.append('status', status);

            const response = await fetch(`/api/admin/users?${params}`, {
                headers: {
                    'Authorization': `Bearer ${this.adminToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) throw new Error('Failed to search users');

            const data = await response.json();
            this.displayUsers(data.data);

        } catch (error) {
            console.error('❌ Search users error:', error);
            this.showError('Failed to search users');
        }
    }

    displayUsers(data) {
        const container = document.getElementById('usersTable');
        
        if (!data.users || data.users.length === 0) {
            container.innerHTML = '<p>No users found</p>';
            return;
        }

        const usersHTML = `
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Role</th>
                            <th>Status</th>
                            <th>Joined</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.users.map(user => `
                            <tr>
                                <td>${user.fullName}</td>
                                <td>${user.email}</td>
                                <td>${this.getUserRole(user)}</td>
                                <td>
                                    <span class="status-badge ${user.isActive ? 'status-completed' : 'status-failed'}">
                                        ${user.isActive ? 'Active' : 'Inactive'}
                                    </span>
                                </td>
                                <td>${new Date(user.createdAt).toLocaleDateString()}</td>
                                <td>
                                    ${user.isActive ? 
                                        `<button class="btn btn-warning" onclick="adminDashboard.suspendUser('${user._id}', '${this.getUserRole(user)}')">Suspend</button>` :
                                        `<button class="btn btn-success" onclick="adminDashboard.activateUser('${user._id}', '${this.getUserRole(user)}')">Activate</button>`
                                    }
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            ${this.createPagination(data.pagination, 'users')}
        `;

        container.innerHTML = usersHTML;
    }

    getUserRole(user) {
        // Use userType if available, otherwise fallback to field detection
        if (user.userType) {
            return user.userType.charAt(0).toUpperCase() + user.userType.slice(1);
        }
        if (user.shopName) return 'Vendor';
        if (user.agentCode) return 'Agent';
        return 'Buyer';
    }

    async suspendUser(userId, userType) {
        if (!confirm('Are you sure you want to suspend this user?')) return;

        try {
            const response = await fetch('/api/admin/users/status', {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${this.adminToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    userId,
                    userType,
                    action: 'suspend'
                })
            });

            if (!response.ok) throw new Error('Failed to suspend user');

            this.showSuccess('User suspended successfully');
            this.loadUsers();

        } catch (error) {
            console.error('❌ Suspend user error:', error);
            this.showError('Failed to suspend user');
        }
    }

    async activateUser(userId, userType) {
        if (!confirm('Are you sure you want to activate this user?')) return;

        try {
            const response = await fetch('/api/admin/users/status', {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${this.adminToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    userId,
                    userType,
                    action: 'activate'
                })
            });

            if (!response.ok) throw new Error('Failed to activate user');

            this.showSuccess('User activated successfully');
            this.loadUsers();

        } catch (error) {
            console.error('❌ Activate user error:', error);
            this.showError('Failed to activate user');
        }
    }

    async loadOrders() {
        try {
            const response = await fetch(`/api/admin/orders?page=${this.currentPage.orders}&limit=${this.currentLimit}`, {
                headers: {
                    'Authorization': `Bearer ${this.adminToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) throw new Error('Failed to load orders');

            const data = await response.json();
            this.displayOrders(data.data);

        } catch (error) {
            console.error('❌ Load orders error:', error);
            this.showError('Failed to load orders');
        }
    }

    async searchOrders() {
        const search = document.getElementById('orderSearch').value;
        const status = document.getElementById('orderStatus').value;
        const orderType = document.getElementById('orderType').value;

        try {
            const params = new URLSearchParams({
                page: 1,
                limit: this.currentLimit
            });
            if (search) params.append('search', search);
            if (status) params.append('status', status);
            if (orderType) params.append('orderType', orderType);

            const response = await fetch(`/api/admin/orders?${params}`, {
                headers: {
                    'Authorization': `Bearer ${this.adminToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) throw new Error('Failed to search orders');

            const data = await response.json();
            this.displayOrders(data.data);

        } catch (error) {
            console.error('❌ Search orders error:', error);
            this.showError('Failed to search orders');
        }
    }

    displayOrders(data) {
        const container = document.getElementById('ordersTable');
        
        if (!data.orders || data.orders.length === 0) {
            container.innerHTML = '<p>No orders found</p>';
            return;
        }

        const ordersHTML = `
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Order ID</th>
                            <th>Buyer</th>
                            <th>Vendor</th>
                            <th>Amount</th>
                            <th>Status</th>
                            <th>Type</th>
                            <th>Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.orders.map(order => `
                            <tr>
                                <td>${order._id || 'N/A'}</td>
                                <td>${order.buyer?.fullName || 'Unknown'}</td>
                                <td>${order.vendor?.shopName || 'Unknown'}</td>
                                <td>₦${order.totalAmount?.toLocaleString() || 'N/A'}</td>
                                <td>
                                    <span class="status-badge status-${order.status}">
                                        ${order.status}
                                    </span>
                                </td>
                                <td>${order.agent ? 'Agent' : 'Vendor'}</td>
                                <td>${new Date(order.createdAt).toLocaleDateString()}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            ${this.createPagination(data.pagination, 'orders')}
        `;

        container.innerHTML = ordersHTML;
    }

    async loadPayouts() {
        try {
            const response = await fetch(`/api/admin/payouts?page=${this.currentPage.payouts}&limit=${this.currentLimit}`, {
                headers: {
                    'Authorization': `Bearer ${this.adminToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) throw new Error('Failed to load payouts');

            const data = await response.json();
            this.displayPayouts(data.data);

        } catch (error) {
            console.error('❌ Load payouts error:', error);
            this.showError('Failed to load payouts');
        }
    }

    async searchPayouts() {
        const status = document.getElementById('payoutStatus').value;

        try {
            const params = new URLSearchParams({
                page: 1,
                limit: this.currentLimit
            });
            if (status) params.append('status', status);

            const response = await fetch(`/api/admin/payouts?${params}`, {
                headers: {
                    'Authorization': `Bearer ${this.adminToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) throw new Error('Failed to search payouts');

            const data = await response.json();
            this.displayPayouts(data.data);

        } catch (error) {
            console.error('❌ Search payouts error:', error);
            this.showError('Failed to search payouts');
        }
    }

    displayPayouts(data) {
        const container = document.getElementById('payoutsTable');
        
        if (!data.payouts || data.payouts.length === 0) {
            container.innerHTML = '<p>No payouts found</p>';
            return;
        }

        const payoutsHTML = `
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>User</th>
                            <th>Bank Details</th>
                            <th>Amount</th>
                            <th>Net Amount</th>
                            <th>Status</th>
                            <th>Date</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.payouts.map(payout => `
                            <tr>
                                <td>
                                    <div>${payout.userId?.fullName || 'Unknown'}</div>
                                    <div style="font-size: 0.8rem; color: #666;">${payout.userId?.email || 'N/A'}</div>
                                </td>
                                <td>
                                    <div>${payout.bankAccountId?.bankName || 'N/A'}</div>
                                    <div style="font-size: 0.8rem; color: #666;">${payout.bankAccountId?.accountNumber || 'N/A'}</div>
                                </td>
                                <td>₦${payout.amount?.toLocaleString()}</td>
                                <td>₦${payout.netAmount?.toLocaleString()}</td>
                                <td>
                                    <span class="status-badge status-${payout.status}">
                                        ${payout.status}
                                    </span>
                                </td>
                                <td>${new Date(payout.createdAt).toLocaleDateString()}</td>
                                <td>
                                    ${payout.status === 'pending' ? `
                                        <button class="btn btn-success" onclick="adminDashboard.approvePayout('${payout._id}')">Approve</button>
                                        <button class="btn btn-danger" onclick="adminDashboard.rejectPayout('${payout._id}')">Reject</button>
                                    ` : '-'}
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            ${this.createPagination(data.pagination, 'payouts')}
        `;

        container.innerHTML = payoutsHTML;
    }

    async approvePayout(payoutId) {
        if (!confirm('Are you sure you want to approve this payout?')) return;

        try {
            const response = await fetch('/api/admin/payouts/status', {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${this.adminToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    payoutId,
                    action: 'approve'
                })
            });

            if (!response.ok) throw new Error('Failed to approve payout');

            this.showSuccess('Payout approved successfully');
            this.loadPayouts();

        } catch (error) {
            console.error('❌ Approve payout error:', error);
            this.showError('Failed to approve payout');
        }
    }

    async rejectPayout(payoutId) {
        const reason = prompt('Please provide a reason for rejection:');
        if (!reason) return;

        try {
            const response = await fetch('/api/admin/payouts/status', {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${this.adminToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    payoutId,
                    action: 'reject',
                    reason
                })
            });

            if (!response.ok) throw new Error('Failed to reject payout');

            this.showSuccess('Payout rejected successfully');
            this.loadPayouts();

        } catch (error) {
            console.error('❌ Reject payout error:', error);
            this.showError('Failed to reject payout');
        }
    }

    createPagination(pagination, section) {
        if (!pagination || pagination.pages <= 1) return '';

        const pages = [];
        for (let i = 1; i <= pagination.pages; i++) {
            pages.push(`
                <button 
                    class="pagination ${i === pagination.page ? 'active' : ''}"
                    onclick="adminDashboard.goToPage('${section}', ${i})"
                >
                    ${i}
                </button>
            `);
        }

        return `
            <div class="pagination">
                ${pagination.page > 1 ? `<button onclick="adminDashboard.goToPage('${section}', ${pagination.page - 1})">Previous</button>` : ''}
                ${pages.join('')}
                ${pagination.page < pagination.pages ? `<button onclick="adminDashboard.goToPage('${section}', ${pagination.page + 1})">Next</button>` : ''}
            </div>
        `;
    }

    goToPage(section, page) {
        this.currentPage[section] = page;
        
        switch (section) {
            case 'users':
                this.loadUsers();
                break;
            case 'orders':
                this.loadOrders();
                break;
            case 'payouts':
                this.loadPayouts();
                break;
        }
    }

    logout() {
        localStorage.removeItem('admin-token');
        window.location.href = 'admin-login.html';
    }

    showSuccess(message) {
        // Simple success notification
        alert(`✅ ${message}`);
    }

    showError(message) {
        // Simple error notification
        alert(`❌ ${message}`);
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Dispute Management
    async loadDisputes() {
        try {
            const response = await fetch(`/api/admin/disputes?page=${this.currentPage.disputes}&limit=${this.currentLimit}`, {
                headers: {
                    'Authorization': `Bearer ${this.adminToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) throw new Error('Failed to load disputes');

            const data = await response.json();
            this.displayDisputes(data.data);

        } catch (error) {
            console.error('❌ Load disputes error:', error);
            this.showError('Failed to load disputes');
        }
    }

    async searchDisputes() {
        const status = document.getElementById('disputeStatus').value;
        const priority = document.getElementById('disputePriority').value;

        try {
            const params = new URLSearchParams({
                page: 1,
                limit: this.currentLimit
            });
            if (status) params.append('status', status);
            if (priority) params.append('priority', priority);

            const response = await fetch(`/api/admin/disputes?${params}`, {
                headers: {
                    'Authorization': `Bearer ${this.adminToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) throw new Error('Failed to search disputes');

            const data = await response.json();
            this.displayDisputes(data.data);

        } catch (error) {
            console.error('❌ Search disputes error:', error);
            this.showError('Failed to search disputes');
        }
    }

    displayDisputes(data) {
        const container = document.getElementById('disputesTable');
        
        // Debug: Log the first dispute to see the data structure
        if (data.disputes && data.disputes.length > 0) {
            console.log('🔍 First dispute in frontend:', data.disputes[0]);
        }
        
        if (!data.disputes || data.disputes.length === 0) {
            container.innerHTML = '<p>No disputes found</p>';
            return;
        }

        const disputesHTML = `
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Dispute ID</th>
                            <th>Complainant</th>
                            <th>Respondent</th>
                            <th>Order</th>
                            <th>Category</th>
                            <th>Status</th>
                            <th>Priority</th>
                            <th>Created</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.disputes.map(dispute => `
                            <tr>
                                <td>${dispute.disputeId}</td>
                                <td>
                                    <div>${dispute.raisedBy?.fullName || dispute.complainant?.userId?.fullName || 'Unknown'}</div>
                                    <div style="font-size: 0.8rem; color: #666;">${dispute.raisedByType || dispute.complainant?.userType || 'N/A'}</div>
                                </td>
                                <td>
                                    <div>${dispute.order?.vendor?.shopName || dispute.respondent?.userId?.fullName || dispute.respondent?.userId?.shopName || 'Unknown'}</div>
                                    <div style="font-size: 0.8rem; color: #666;">${dispute.order?.vendor ? 'Vendor' : dispute.respondent?.userType || 'N/A'}</div>
                                </td>
                                <td>
                                    <div>${dispute.order?._id || dispute.orderId?._id || 'N/A'}</div>
                                    <div style="font-size: 0.8rem; color: #666;">₦${dispute.order?.totalAmount?.toLocaleString() || dispute.orderId?.totalAmount?.toLocaleString() || 'N/A'}</div>
                                </td>
                                <td>${this.formatCategory(dispute.category)}</td>
                                <td>
                                    <span class="status-badge status-${dispute.status}">
                                        ${dispute.status.replace('_', ' ')}
                                    </span>
                                </td>
                                <td>
                                    <span class="status-badge status-${dispute.priority}">
                                        ${dispute.priority}
                                    </span>
                                </td>
                                <td>${new Date(dispute.createdAt).toLocaleDateString()}</td>
                                <td>
                                    <button class="btn btn-primary" onclick="adminDashboard.viewDispute('${dispute.disputeId}')">View</button>
                                    ${dispute.status === 'open' ? `
                                        <button class="btn btn-success" onclick="adminDashboard.assignDispute('${dispute.disputeId}')">Assign</button>
                                    ` : ''}
                                    ${dispute.status === 'under_review' ? `
                                        <button class="btn btn-warning" onclick="adminDashboard.resolveDispute('${dispute.disputeId}')">Resolve</button>
                                    ` : ''}
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            ${this.createPagination(data.pagination, 'disputes')}
        `;

        container.innerHTML = disputesHTML;
    }

    formatCategory(category) {
        const categories = {
            'product_not_received': 'Product Not Received',
            'product_damaged': 'Product Damaged',
            'product_not_as_described': 'Product Not As Described',
            'wrong_product': 'Wrong Product',
            'delivery_issues': 'Delivery Issues',
            'payment_issues': 'Payment Issues',
            'communication_issues': 'Communication Issues',
            'other': 'Other'
        };
        return categories[category] || category;
    }

    async viewDispute(disputeId) {
        try {
            const response = await fetch(`/api/disputes/admin/${disputeId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('admin-token')}`
                }
            });

            if (!response.ok) throw new Error('Failed to fetch dispute details');

            const dispute = await response.json();
            this.showDisputeModal(dispute);
            
        } catch (error) {
            console.error('❌ View dispute error:', error);
            this.showError('Failed to load dispute details');
        }
    }

    showDisputeModal(dispute) {
        // Debug: Log the dispute object to see what we're working with
        console.log('🔍 Dispute object received:', dispute);
        
        // Extract the actual dispute data (it's wrapped in a 'dispute' property)
        const disputeData = dispute.dispute || dispute;
        
        // Debug: Log the populated data
        console.log('🔍 Dispute data structure:', {
            complainant: disputeData.complainant,
            respondent: disputeData.respondent,
            orderId: disputeData.orderId,
            evidence: disputeData.evidence
        });
        
        // Create modal HTML
        const modalHTML = `
            <div id="disputeModal" class="modal" style="display: block;">
                <div class="modal-content" style="max-width: 90%; max-height: 90%; overflow-y: auto;">
                    <div class="modal-header">
                        <h2>Dispute Details - ${disputeData.disputeId}</h2>
                        <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
                    </div>
                    <div class="modal-body">
                        <div class="dispute-info">
                            <div class="info-grid">
                                <div class="info-item">
                                    <label>Status:</label>
                                    <span class="status-badge status-${disputeData.status || 'unknown'}">${(disputeData.status || 'unknown').replace('_', ' ').toUpperCase()}</span>
                                </div>
                                <div class="info-item">
                                    <label>Priority:</label>
                                    <span class="status-badge status-${disputeData.priority || 'unknown'}">${(disputeData.priority || 'unknown').toUpperCase()}</span>
                                </div>
                                <div class="info-item">
                                    <label>Category:</label>
                                    <span>${this.formatCategory(disputeData.category || 'unknown')}</span>
                                </div>
                                <div class="info-item">
                                    <label>Created:</label>
                                    <span>${disputeData.createdAt ? new Date(disputeData.createdAt).toLocaleString() : 'Unknown'}</span>
                                </div>
                            </div>
                            
                            <div class="dispute-parties">
                                <h3>Parties Involved</h3>
                                <div class="parties-grid">
                                    <div class="party">
                                        <h4>Complainant (${disputeData.raisedByType || disputeData.complainant?.userType || 'Unknown'})</h4>
                                        <p>ID: ${disputeData.raisedBy?._id || disputeData.complainant?.userId?._id || disputeData.complainant?.userId || 'Unknown'}</p>
                                        <p>Name: ${disputeData.raisedBy?.fullName || disputeData.raisedBy?.shopName || disputeData.complainant?.userId?.fullName || disputeData.complainant?.userId?.shopName || 'Unknown'}</p>
                                    </div>
                                    <div class="party">
                                        <h4>Respondent (${disputeData.respondent?.userType || 'Unknown'})</h4>
                                        <p>ID: ${disputeData.order?.vendor?._id || disputeData.order?.buyer?._id || disputeData.respondent?.userId?._id || disputeData.respondent?.userId || 'Unknown'}</p>
                                        <p>Name: ${disputeData.order?.vendor?.shopName || disputeData.order?.buyer?.fullName || disputeData.respondent?.userId?.fullName || disputeData.respondent?.userId?.shopName || 'Unknown'}</p>
                                    </div>
                                </div>
                                ${disputeData.assignment?.assignedTo ? `
                                <div class="party">
                                    <h4>Assigned To</h4>
                                    <p>Name: ${disputeData.assignment.assignedTo.fullName || 'Unknown'}</p>
                                    <p>Role: ${disputeData.assignment.assignedTo.role || 'Unknown'}</p>
                                    <p>Email: ${disputeData.assignment.assignedTo.email || 'Unknown'}</p>
                                </div>
                                ` : ''}
                            </div>

                            <div class="dispute-details">
                                <h3>Dispute Details</h3>
                                <div class="detail-item">
                                    <label>Title:</label>
                                    <p>${disputeData.title || 'No title'}</p>
                                </div>
                                <div class="detail-item">
                                    <label>Description:</label>
                                    <p>${disputeData.description || 'No description'}</p>
                                </div>
                                <div class="detail-item">
                                    <label>Order:</label>
                                    <p>${disputeData.orderType || 'Unknown'} - ${disputeData.order?._id || disputeData.orderId?._id || disputeData.orderId || 'Unknown'}</p>
                                    <p>Amount: ₦${disputeData.order?.totalAmount?.toLocaleString() || disputeData.orderId?.totalAmount || 'Unknown'}</p>
                                    <p>Status: ${disputeData.order?.status || disputeData.orderId?.status || 'Unknown'}</p>
                                </div>
                            </div>

                            ${disputeData.evidence && disputeData.evidence.length > 0 ? `
                                <div class="dispute-evidence">
                                    <h3>Evidence</h3>
                                    <div class="evidence-list">
                                        ${disputeData.evidence.map(evidence => `
                                            <div class="evidence-item">
                                                <div class="evidence-info">
                                                    <strong>${evidence.type.toUpperCase()}</strong>
                                                    <p>${evidence.description}</p>
                                                    <small>Uploaded by ${evidence.uploadedByType} on ${new Date(evidence.uploadedAt).toLocaleString()}</small>
                                                </div>
                                                ${evidence.type === 'image' ? `
                                                    <div class="evidence-preview">
                                                        <p><strong>Image File:</strong> ${evidence.description}</p>
                                                        <p><em>Note: File upload functionality needs to be implemented to display images properly.</em></p>
                                                        <p><strong>File URL:</strong> ${evidence.url}</p>
                                                    </div>
                                                ` : ''}
                                            </div>
                                        `).join('')}
                                    </div>
                                </div>
                            ` : ''}

                            ${disputeData.messages && disputeData.messages.length > 0 ? `
                                <div class="dispute-messages">
                                    <h3>Messages</h3>
                                    <div class="messages-list">
                                        ${disputeData.messages.map(message => `
                                            <div class="message-item">
                                                <div class="message-header">
                                                    <strong>${message.sender.userType}</strong>
                                                    <span>${new Date(message.createdAt).toLocaleString()}</span>
                                                </div>
                                                <div class="message-content">
                                                    <p>${message.message}</p>
                                                </div>
                                            </div>
                                        `).join('')}
                                    </div>
                                </div>
                            ` : ''}

                            ${disputeData.resolution ? `
                                <div class="dispute-resolution">
                                    <h3>Resolution</h3>
                                    <div class="resolution-details">
                                        <div class="info-item">
                                            <label>Decision:</label>
                                            <span>${disputeData.resolution.decision}</span>
                                        </div>
                                        <div class="info-item">
                                            <label>Reason:</label>
                                            <span>${disputeData.resolution.reason || 'N/A'}</span>
                                        </div>
                                        ${disputeData.resolution.refundAmount ? `
                                            <div class="info-item">
                                                <label>Refund Amount:</label>
                                                <span>₦${disputeData.resolution.refundAmount}</span>
                                            </div>
                                        ` : ''}
                                        <div class="info-item">
                                            <label>Resolved At:</label>
                                            <span>${new Date(disputeData.resolution.resolvedAt).toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                    <div class="modal-footer">
                        ${disputeData.status === 'open' ? `
                            <button class="btn btn-success" onclick="adminDashboard.assignDispute('${disputeData.disputeId}')">Assign to Admin</button>
                        ` : ''}
                        ${disputeData.status === 'under_review' ? `
                            <button class="btn btn-warning" onclick="adminDashboard.resolveDispute('${disputeData.disputeId}')">Resolve Dispute</button>
                        ` : ''}
                        <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Close</button>
                    </div>
                </div>
            </div>
        `;

        // Add modal to page
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    assignDispute(disputeId) {
        const assignedTo = prompt('Enter admin ID to assign this dispute to:');
        if (assignedTo && assignedTo.trim()) {
            this.performAssignDispute(disputeId, assignedTo.trim());
        }
    }

    async performAssignDispute(disputeId, assignedTo) {
        try {
            const response = await fetch(`/api/admin/disputes/${disputeId}/assign`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${this.adminToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ assignedTo })
            });

            if (!response.ok) throw new Error('Failed to assign dispute');

            this.showSuccess('Dispute assigned successfully');
            this.loadDisputes();

        } catch (error) {
            console.error('❌ Assign dispute error:', error);
            this.showError('Failed to assign dispute');
        }
    }

    resolveDispute(disputeId) {
        const decision = prompt('Enter decision (favor_complainant, favor_respondent, partial_refund, full_refund, no_action):');
        if (!decision) return;

        const reason = prompt('Enter reason for decision:');
        if (!reason) return;

        const refundAmount = prompt('Enter refund amount (if applicable, 0 for no refund):');
        const amount = refundAmount ? parseFloat(refundAmount) : 0;

        const notes = prompt('Enter additional notes (optional):') || '';

        this.performResolveDispute(disputeId, decision, reason, amount, notes);
    }

    async performResolveDispute(disputeId, decision, reason, refundAmount, notes) {
        try {
            const response = await fetch(`/api/admin/disputes/${disputeId}/resolve`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${this.adminToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    decision,
                    reason,
                    refundAmount,
                    notes
                })
            });

            if (!response.ok) throw new Error('Failed to resolve dispute');

            this.showSuccess('Dispute resolved successfully');
            this.loadDisputes();

        } catch (error) {
            console.error('❌ Resolve dispute error:', error);
            this.showError('Failed to resolve dispute');
        }
    }

    // Escalated Disputes Management
    showEscalatedDisputes() {
        this.showSection('escalated-disputes');
    }

    async loadEscalatedDisputes() {
        try {
            const response = await fetch(`/api/admin/disputes/escalated?page=${this.currentPage.disputes}&limit=${this.currentLimit}`, {
                headers: {
                    'Authorization': `Bearer ${this.adminToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) throw new Error('Failed to load escalated disputes');

            const data = await response.json();
            this.displayEscalatedDisputes(data.data);

        } catch (error) {
            console.error('❌ Load escalated disputes error:', error);
            this.showError('Failed to load escalated disputes');
        }
    }

    async searchEscalatedDisputes() {
        const priority = document.getElementById('escalatedPriority').value;
        const reason = document.getElementById('escalationReason').value;

        try {
            const params = new URLSearchParams({
                page: 1,
                limit: this.currentLimit
            });
            if (priority) params.append('priority', priority);
            if (reason) params.append('escalationReason', reason);

            const response = await fetch(`/api/admin/disputes/escalated?${params}`, {
                headers: {
                    'Authorization': `Bearer ${this.adminToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) throw new Error('Failed to search escalated disputes');

            const data = await response.json();
            this.displayEscalatedDisputes(data.data);

        } catch (error) {
            console.error('❌ Search escalated disputes error:', error);
            this.showError('Failed to search escalated disputes');
        }
    }

    displayEscalatedDisputes(data) {
        const container = document.getElementById('escalatedDisputesTable');
        
        if (!data.disputes || data.disputes.length === 0) {
            container.innerHTML = '<p>No escalated disputes found</p>';
            return;
        }

        const disputesHTML = `
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Dispute ID</th>
                            <th>Complainant</th>
                            <th>Respondent</th>
                            <th>Order</th>
                            <th>Category</th>
                            <th>Priority</th>
                            <th>Escalated By</th>
                            <th>Escalation Reason</th>
                            <th>Escalated At</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.disputes.map(dispute => `
                            <tr>
                                <td>${dispute.disputeId}</td>
                                <td>
                                    <div>${dispute.raisedBy?.fullName || dispute.complainant?.userId?.fullName || 'Unknown'}</div>
                                    <div style="font-size: 0.8rem; color: #666;">${dispute.raisedByType || dispute.complainant?.userType || 'N/A'}</div>
                                </td>
                                <td>
                                    <div>${dispute.order?.vendor?.shopName || dispute.respondent?.userId?.fullName || dispute.respondent?.userId?.shopName || 'Unknown'}</div>
                                    <div style="font-size: 0.8rem; color: #666;">${dispute.order?.vendor ? 'Vendor' : dispute.respondent?.userType || 'N/A'}</div>
                                </td>
                                <td>
                                    <div>${dispute.order?._id || dispute.orderId?._id || 'N/A'}</div>
                                    <div style="font-size: 0.8rem; color: #666;">₦${dispute.order?.totalAmount?.toLocaleString() || dispute.orderId?.totalAmount?.toLocaleString() || 'N/A'}</div>
                                </td>
                                <td>${this.formatCategory(dispute.category)}</td>
                                <td>
                                    <span class="status-badge status-${dispute.priority}">
                                        ${dispute.priority}
                                    </span>
                                </td>
                                <td>
                                    <div>${dispute.escalation?.escalatedBy?.fullName || 'Unknown'}</div>
                                    <div style="font-size: 0.8rem; color: #666;">${dispute.escalation?.escalatedBy?.role || 'N/A'}</div>
                                </td>
                                <td>
                                    <span class="badge bg-warning">${dispute.escalation?.reason || 'Unknown'}</span>
                                </td>
                                <td>${dispute.escalation?.escalatedAt ? new Date(dispute.escalation.escalatedAt).toLocaleDateString() : 'N/A'}</td>
                                <td>
                                    <button class="btn btn-primary" onclick="adminDashboard.viewEscalatedDispute('${dispute.disputeId}')">View</button>
                                    <button class="btn btn-success" onclick="adminDashboard.reassignEscalatedDispute('${dispute.disputeId}')">Reassign</button>
                                    <button class="btn btn-warning" onclick="adminDashboard.resolveEscalatedDispute('${dispute.disputeId}')">Resolve</button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            ${this.createPagination(data.pagination, 'disputes')}
        `;

        container.innerHTML = disputesHTML;
    }

    async viewEscalatedDispute(disputeId) {
        try {
            const response = await fetch(`/api/disputes/admin/${disputeId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('admin-token')}`
                }
            });

            if (!response.ok) throw new Error('Failed to fetch escalated dispute details');

            const dispute = await response.json();
            this.showEscalatedDisputeModal(dispute);
            
        } catch (error) {
            console.error('❌ View escalated dispute error:', error);
            this.showError('Failed to load escalated dispute details');
        }
    }

    showEscalatedDisputeModal(dispute) {
        const disputeData = dispute.dispute || dispute;
        
        const modalHTML = `
            <div id="escalatedDisputeModal" class="modal" style="display: block;">
                <div class="modal-content" style="max-width: 90%; max-height: 90%; overflow-y: auto;">
                    <div class="modal-header">
                        <h2>Escalated Dispute - ${disputeData.disputeId}</h2>
                        <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
                    </div>
                    <div class="modal-body">
                        <div class="alert alert-warning">
                            <strong>⚠️ This dispute has been escalated and requires admin attention</strong>
                        </div>
                        
                        <div class="dispute-info">
                            <div class="info-grid">
                                <div class="info-item">
                                    <label>Status:</label>
                                    <span class="status-badge status-${disputeData.status || 'unknown'}">${(disputeData.status || 'unknown').replace('_', ' ').toUpperCase()}</span>
                                </div>
                                <div class="info-item">
                                    <label>Priority:</label>
                                    <span class="status-badge status-${disputeData.priority || 'unknown'}">${(disputeData.priority || 'unknown').toUpperCase()}</span>
                                </div>
                                <div class="info-item">
                                    <label>Category:</label>
                                    <span>${this.formatCategory(disputeData.category || 'unknown')}</span>
                                </div>
                                <div class="info-item">
                                    <label>Created:</label>
                                    <span>${disputeData.createdAt ? new Date(disputeData.createdAt).toLocaleString() : 'Unknown'}</span>
                                </div>
                            </div>
                            
                            <div class="escalation-details" style="background: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0;">
                                <h4>Escalation Details</h4>
                                <div class="info-item">
                                    <label>Escalated By:</label>
                                    <span>${disputeData.escalation?.escalatedBy?.fullName || 'Unknown'}</span>
                                </div>
                                <div class="info-item">
                                    <label>Escalation Reason:</label>
                                    <span class="badge bg-warning">${disputeData.escalation?.reason || 'Unknown'}</span>
                                </div>
                                <div class="info-item">
                                    <label>Escalated At:</label>
                                    <span>${disputeData.escalation?.escalatedAt ? new Date(disputeData.escalation.escalatedAt).toLocaleString() : 'Unknown'}</span>
                                </div>
                                <div class="info-item">
                                    <label>Escalation Notes:</label>
                                    <p>${disputeData.escalation?.notes || 'No additional notes provided'}</p>
                                </div>
                            </div>
                            
                            <div class="dispute-parties">
                                <h3>Parties Involved</h3>
                                <div class="parties-grid">
                                    <div class="party">
                                        <h4>Complainant (${disputeData.raisedByType || disputeData.complainant?.userType || 'Unknown'})</h4>
                                        <p>ID: ${disputeData.raisedBy?._id || disputeData.complainant?.userId?._id || disputeData.complainant?.userId || 'Unknown'}</p>
                                        <p>Name: ${disputeData.raisedBy?.fullName || disputeData.raisedBy?.shopName || disputeData.complainant?.userId?.fullName || disputeData.complainant?.userId?.shopName || 'Unknown'}</p>
                                    </div>
                                    <div class="party">
                                        <h4>Respondent (${disputeData.respondent?.userType || 'Unknown'})</h4>
                                        <p>ID: ${disputeData.order?.vendor?._id || disputeData.order?.buyer?._id || disputeData.respondent?.userId?._id || disputeData.respondent?.userId || 'Unknown'}</p>
                                        <p>Name: ${disputeData.order?.vendor?.shopName || disputeData.order?.buyer?.fullName || disputeData.respondent?.userId?.fullName || disputeData.respondent?.userId?.shopName || 'Unknown'}</p>
                                    </div>
                                </div>
                            </div>

                            <div class="dispute-details">
                                <h3>Dispute Details</h3>
                                <div class="detail-item">
                                    <label>Title:</label>
                                    <p>${disputeData.title || 'No title'}</p>
                                </div>
                                <div class="detail-item">
                                    <label>Description:</label>
                                    <p>${disputeData.description || 'No description'}</p>
                                </div>
                                <div class="detail-item">
                                    <label>Order:</label>
                                    <p>${disputeData.orderType || 'Unknown'} - ${disputeData.order?._id || disputeData.orderId?._id || disputeData.orderId || 'Unknown'}</p>
                                    <p>Amount: ₦${disputeData.order?.totalAmount?.toLocaleString() || disputeData.orderId?.totalAmount || 'Unknown'}</p>
                                    <p>Status: ${disputeData.order?.status || disputeData.orderId?.status || 'Unknown'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-success" onclick="adminDashboard.reassignEscalatedDispute('${disputeData.disputeId}')">Reassign to Staff</button>
                        <button class="btn btn-warning" onclick="adminDashboard.resolveEscalatedDispute('${disputeData.disputeId}')">Resolve as Admin</button>
                        <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Close</button>
                    </div>
                </div>
            </div>
        `;

        // Add modal to page
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    async reassignEscalatedDispute(disputeId) {
        const staffId = prompt('Enter staff ID to reassign this dispute to:');
        if (!staffId || !staffId.trim()) return;

        try {
            const response = await fetch(`/api/admin/disputes/${disputeId}/reassign`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${this.adminToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    assignedTo: staffId.trim(),
                    reason: 'Reassigned by admin from escalated status'
                })
            });

            if (!response.ok) throw new Error('Failed to reassign dispute');

            this.showSuccess('Dispute reassigned successfully');
            this.loadEscalatedDisputes();

        } catch (error) {
            console.error('❌ Reassign dispute error:', error);
            this.showError('Failed to reassign dispute');
        }
    }

    async resolveEscalatedDispute(disputeId) {
        const decision = prompt('Enter decision (refund, no_refund, partial_refund):');
        if (!decision) return;

        const reason = prompt('Enter reason for decision:');
        if (!reason) return;

        const refundAmount = prompt('Enter refund amount (if applicable, 0 for no refund):');
        const amount = refundAmount ? parseFloat(refundAmount) : 0;

        const notes = prompt('Enter additional notes (optional):') || '';

        try {
            const response = await fetch(`/api/admin/disputes/${disputeId}/resolve`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${this.adminToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    resolution: decision,
                    reason,
                    refundAmount: amount,
                    notes,
                    resolvedBy: 'admin'
                })
            });

            if (!response.ok) throw new Error('Failed to resolve escalated dispute');

            this.showSuccess('Escalated dispute resolved successfully');
            this.loadEscalatedDisputes();

        } catch (error) {
            console.error('❌ Resolve escalated dispute error:', error);
            this.showError('Failed to resolve escalated dispute');
        }
    }

    // Staff Activity Log Management
    async loadStaffActivity() {
        try {
            // Load staff list for filter
            await this.loadStaffListForFilter();
            
            const response = await fetch(`/api/admin/staff-activity?page=${this.currentPage.disputes}&limit=${this.currentLimit}`, {
                headers: {
                    'Authorization': `Bearer ${this.adminToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) throw new Error('Failed to load staff activity');

            const data = await response.json();
            this.displayStaffActivity(data.data);

        } catch (error) {
            console.error('❌ Load staff activity error:', error);
            this.showError('Failed to load staff activity');
        }
    }

    async loadStaffListForFilter() {
        try {
            const response = await fetch('/api/admin/staff', {
                headers: {
                    'Authorization': `Bearer ${this.adminToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                const staffSelect = document.getElementById('staffFilter');
                
                // Clear existing options except "All Staff"
                staffSelect.innerHTML = '<option value="">All Staff</option>';
                
                // Add staff options
                data.data.forEach(staff => {
                    const option = document.createElement('option');
                    option.value = staff._id;
                    option.textContent = `${staff.fullName} (${staff.role})`;
                    staffSelect.appendChild(option);
                });
            }
        } catch (error) {
            console.error('❌ Load staff list for filter error:', error);
        }
    }

    async searchStaffActivity() {
        const staffId = document.getElementById('staffFilter').value;
        const action = document.getElementById('actionFilter').value;
        const dateFrom = document.getElementById('dateFrom').value;
        const dateTo = document.getElementById('dateTo').value;

        try {
            const params = new URLSearchParams({
                page: 1,
                limit: this.currentLimit
            });
            if (staffId) params.append('staffId', staffId);
            if (action) params.append('action', action);
            if (dateFrom) params.append('dateFrom', dateFrom);
            if (dateTo) params.append('dateTo', dateTo);

            const response = await fetch(`/api/admin/staff-activity?${params}`, {
                headers: {
                    'Authorization': `Bearer ${this.adminToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) throw new Error('Failed to search staff activity');

            const data = await response.json();
            this.displayStaffActivity(data.data);

        } catch (error) {
            console.error('❌ Search staff activity error:', error);
            this.showError('Failed to search staff activity');
        }
    }

    displayStaffActivity(data) {
        const container = document.getElementById('staffActivityTable');
        
        if (!data.activities || data.activities.length === 0) {
            container.innerHTML = '<p>No staff activity found</p>';
            return;
        }

        const activitiesHTML = `
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Timestamp</th>
                            <th>Staff Member</th>
                            <th>Action</th>
                            <th>Dispute ID</th>
                            <th>Details</th>
                            <th>IP Address</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.activities.map(activity => `
                            <tr>
                                <td>${new Date(activity.timestamp).toLocaleString()}</td>
                                <td>
                                    <div>${activity.staff?.fullName || 'Unknown'}</div>
                                    <div style="font-size: 0.8rem; color: #666;">${activity.staff?.role || 'N/A'}</div>
                                </td>
                                <td>
                                    <span class="badge bg-${this.getActionColor(activity.action)}">
                                        ${this.formatAction(activity.action)}
                                    </span>
                                </td>
                                <td>${activity.disputeId || 'N/A'}</td>
                                <td>
                                    <div style="max-width: 200px; overflow: hidden; text-overflow: ellipsis;">
                                        ${activity.details || 'No details'}
                                    </div>
                                </td>
                                <td>${activity.ipAddress || 'N/A'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            ${this.createPagination(data.pagination, 'disputes')}
        `;

        container.innerHTML = activitiesHTML;
    }

    getActionColor(action) {
        const colors = {
            'dispute_assigned': 'primary',
            'review_started': 'warning',
            'dispute_resolved': 'success',
            'dispute_escalated': 'danger',
            'priority_updated': 'info',
            'message_sent': 'secondary',
            'info_requested': 'dark'
        };
        return colors[action] || 'secondary';
    }

    formatAction(action) {
        const actions = {
            'dispute_assigned': 'Dispute Assigned',
            'review_started': 'Review Started',
            'dispute_resolved': 'Dispute Resolved',
            'dispute_escalated': 'Dispute Escalated',
            'priority_updated': 'Priority Updated',
            'message_sent': 'Message Sent',
            'info_requested': 'Info Requested'
        };
        return actions[action] || action.replace('_', ' ').toUpperCase();
    }
}

// Initialize admin dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.adminDashboard = new AdminDashboard();
});

