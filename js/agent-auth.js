document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById("agentLoginForm");
    const registerForm = document.getElementById("agentRegisterForm");
    const loginMsg = document.getElementById("loginMessage");
    const registerMsg = document.getElementById("registerMessage");
  
    const showLoginBtn = document.getElementById("showAgentLoginBtn");
    const showRegisterBtn = document.getElementById("showAgentRegisterBtn");
  
    showLoginBtn.addEventListener("click", () => {
      registerForm.classList.remove("active");
      loginForm.classList.add("active");
    });
  
    showRegisterBtn.addEventListener("click", () => {
      loginForm.classList.remove("active");
      registerForm.classList.add("active");
    });
  
    // ✅ Agent Login
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = document.getElementById("agentLoginEmail").value;
      const password = document.getElementById("agentLoginPassword").value;
  
      try {
        const res = await fetch("/api/agents/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
  
        const data = await res.json();
  
                if (!res.ok) {
          loginMsg.textContent = data.message || "Login failed";
          loginMsg.style.color = "red";
          return;
        }

        // Store session
        localStorage.setItem("vendplug-token", data.token);
        localStorage.setItem("vendplugAgent", JSON.stringify(data.agent));
        localStorage.setItem("role", data.agent.role || "agent");
  
        loginMsg.textContent = "Login successful";
        loginMsg.style.color = "green";
        setTimeout(() => (window.location.href = "/agent-dashboard.html"), 1000);
      } catch (error) {
        console.error("Login Error:", error);
        loginMsg.textContent = "Server error";
        loginMsg.style.color = "red";
      }
    });
  
    // ✅ Agent Registration
    registerForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fullName = document.getElementById("agentFullName").value;
      const email = document.getElementById("agentEmail").value;
      const phoneNumber = document.getElementById("agentPhoneNumber").value;
      const password = document.getElementById("agentPassword").value;
  
      try {
        const res = await fetch("/api/agents/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fullName, email, phoneNumber, password }),
        });
  
        const data = await res.json();
  
        if (!res.ok) {
          registerMsg.textContent = data.message || "Registration failed";
          registerMsg.style.color = "red";
          return;
        }
  
                // Store email for verification
        localStorage.setItem('pendingVerificationEmail', email);
        localStorage.setItem('pendingVerificationRole', 'agent');

        // Send verification email
        try {
          const verifyRes = await fetch("/api/auth/send-verification", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, role: 'agent' })
          });

          if (verifyRes.ok) {
            registerMsg.textContent = "Registration successful! Please check your email to verify your account.";
            registerMsg.style.color = "green";
            setTimeout(() => window.location.href = "verify-email.html", 1000);
          } else {
            registerMsg.textContent = "Registration successful but couldn't send verification email. Please try again.";
            registerMsg.style.color = "orange";
          }
        } catch (verifyErr) {
          console.error("❌ Verification email error:", verifyErr);
          registerMsg.textContent = "Registration successful but couldn't send verification email. Please try again.";
          registerMsg.style.color = "orange";
        }
      } catch (error) {
        console.error("Register Error:", error);
        registerMsg.textContent = "Server error";
        registerMsg.style.color = "red";
      }
    });
  });
  