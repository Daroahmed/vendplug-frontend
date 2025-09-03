// frontend/js/staff-dispute-dashboard.js
class StaffDisputeDashboard {
    constructor() {
        this.currentStaff = null;
        this.currentDispute = null;
        this.apiBaseUrl = '/api/staff';
        this.init();
    }

    async init() {
        // Check authentication
        const token = localStorage.getItem('adminToken');
        if (!token) {
            this.redirectToLogin();
            return;
        }

        try {
            // Get staff info
            await this.loadStaffInfo();
            
            // Load dashboard
            await this.loadDashboard();
            
            // Set up real-time updates
            this.setupRealTimeUpdates();
            
        } catch (error) {
            console.error('Initialization error:', error);
            this.showError('Failed to initialize dashboard');
        }
    }

    async loadStaffInfo() {
        try {
            const response = await fetch('/api/admin/profile', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to load staff info');
            }

            const data = await response.json();
            this.currentStaff = data.data;
            
            // Update UI
            document.getElementById('staffName').textContent = this.currentStaff.fullName;
            
            // Show/hide manager features
            if (this.currentStaff.permissions?.disputeAssignment) {
                document.getElementById('assignDisputesLink').style.display = 'block';
            }

        } catch (error) {
            console.error('Error loading staff info:', error);
            throw error;
        }
    }

    async loadDashboard() {
        try {
            // Load analytics for dashboard stats
            const analyticsResponse = await fetch(`${this.apiBaseUrl}/analytics?period=30`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
                    'Content-Type': 'application/json'
                }
            });

            if (analyticsResponse.ok) {
                const analyticsData = await analyticsResponse.json();
                this.updateDashboardStats(analyticsData.data);
            }

            // Load recent disputes
            await this.loadRecentDisputes();
            
            // Load category breakdown
            await this.loadCategoryBreakdown();

        } catch (error) {
            console.error('Error loading dashboard:', error);
            this.showError('Failed to load dashboard data');
        }
    }

    updateDashboardStats(data) {
        document.getElementById('totalDisputes').textContent = data.staff.totalAssigned || 0;
        document.getElementById('resolvedDisputes').textContent = data.staff.totalResolved || 0;
        document.getElementById('currentWorkload').textContent = data.staff.currentWorkload || 0;
        document.getElementById('avgResolutionTime').textContent = 
            data.resolutionStats.averageResolutionTime ? 
            Math.round(data.resolutionStats.averageResolutionTime * 10) / 10 : 0;
    }

    async loadRecentDisputes() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/my-disputes?limit=5`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to load recent disputes');
            }

            const data = await response.json();
            this.renderRecentDisputes(data.data.disputes);

        } catch (error) {
            console.error('Error loading recent disputes:', error);
            document.getElementById('recentDisputes').innerHTML = 
                '<div class="text-center text-muted">Failed to load recent disputes</div>';
        }
    }

    renderRecentDisputes(disputes) {
        const container = document.getElementById('recentDisputes');
        
        if (disputes.length === 0) {
            container.innerHTML = '<div class="text-center text-muted">No recent disputes</div>';
            return;
        }

        const html = disputes.map(dispute => `
            <div class="d-flex justify-content-between align-items-center mb-3 p-3 border rounded">
                <div>
                    <h6 class="mb-1">${dispute.disputeId}</h6>
                    <p class="mb-1 text-muted">${dispute.title}</p>
                    <small class="text-muted">
                        ${dispute.category.replace(/_/g, ' ')} • 
                        ${new Date(dispute.createdAt).toLocaleDateString()}
                    </small>
                </div>
                <div class="text-end">
                    <span class="status-badge status-${dispute.status}">${dispute.status}</span>
                    <br>
                    <button class="btn btn-sm btn-outline-primary mt-1" onclick="dashboard.viewDispute('${dispute.disputeId}')">
                        View Details
                    </button>
                </div>
            </div>
        `).join('');

        container.innerHTML = html;
    }

    async loadCategoryBreakdown() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/analytics?period=30`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to load category breakdown');
            }

            const data = await response.json();
            this.renderCategoryChart(data.data.categoryStats);

        } catch (error) {
            console.error('Error loading category breakdown:', error);
            document.getElementById('categoryChart').innerHTML = 
                '<div class="text-center text-muted">Failed to load category data</div>';
        }
    }

    renderCategoryChart(categoryStats) {
        const container = document.getElementById('categoryChart');
        
        if (!categoryStats || categoryStats.length === 0) {
            container.innerHTML = '<div class="text-center text-muted">No category data available</div>';
            return;
        }

        const ctx = document.createElement('canvas');
        ctx.id = 'categoryChartCanvas';
        container.innerHTML = '';
        container.appendChild(ctx);

        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: categoryStats.map(item => item._id.replace(/_/g, ' ')),
                datasets: [{
                    data: categoryStats.map(item => item.count),
                    backgroundColor: [
                        '#3498db', '#e74c3c', '#f39c12', '#27ae60', 
                        '#9b59b6', '#1abc9c', '#34495e', '#e67e22'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    async loadMyDisputes() {
        try {
            const statusFilter = document.getElementById('statusFilter').value;
            const url = `${this.apiBaseUrl}/my-disputes${statusFilter ? `?status=${statusFilter}` : ''}`;
            
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to load disputes');
            }

            const data = await response.json();
            this.renderMyDisputes(data.data.disputes);
            
            // Update dispute count
            document.getElementById('disputeCount').textContent = data.data.disputes.length;

        } catch (error) {
            console.error('Error loading my disputes:', error);
            document.getElementById('myDisputesList').innerHTML = 
                '<div class="text-center text-muted">Failed to load disputes</div>';
        }
    }

    renderMyDisputes(disputes) {
        const container = document.getElementById('myDisputesList');
        
        if (disputes.length === 0) {
            container.innerHTML = '<div class="text-center text-muted">No disputes found</div>';
            return;
        }

        const html = disputes.map(dispute => `
            <div class="card dispute-card mb-3 ${dispute.priority}-priority">
                <div class="card-body">
                    <div class="row align-items-center">
                        <div class="col-md-8">
                            <div class="d-flex align-items-center mb-2">
                                <h5 class="mb-0 me-3">${dispute.disputeId}</h5>
                                <span class="status-badge status-${dispute.status}">${dispute.status}</span>
                                <span class="priority-badge priority-${dispute.priority} ms-2">${dispute.priority}</span>
                            </div>
                            <h6 class="mb-1">${dispute.title}</h6>
                            <p class="text-muted mb-2">${dispute.description.substring(0, 100)}...</p>
                            <div class="d-flex align-items-center text-muted">
                                <small>
                                    <i class="fas fa-tag me-1"></i>${dispute.category.replace(/_/g, ' ')}
                                    <i class="fas fa-calendar ms-3 me-1"></i>${new Date(dispute.createdAt).toLocaleDateString()}
                                    <i class="fas fa-user ms-3 me-1"></i>${dispute.complainant?.userId?.fullName || 'Unknown'}
                                </small>
                            </div>
                        </div>
                        <div class="col-md-4 text-end">
                            <div class="btn-group-vertical">
                                <button class="btn btn-outline-primary btn-sm mb-1" onclick="dashboard.viewDispute('${dispute.disputeId}')">
                                    <i class="fas fa-eye me-1"></i>View Details
                                </button>
                                ${dispute.status !== 'resolved' ? `
                                    <button class="btn btn-success btn-sm" onclick="dashboard.showResolveModal('${dispute.disputeId}')">
                                        <i class="fas fa-check me-1"></i>Resolve
                                    </button>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');

        container.innerHTML = html;
    }

    async loadAvailableDisputes() {
        try {
            const categoryFilter = document.getElementById('categoryFilter').value;
            const url = `${this.apiBaseUrl}/available-disputes${categoryFilter ? `?category=${categoryFilter}` : ''}`;
            
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to load available disputes');
            }

            const data = await response.json();
            this.renderAvailableDisputes(data.data.disputes);

        } catch (error) {
            console.error('Error loading available disputes:', error);
            document.getElementById('availableDisputesList').innerHTML = 
                '<div class="text-center text-muted">Failed to load available disputes</div>';
        }
    }

    renderAvailableDisputes(disputes) {
        const container = document.getElementById('availableDisputesList');
        
        if (disputes.length === 0) {
            container.innerHTML = '<div class="text-center text-muted">No available disputes</div>';
            return;
        }

        const html = disputes.map(dispute => `
            <div class="card dispute-card mb-3 ${dispute.priority}-priority">
                <div class="card-body">
                    <div class="row align-items-center">
                        <div class="col-md-8">
                            <div class="d-flex align-items-center mb-2">
                                <h5 class="mb-0 me-3">${dispute.disputeId}</h5>
                                <span class="status-badge status-${dispute.status}">${dispute.status}</span>
                                <span class="priority-badge priority-${dispute.priority} ms-2">${dispute.priority}</span>
                            </div>
                            <h6 class="mb-1">${dispute.title}</h6>
                            <p class="text-muted mb-2">${dispute.description.substring(0, 100)}...</p>
                            <div class="d-flex align-items-center text-muted">
                                <small>
                                    <i class="fas fa-tag me-1"></i>${dispute.category.replace(/_/g, ' ')}
                                    <i class="fas fa-calendar ms-3 me-1"></i>${new Date(dispute.createdAt).toLocaleDateString()}
                                    <i class="fas fa-user ms-3 me-1"></i>${dispute.complainant?.userId?.fullName || 'Unknown'}
                                </small>
                            </div>
                        </div>
                        <div class="col-md-4 text-end">
                            <button class="btn btn-primary" onclick="dashboard.showAssignModal('${dispute.disputeId}')">
                                <i class="fas fa-user-plus me-1"></i>Assign
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');

        container.innerHTML = html;
    }

    async loadAnalytics() {
        try {
            const period = document.getElementById('analyticsPeriod').value;
            const response = await fetch(`${this.apiBaseUrl}/analytics?period=${period}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to load analytics');
            }

            const data = await response.json();
            this.renderAnalytics(data.data);

        } catch (error) {
            console.error('Error loading analytics:', error);
            document.getElementById('analyticsContent').innerHTML = 
                '<div class="text-center text-muted">Failed to load analytics</div>';
        }
    }

    renderAnalytics(data) {
        const container = document.getElementById('analyticsContent');
        
        const html = `
            <div class="row">
                <div class="col-md-6 mb-4">
                    <div class="card">
                        <div class="card-header">
                            <h5><i class="fas fa-chart-line me-2"></i>Performance Overview</h5>
                        </div>
                        <div class="card-body">
                            <div class="row text-center">
                                <div class="col-4">
                                    <h4 class="text-primary">${data.staff.totalAssigned}</h4>
                                    <small class="text-muted">Total Assigned</small>
                                </div>
                                <div class="col-4">
                                    <h4 class="text-success">${data.staff.totalResolved}</h4>
                                    <small class="text-muted">Resolved</small>
                                </div>
                                <div class="col-4">
                                    <h4 class="text-warning">${data.staff.currentWorkload}</h4>
                                    <small class="text-muted">Current Workload</small>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-md-6 mb-4">
                    <div class="card">
                        <div class="card-header">
                            <h5><i class="fas fa-clock me-2"></i>Resolution Time</h5>
                        </div>
                        <div class="card-body">
                            <div class="row text-center">
                                <div class="col-4">
                                    <h4 class="text-info">${data.resolutionStats.averageResolutionTime ? Math.round(data.resolutionStats.averageResolutionTime * 10) / 10 : 0}</h4>
                                    <small class="text-muted">Avg. Days</small>
                                </div>
                                <div class="col-4">
                                    <h4 class="text-success">${data.resolutionStats.minResolutionTime ? Math.round(data.resolutionStats.minResolutionTime * 10) / 10 : 0}</h4>
                                    <small class="text-muted">Fastest</small>
                                </div>
                                <div class="col-4">
                                    <h4 class="text-warning">${data.resolutionStats.maxResolutionTime ? Math.round(data.resolutionStats.maxResolutionTime * 10) / 10 : 0}</h4>
                                    <small class="text-muted">Longest</small>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="row">
                <div class="col-md-12">
                    <div class="card">
                        <div class="card-header">
                            <h5><i class="fas fa-chart-pie me-2"></i>Category Breakdown</h5>
                        </div>
                        <div class="card-body">
                            <div class="chart-container">
                                <canvas id="analyticsCategoryChart"></canvas>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        container.innerHTML = html;

        // Render category chart
        if (data.categoryStats && data.categoryStats.length > 0) {
            const ctx = document.getElementById('analyticsCategoryChart');
            new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: data.categoryStats.map(item => item._id.replace(/_/g, ' ')),
                    datasets: [{
                        label: 'Disputes',
                        data: data.categoryStats.map(item => item.count),
                        backgroundColor: '#3498db'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });
        }
    }

    async viewDispute(disputeId) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/dispute/${disputeId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to load dispute details');
            }

            const data = await response.json();
            this.currentDispute = data.data;
            this.renderDisputeModal();

        } catch (error) {
            console.error('Error loading dispute details:', error);
            this.showError('Failed to load dispute details');
        }
    }

    renderDisputeModal() {
        const dispute = this.currentDispute;
        document.getElementById('modalDisputeId').textContent = dispute.disputeId;
        
        const html = `
            <div class="row">
                <div class="col-md-8">
                    <div class="card mb-3">
                        <div class="card-header">
                            <h5><i class="fas fa-info-circle me-2"></i>Dispute Information</h5>
                        </div>
                        <div class="card-body">
                            <div class="row mb-3">
                                <div class="col-sm-3"><strong>Title:</strong></div>
                                <div class="col-sm-9">${dispute.title}</div>
                            </div>
                            <div class="row mb-3">
                                <div class="col-sm-3"><strong>Description:</strong></div>
                                <div class="col-sm-9">${dispute.description}</div>
                            </div>
                            <div class="row mb-3">
                                <div class="col-sm-3"><strong>Category:</strong></div>
                                <div class="col-sm-9">
                                    <span class="badge bg-primary">${dispute.category.replace(/_/g, ' ')}</span>
                                </div>
                            </div>
                            <div class="row mb-3">
                                <div class="col-sm-3"><strong>Status:</strong></div>
                                <div class="col-sm-9">
                                    <span class="status-badge status-${dispute.status}">${dispute.status}</span>
                                </div>
                            </div>
                            <div class="row mb-3">
                                <div class="col-sm-3"><strong>Priority:</strong></div>
                                <div class="col-sm-9">
                                    <span class="priority-badge priority-${dispute.priority}">${dispute.priority}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="card">
                        <div class="card-header">
                            <h5><i class="fas fa-comments me-2"></i>Messages</h5>
                        </div>
                        <div class="card-body" style="max-height: 400px; overflow-y: auto;">
                            <div id="disputeMessages">
                                ${this.renderMessages(dispute.messages)}
                            </div>
                            <div class="mt-3">
                                <div class="input-group">
                                    <input type="text" class="form-control" id="newMessage" placeholder="Type a message...">
                                    <button class="btn btn-primary" onclick="dashboard.sendMessage()">
                                        <i class="fas fa-paper-plane"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="card mb-3">
                        <div class="card-header">
                            <h5><i class="fas fa-users me-2"></i>Parties</h5>
                        </div>
                        <div class="card-body">
                            <div class="mb-3">
                                <strong>Complainant:</strong><br>
                                <small class="text-muted">${dispute.complainant?.userId?.fullName || 'Unknown'}</small>
                            </div>
                            <div class="mb-3">
                                <strong>Respondent:</strong><br>
                                <small class="text-muted">${dispute.respondent?.userId?.fullName || dispute.respondent?.userId?.businessName || 'Unknown'}</small>
                            </div>
                        </div>
                    </div>

                    <div class="card mb-3">
                        <div class="card-header">
                            <h5><i class="fas fa-shopping-cart me-2"></i>Order Details</h5>
                        </div>
                        <div class="card-body">
                            <div class="mb-2">
                                <strong>Order ID:</strong> ${dispute.order?.orderId || 'N/A'}
                            </div>
                            <div class="mb-2">
                                <strong>Amount:</strong> $${dispute.order?.totalAmount || 'N/A'}
                            </div>
                        </div>
                    </div>

                    ${dispute.status !== 'resolved' ? `
                        <div class="card">
                            <div class="card-header">
                                <h5><i class="fas fa-tools me-2"></i>Actions</h5>
                            </div>
                            <div class="card-body">
                                <button class="btn btn-success w-100 mb-2" onclick="dashboard.showResolveModal('${dispute.disputeId}')">
                                    <i class="fas fa-check me-1"></i>Resolve Dispute
                                </button>
                                <button class="btn btn-warning w-100" onclick="dashboard.updateStatus('${dispute.disputeId}', 'under_review')">
                                    <i class="fas fa-eye me-1"></i>Mark Under Review
                                </button>
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;

        document.getElementById('disputeModalContent').innerHTML = html;
        new bootstrap.Modal(document.getElementById('disputeModal')).show();
    }

    renderMessages(messages) {
        if (!messages || messages.length === 0) {
            return '<div class="text-center text-muted">No messages yet</div>';
        }

        return messages.map(message => `
            <div class="message-bubble ${message.sender.userType === 'Admin' ? 'message-sent' : 'message-received'} ${message.isInternal ? 'message-internal' : ''}">
                <div class="d-flex justify-content-between align-items-start">
                    <div>
                        <strong>${message.sender.userId?.fullName || message.sender.userType}</strong>
                        <div>${message.message}</div>
                    </div>
                    <small class="text-muted">${new Date(message.createdAt).toLocaleString()}</small>
                </div>
            </div>
        `).join('');
    }

    async sendMessage() {
        const messageInput = document.getElementById('newMessage');
        const message = messageInput.value.trim();
        
        if (!message) return;

        try {
            const response = await fetch(`${this.apiBaseUrl}/dispute/${this.currentDispute.disputeId}/message`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ message })
            });

            if (!response.ok) {
                throw new Error('Failed to send message');
            }

            messageInput.value = '';
            await this.viewDispute(this.currentDispute.disputeId);

        } catch (error) {
            console.error('Error sending message:', error);
            this.showError('Failed to send message');
        }
    }

    showResolveModal(disputeId) {
        this.currentDisputeId = disputeId;
        new bootstrap.Modal(document.getElementById('resolveModal')).show();
    }

    async submitResolution() {
        const decision = document.getElementById('resolutionDecision').value;
        const reason = document.getElementById('resolutionReason').value;
        const refundAmount = document.getElementById('refundAmount').value;
        const notes = document.getElementById('resolutionNotes').value;

        if (!decision || !reason) {
            this.showError('Please fill in all required fields');
            return;
        }

        try {
            const response = await fetch(`${this.apiBaseUrl}/dispute/${this.currentDisputeId}/resolve`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    decision,
                    reason,
                    refundAmount: refundAmount ? parseFloat(refundAmount) : 0,
                    notes
                })
            });

            if (!response.ok) {
                throw new Error('Failed to resolve dispute');
            }

            bootstrap.Modal.getInstance(document.getElementById('resolveModal')).hide();
            this.showSuccess('Dispute resolved successfully');
            
            // Refresh current view
            if (document.getElementById('myDisputesView').style.display !== 'none') {
                await this.loadMyDisputes();
            }
            await this.loadDashboard();

        } catch (error) {
            console.error('Error resolving dispute:', error);
            this.showError('Failed to resolve dispute');
        }
    }

    showAssignModal(disputeId) {
        this.currentDisputeId = disputeId;
        this.loadStaffForAssignment();
        new bootstrap.Modal(document.getElementById('assignModal')).show();
    }

    async loadStaffForAssignment() {
        try {
            const response = await fetch('/api/admin/staff/available', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to load staff');
            }

            const data = await response.json();
            const select = document.getElementById('assignToStaff');
            
            select.innerHTML = '<option value="">Select Staff Member</option>';
            data.data.forEach(staff => {
                const option = document.createElement('option');
                option.value = staff._id;
                option.textContent = `${staff.fullName} (${staff.role}) - ${staff.activityStats?.currentDisputes?.length || 0}/${staff.maxConcurrentDisputes}`;
                select.appendChild(option);
            });

        } catch (error) {
            console.error('Error loading staff:', error);
            this.showError('Failed to load staff members');
        }
    }

    async submitAssignment() {
        const assignedTo = document.getElementById('assignToStaff').value;
        const notes = document.getElementById('assignNotes').value;

        if (!assignedTo) {
            this.showError('Please select a staff member');
            return;
        }

        try {
            const response = await fetch(`${this.apiBaseUrl}/dispute/${this.currentDisputeId}/assign`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    assignedTo,
                    notes
                })
            });

            if (!response.ok) {
                throw new Error('Failed to assign dispute');
            }

            bootstrap.Modal.getInstance(document.getElementById('assignModal')).hide();
            this.showSuccess('Dispute assigned successfully');
            
            // Refresh available disputes
            await this.loadAvailableDisputes();

        } catch (error) {
            console.error('Error assigning dispute:', error);
            this.showError('Failed to assign dispute');
        }
    }

    async updateStatus(disputeId, status) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/dispute/${disputeId}/status`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status })
            });

            if (!response.ok) {
                throw new Error('Failed to update status');
            }

            this.showSuccess('Status updated successfully');
            await this.viewDispute(disputeId);

        } catch (error) {
            console.error('Error updating status:', error);
            this.showError('Failed to update status');
        }
    }

    // Navigation functions
    showDashboard() {
        this.hideAllViews();
        document.getElementById('dashboardView').style.display = 'block';
        document.querySelector('.nav-link[href="#"]').classList.remove('active');
        document.querySelector('.nav-link[onclick="showDashboard()"]').classList.add('active');
        this.loadDashboard();
    }

    showMyDisputes() {
        this.hideAllViews();
        document.getElementById('myDisputesView').style.display = 'block';
        document.querySelector('.nav-link[href="#"]').classList.remove('active');
        document.querySelector('.nav-link[onclick="showMyDisputes()"]').classList.add('active');
        this.loadMyDisputes();
    }

    showAvailableDisputes() {
        this.hideAllViews();
        document.getElementById('availableDisputesView').style.display = 'block';
        document.querySelector('.nav-link[href="#"]').classList.remove('active');
        document.querySelector('.nav-link[onclick="showAvailableDisputes()"]').classList.add('active');
        this.loadAvailableDisputes();
    }

    showAnalytics() {
        this.hideAllViews();
        document.getElementById('analyticsView').style.display = 'block';
        document.querySelector('.nav-link[href="#"]').classList.remove('active');
        document.querySelector('.nav-link[onclick="showAnalytics()"]').classList.add('active');
        this.loadAnalytics();
    }

    showSettings() {
        this.showError('Settings feature coming soon!');
    }

    hideAllViews() {
        document.getElementById('dashboardView').style.display = 'none';
        document.getElementById('myDisputesView').style.display = 'none';
        document.getElementById('availableDisputesView').style.display = 'none';
        document.getElementById('analyticsView').style.display = 'none';
    }

    // Utility functions
    showSuccess(message) {
        this.showAlert(message, 'success');
    }

    showError(message) {
        this.showAlert(message, 'danger');
    }

    showAlert(message, type) {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
        alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        document.body.appendChild(alertDiv);
        
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.parentNode.removeChild(alertDiv);
            }
        }, 5000);
    }

    redirectToLogin() {
        window.location.href = '/admin-login.html';
    }

    setupRealTimeUpdates() {
        // Set up periodic refresh for dashboard
        setInterval(() => {
            if (document.getElementById('dashboardView').style.display !== 'none') {
                this.loadDashboard();
            }
        }, 30000); // Refresh every 30 seconds
    }

    async refreshDashboard() {
        await this.loadDashboard();
        this.showSuccess('Dashboard refreshed');
    }

    filterDisputes() {
        this.loadMyDisputes();
    }

    filterAvailableDisputes() {
        this.loadAvailableDisputes();
    }
}

// Global functions for onclick handlers
function showDashboard() { dashboard.showDashboard(); }
function showMyDisputes() { dashboard.showMyDisputes(); }
function showAvailableDisputes() { dashboard.showAvailableDisputes(); }
function showAnalytics() { dashboard.showAnalytics(); }
function showSettings() { dashboard.showSettings(); }
function refreshDashboard() { dashboard.refreshDashboard(); }
function filterDisputes() { dashboard.filterDisputes(); }
function filterAvailableDisputes() { dashboard.filterAvailableDisputes(); }
function loadMyDisputes() { dashboard.loadMyDisputes(); }
function loadAvailableDisputes() { dashboard.loadAvailableDisputes(); }
function loadAnalytics() { dashboard.loadAnalytics(); }
function submitResolution() { dashboard.submitResolution(); }
function submitAssignment() { dashboard.submitAssignment(); }

function logout() {
    localStorage.removeItem('adminToken');
    window.location.href = '/admin-login.html';
}

// Initialize dashboard when page loads
let dashboard;
document.addEventListener('DOMContentLoaded', () => {
    dashboard = new StaffDisputeDashboard();
});
