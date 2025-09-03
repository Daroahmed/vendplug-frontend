// frontend/js/staff-management.js
class StaffManagement {
    constructor() {
        this.currentAdmin = null;
        this.staffList = [];
        this.filteredStaff = [];
        this.apiBaseUrl = '/api/admin';
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
            // Get admin info
            await this.loadAdminInfo();
            
            // Load staff list
            await this.loadStaffList();
            
        } catch (error) {
            console.error('Initialization error:', error);
            this.showError('Failed to initialize staff management');
        }
    }

    async loadAdminInfo() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/profile`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to load admin info');
            }

            const data = await response.json();
            this.currentAdmin = data.data;
            
            // Update UI
            document.getElementById('adminName').textContent = this.currentAdmin.fullName;

        } catch (error) {
            console.error('Error loading admin info:', error);
            throw error;
        }
    }

    async loadStaffList() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/staff`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to load staff list');
            }

            const data = await response.json();
            this.staffList = data.data;
            this.filteredStaff = [...this.staffList];
            
            this.updateStats();
            this.renderStaffList();

        } catch (error) {
            console.error('Error loading staff list:', error);
            document.getElementById('staffList').innerHTML = 
                '<div class="text-center text-muted">Failed to load staff list</div>';
        }
    }

    updateStats() {
        const totalStaff = this.staffList.length;
        const activeStaff = this.staffList.filter(s => s.isActive).length;
        
        // Calculate average workload
        const totalWorkload = this.staffList.reduce((sum, staff) => {
            const currentWorkload = staff.activityStats?.currentDisputes?.length || 0;
            const maxWorkload = staff.maxConcurrentDisputes || 1;
            return sum + (currentWorkload / maxWorkload);
        }, 0);
        const avgWorkload = totalStaff > 0 ? Math.round((totalWorkload / totalStaff) * 100) : 0;
        
        // Count overloaded staff
        const overloadedStaff = this.staffList.filter(staff => {
            const currentWorkload = staff.activityStats?.currentDisputes?.length || 0;
            const maxWorkload = staff.maxConcurrentDisputes || 1;
            return currentWorkload >= maxWorkload;
        }).length;

        document.getElementById('totalStaff').textContent = totalStaff;
        document.getElementById('activeStaff').textContent = activeStaff;
        document.getElementById('avgWorkload').textContent = `${avgWorkload}%`;
        document.getElementById('overloadedStaff').textContent = overloadedStaff;
    }

    renderStaffList() {
        const container = document.getElementById('staffList');
        
        if (this.filteredStaff.length === 0) {
            container.innerHTML = '<div class="text-center text-muted">No staff members found</div>';
            return;
        }

        const html = this.filteredStaff.map(staff => {
            const currentWorkload = staff.activityStats?.currentDisputes?.length || 0;
            const maxWorkload = staff.maxConcurrentDisputes || 1;
            const workloadPercentage = Math.round((currentWorkload / maxWorkload) * 100);
            
            const roleClass = staff.role.replace('dispute_', '');
            const statusClass = staff.isActive ? 'active' : 'inactive';
            
            return `
                <div class="card staff-card mb-3 ${roleClass} ${!staff.isActive ? 'inactive' : ''}">
                    <div class="card-body">
                        <div class="row align-items-center">
                            <div class="col-md-3">
                                <div class="d-flex align-items-center">
                                    <div class="me-3">
                                        <div class="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center" style="width: 50px; height: 50px;">
                                            <i class="fas fa-user"></i>
                                        </div>
                                    </div>
                                    <div>
                                        <h6 class="mb-1">${staff.fullName}</h6>
                                        <p class="text-muted mb-0">${staff.email}</p>
                                        <small class="text-muted">@${staff.username}</small>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-2">
                                <span class="role-badge role-${roleClass}">${staff.role.replace('dispute_', '').replace('_', ' ')}</span>
                                <br>
                                <span class="status-badge status-${statusClass}">${staff.isActive ? 'Active' : 'Inactive'}</span>
                            </div>
                            <div class="col-md-2">
                                <div class="text-center">
                                    <h6 class="mb-1">${currentWorkload}/${maxWorkload}</h6>
                                    <small class="text-muted">Current Disputes</small>
                                    <div class="workload-bar mt-1">
                                        <div class="workload-fill" style="width: ${workloadPercentage}%"></div>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-3">
                                <div class="row text-center">
                                    <div class="col-4">
                                        <h6 class="mb-1">${staff.activityStats?.disputesAssigned || 0}</h6>
                                        <small class="text-muted">Assigned</small>
                                    </div>
                                    <div class="col-4">
                                        <h6 class="mb-1">${staff.activityStats?.disputesResolved || 0}</h6>
                                        <small class="text-muted">Resolved</small>
                                    </div>
                                    <div class="col-4">
                                        <h6 class="mb-1">${staff.disputeSpecialties?.length || 0}</h6>
                                        <small class="text-muted">Specialties</small>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-2 text-end">
                                <div class="btn-group-vertical">
                                    <button class="btn btn-outline-primary btn-sm mb-1" onclick="staffManager.editStaff('${staff._id}')">
                                        <i class="fas fa-edit me-1"></i>Edit
                                    </button>
                                    <button class="btn btn-outline-${staff.isActive ? 'warning' : 'success'} btn-sm" onclick="staffManager.toggleStaffStatus('${staff._id}', ${staff.isActive})">
                                        <i class="fas fa-${staff.isActive ? 'pause' : 'play'} me-1"></i>${staff.isActive ? 'Deactivate' : 'Activate'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = html;
    }

    filterStaff() {
        const roleFilter = document.getElementById('roleFilter').value;
        const statusFilter = document.getElementById('statusFilter').value;
        const searchTerm = document.getElementById('searchInput').value.toLowerCase();

        this.filteredStaff = this.staffList.filter(staff => {
            const matchesRole = !roleFilter || staff.role === roleFilter;
            const matchesStatus = !statusFilter || 
                (statusFilter === 'active' && staff.isActive) ||
                (statusFilter === 'inactive' && !staff.isActive);
            const matchesSearch = !searchTerm || 
                staff.fullName.toLowerCase().includes(searchTerm) ||
                staff.email.toLowerCase().includes(searchTerm) ||
                staff.username.toLowerCase().includes(searchTerm) ||
                staff.role.toLowerCase().includes(searchTerm);

            return matchesRole && matchesStatus && matchesSearch;
        });

        this.renderStaffList();
    }

    clearFilters() {
        document.getElementById('roleFilter').value = '';
        document.getElementById('statusFilter').value = '';
        document.getElementById('searchInput').value = '';
        this.filteredStaff = [...this.staffList];
        this.renderStaffList();
    }

    showCreateStaffModal() {
        // Reset form
        document.getElementById('createStaffForm').reset();
        document.getElementById('permissionsContainer').innerHTML = '';
        
        new bootstrap.Modal(document.getElementById('createStaffModal')).show();
    }

    updateRolePermissions() {
        const role = document.getElementById('staffRole').value;
        const container = document.getElementById('permissionsContainer');
        
        if (!role) {
            container.innerHTML = '';
            return;
        }

        const permissions = this.getRolePermissions(role);
        const html = Object.entries(permissions).map(([key, value]) => `
            <div class="permission-toggle">
                <div>
                    <strong>${this.formatPermissionName(key)}</strong>
                    <br>
                    <small class="text-muted">${this.getPermissionDescription(key)}</small>
                </div>
                <div class="form-check form-switch">
                    <input class="form-check-input" type="checkbox" id="perm_${key}" ${value ? 'checked' : ''}>
                </div>
            </div>
        `).join('');

        container.innerHTML = html;
    }

    updateEditRolePermissions() {
        const role = document.getElementById('editStaffRole').value;
        const container = document.getElementById('editPermissionsContainer');
        
        if (!role) {
            container.innerHTML = '';
            return;
        }

        const permissions = this.getRolePermissions(role);
        const html = Object.entries(permissions).map(([key, value]) => `
            <div class="permission-toggle">
                <div>
                    <strong>${this.formatPermissionName(key)}</strong>
                    <br>
                    <small class="text-muted">${this.getPermissionDescription(key)}</small>
                </div>
                <div class="form-check form-switch">
                    <input class="form-check-input" type="checkbox" id="editPerm_${key}" ${value ? 'checked' : ''}>
                </div>
            </div>
        `).join('');

        container.innerHTML = html;
    }

    getRolePermissions(role) {
        const defaultPermissions = {
            disputeResolution: false,
            disputeAssignment: false,
            userManagement: false,
            analytics: false,
            orderManagement: false,
            payoutManagement: false
        };

        switch (role) {
            case 'dispute_manager':
                return {
                    disputeResolution: true,
                    disputeAssignment: true,
                    userManagement: true,
                    analytics: true,
                    orderManagement: true,
                    payoutManagement: true
                };
            case 'dispute_specialist':
                return {
                    disputeResolution: true,
                    disputeAssignment: false,
                    userManagement: false,
                    analytics: true,
                    orderManagement: true,
                    payoutManagement: false
                };
            case 'dispute_analyst':
                return {
                    disputeResolution: true,
                    disputeAssignment: false,
                    userManagement: false,
                    analytics: true,
                    orderManagement: false,
                    payoutManagement: false
                };
            default:
                return defaultPermissions;
        }
    }

    formatPermissionName(key) {
        return key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
    }

    getPermissionDescription(key) {
        const descriptions = {
            disputeResolution: 'Can view and resolve assigned disputes',
            disputeAssignment: 'Can assign disputes to other staff members',
            userManagement: 'Can manage user accounts and permissions',
            analytics: 'Can view performance analytics and reports',
            orderManagement: 'Can view and manage orders',
            payoutManagement: 'Can manage payout requests'
        };
        return descriptions[key] || '';
    }

    async createStaff() {
        try {
            // Validate form
            const form = document.getElementById('createStaffForm');
            if (!form.checkValidity()) {
                form.reportValidity();
                return;
            }

            // Get form data
            const formData = {
                fullName: document.getElementById('staffFullName').value,
                email: document.getElementById('staffEmail').value,
                username: document.getElementById('staffUsername').value,
                password: document.getElementById('staffPassword').value,
                role: document.getElementById('staffRole').value,
                maxConcurrentDisputes: parseInt(document.getElementById('maxDisputes').value),
                disputeSpecialties: this.getSelectedSpecialties(),
                permissions: this.getSelectedPermissions('perm_')
            };

            // Validate specialties
            if (formData.disputeSpecialties.length === 0) {
                this.showError('Please select at least one dispute specialty');
                return;
            }

            const response = await fetch(`${this.apiBaseUrl}/staff`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to create staff member');
            }

            bootstrap.Modal.getInstance(document.getElementById('createStaffModal')).hide();
            this.showSuccess('Staff member created successfully');
            await this.loadStaffList();

        } catch (error) {
            console.error('Error creating staff:', error);
            this.showError(error.message || 'Failed to create staff member');
        }
    }

    getSelectedSpecialties() {
        const specialties = [];
        const checkboxes = document.querySelectorAll('input[type="checkbox"]:checked');
        checkboxes.forEach(checkbox => {
            if (checkbox.value && !checkbox.id.startsWith('perm_')) {
                specialties.push(checkbox.value);
            }
        });
        return specialties;
    }

    getSelectedPermissions(prefix) {
        const permissions = {};
        const checkboxes = document.querySelectorAll(`input[id^="${prefix}"]`);
        checkboxes.forEach(checkbox => {
            const key = checkbox.id.replace(prefix, '');
            permissions[key] = checkbox.checked;
        });
        return permissions;
    }

    async editStaff(staffId) {
        try {
            const staff = this.staffList.find(s => s._id === staffId);
            if (!staff) {
                this.showError('Staff member not found');
                return;
            }

            // Populate form
            document.getElementById('editStaffId').value = staff._id;
            document.getElementById('editStaffFullName').value = staff.fullName;
            document.getElementById('editStaffEmail').value = staff.email;
            document.getElementById('editStaffUsername').value = staff.username;
            document.getElementById('editStaffRole').value = staff.role;
            document.getElementById('editMaxDisputes').value = staff.maxConcurrentDisputes;
            document.getElementById('editStaffStatus').value = staff.isActive ? 'active' : 'inactive';

            // Set specialties
            document.querySelectorAll('input[id^="editSpec"]').forEach(checkbox => {
                checkbox.checked = staff.disputeSpecialties?.includes(checkbox.value) || false;
            });

            // Set permissions
            this.updateEditRolePermissions();
            setTimeout(() => {
                if (staff.permissions) {
                    Object.entries(staff.permissions).forEach(([key, value]) => {
                        const checkbox = document.getElementById(`editPerm_${key}`);
                        if (checkbox) {
                            checkbox.checked = value;
                        }
                    });
                }
            }, 100);

            new bootstrap.Modal(document.getElementById('editStaffModal')).show();

        } catch (error) {
            console.error('Error loading staff for edit:', error);
            this.showError('Failed to load staff information');
        }
    }

    async updateStaff() {
        try {
            const staffId = document.getElementById('editStaffId').value;
            
            const formData = {
                fullName: document.getElementById('editStaffFullName').value,
                email: document.getElementById('editStaffEmail').value,
                username: document.getElementById('editStaffUsername').value,
                role: document.getElementById('editStaffRole').value,
                maxConcurrentDisputes: parseInt(document.getElementById('editMaxDisputes').value),
                isActive: document.getElementById('editStaffStatus').value === 'active',
                disputeSpecialties: this.getSelectedEditSpecialties(),
                permissions: this.getSelectedPermissions('editPerm_')
            };

            const response = await fetch(`${this.apiBaseUrl}/staff/${staffId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to update staff member');
            }

            bootstrap.Modal.getInstance(document.getElementById('editStaffModal')).hide();
            this.showSuccess('Staff member updated successfully');
            await this.loadStaffList();

        } catch (error) {
            console.error('Error updating staff:', error);
            this.showError(error.message || 'Failed to update staff member');
        }
    }

    getSelectedEditSpecialties() {
        const specialties = [];
        const checkboxes = document.querySelectorAll('input[id^="editSpec"]:checked');
        checkboxes.forEach(checkbox => {
            specialties.push(checkbox.value);
        });
        return specialties;
    }

    async toggleStaffStatus(staffId, currentStatus) {
        try {
            const action = currentStatus ? 'deactivate' : 'activate';
            const confirmMessage = `Are you sure you want to ${action} this staff member?`;
            
            if (!confirm(confirmMessage)) {
                return;
            }

            const response = await fetch(`${this.apiBaseUrl}/staff/${staffId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    isActive: !currentStatus
                })
            });

            if (!response.ok) {
                throw new Error('Failed to update staff status');
            }

            this.showSuccess(`Staff member ${action}d successfully`);
            await this.loadStaffList();

        } catch (error) {
            console.error('Error toggling staff status:', error);
            this.showError('Failed to update staff status');
        }
    }

    async resetStaffPassword() {
        try {
            const staffId = document.getElementById('editStaffId').value;
            const newPassword = prompt('Enter new password for this staff member:');
            
            if (!newPassword) {
                return;
            }

            if (newPassword.length < 8) {
                this.showError('Password must be at least 8 characters long');
                return;
            }

            const response = await fetch(`${this.apiBaseUrl}/staff/${staffId}/reset-password`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ newPassword })
            });

            if (!response.ok) {
                throw new Error('Failed to reset password');
            }

            this.showSuccess('Password reset successfully');

        } catch (error) {
            console.error('Error resetting password:', error);
            this.showError('Failed to reset password');
        }
    }

    showBulkImportModal() {
        new bootstrap.Modal(document.getElementById('bulkImportModal')).show();
    }

    downloadTemplate() {
        const csvContent = 'fullName,email,username,password,role,maxConcurrentDisputes,disputeSpecialties\n' +
            'John Doe,john.doe@company.com,john.doe,Password123!,dispute_specialist,10,"product_not_received,delivery_issues"\n' +
            'Jane Smith,jane.smith@company.com,jane.smith,Password123!,dispute_analyst,8,"payment_issues,communication_issues"';
        
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'staff_import_template.csv';
        a.click();
        window.URL.revokeObjectURL(url);
    }

    previewCSV() {
        const file = document.getElementById('csvFile').files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const csv = e.target.result;
            const lines = csv.split('\n');
            const headers = lines[0].split(',');
            
            document.getElementById('csvHeaders').innerHTML = 
                headers.map(h => `<th>${h}</th>`).join('');
            
            const rows = lines.slice(1, 6).map(line => 
                `<tr>${line.split(',').map(cell => `<td>${cell}</td>`).join('')}</tr>`
            ).join('');
            
            document.getElementById('csvRows').innerHTML = rows;
            document.getElementById('csvPreview').style.display = 'block';
            document.getElementById('importBtn').disabled = false;
        };
        reader.readAsText(file);
    }

    async importStaff() {
        try {
            const file = document.getElementById('csvFile').files[0];
            if (!file) {
                this.showError('Please select a CSV file');
                return;
            }

            const formData = new FormData();
            formData.append('csvFile', file);

            const response = await fetch(`${this.apiBaseUrl}/staff/bulk-import`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
                },
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to import staff');
            }

            const result = await response.json();
            bootstrap.Modal.getInstance(document.getElementById('bulkImportModal')).hide();
            this.showSuccess(`Successfully imported ${result.data.imported} staff members`);
            await this.loadStaffList();

        } catch (error) {
            console.error('Error importing staff:', error);
            this.showError(error.message || 'Failed to import staff');
        }
    }

    async refreshStaffList() {
        await this.loadStaffList();
        this.showSuccess('Staff list refreshed');
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
}

// Global functions for onclick handlers
function showCreateStaffModal() { staffManager.showCreateStaffModal(); }
function showBulkImportModal() { staffManager.showBulkImportModal(); }
function refreshStaffList() { staffManager.refreshStaffList(); }
function filterStaff() { staffManager.filterStaff(); }
function clearFilters() { staffManager.clearFilters(); }
function updateRolePermissions() { staffManager.updateRolePermissions(); }
function updateEditRolePermissions() { staffManager.updateEditRolePermissions(); }
function createStaff() { staffManager.createStaff(); }
function updateStaff() { staffManager.updateStaff(); }
function resetStaffPassword() { staffManager.resetStaffPassword(); }
function downloadTemplate() { staffManager.downloadTemplate(); }
function previewCSV() { staffManager.previewCSV(); }
function importStaff() { staffManager.importStaff(); }

function logout() {
    localStorage.removeItem('adminToken');
    window.location.href = '/admin-login.html';
}

// Initialize staff manager when page loads
let staffManager;
document.addEventListener('DOMContentLoaded', () => {
    staffManager = new StaffManagement();
});
