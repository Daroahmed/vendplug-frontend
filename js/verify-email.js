console.log("✅ verify-email.js loaded");

const BACKEND = window.BACKEND_URL || "";

// Get token from URL
const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get('token');
const messageEl = document.getElementById('verificationMessage');
const verificationForm = document.getElementById('verificationForm');
const autoVerification = document.getElementById('autoVerification');

// Function to verify email
async function verifyEmail(verificationToken) {
    try {
        const res = await fetch(`${BACKEND}/api/auth/verify-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: verificationToken })
        });

        const data = await res.json();

        if (res.ok) {
            messageEl.textContent = 'Email verified successfully! Redirecting to login...';
            messageEl.style.color = 'green';
            setTimeout(() => window.location.href = 'login.html', 2000);
        } else {
            messageEl.textContent = data.message || 'Verification failed';
            messageEl.style.color = 'red';
            // Show manual verification form if auto-verification fails
            autoVerification.style.display = 'none';
            verificationForm.style.display = 'block';
        }
    } catch (err) {
        console.error('❌ Verification error:', err);
        messageEl.textContent = 'Error verifying email';
        messageEl.style.color = 'red';
        // Show manual verification form on error
        autoVerification.style.display = 'none';
        verificationForm.style.display = 'block';
    }
}

// Handle manual verification form submission
verificationForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const manualToken = document.getElementById('verificationToken').value;
    await verifyEmail(manualToken);
});

// Handle resend verification email
document.getElementById('resendLink').addEventListener('click', async (e) => {
    e.preventDefault();
    
    // Get user email and role from localStorage or prompt user
    const userEmail = localStorage.getItem('pendingVerificationEmail');
    const userRole = localStorage.getItem('pendingVerificationRole');

    if (!userEmail || !userRole) {
        messageEl.textContent = 'Please go back to registration and try again';
        messageEl.style.color = 'red';
        return;
    }

    try {
        const res = await fetch(`${BACKEND}/api/auth/send-verification`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: userEmail, role: userRole })
        });

        const data = await res.json();

        if (res.ok) {
            messageEl.textContent = 'Verification email sent! Please check your inbox';
            messageEl.style.color = 'green';
        } else {
            messageEl.textContent = data.message || 'Failed to send verification email';
            messageEl.style.color = 'red';
        }
    } catch (err) {
        console.error('❌ Resend verification error:', err);
        messageEl.textContent = 'Error sending verification email';
        messageEl.style.color = 'red';
    }
});

// Auto-verify if token is present in URL
if (token) {
    verifyEmail(token);
} else {
    // Show manual verification form if no token in URL
    autoVerification.style.display = 'none';
    verificationForm.style.display = 'block';
}
