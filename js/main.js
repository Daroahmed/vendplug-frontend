// Only run this if login form is present
document.getElementById('loginForm')?.addEventListener('submit', async function (e) {
    e.preventDefault();
  
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
  
    const response = await fetch('/api/sellers/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
  
    const data = await response.json();
  
    if (response.ok) {
      // Save the token and role to localStorage
      localStorage.setItem('token', data.token);
      localStorage.setItem('role', data.user.role);
      localStorage.setItem('name', data.user.fullName); // optional
  
      // Redirect to the right dashboard
      if (data.user.role === 'seller') {
        window.location.href = '/seller-dashboard.html';
      } else if (data.user.role === 'agent') {
        window.location.href = '/agent-dashboard.html';
      } else if (data.user.role === 'buyer') {
        window.location.href = '/buyer-dashboard.html';
      } else {
        window.location.href = '/';
      }
    } else {
      alert('❌ ' + data.message);
    }
  });
  