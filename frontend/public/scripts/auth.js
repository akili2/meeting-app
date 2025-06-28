document.addEventListener('DOMContentLoaded', () => {
    // Gestion des formulaires d'authentification
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = loginForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            
            submitBtn.disabled = true;
            submitBtn.textContent = 'Signing in...';
            
            const formData = new FormData(loginForm);
            const response = await fetch('/login', {
                method: 'POST',
                body: formData
            });
            
            if (response.redirected) {
                window.location.href = response.url;
            } else {
                const error = await response.text();
                showAuthError(loginForm, error);
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
        });
    }
    
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Validation du mot de passe
            const password = registerForm.querySelector('input[name="password"]').value;
            const confirmPassword = registerForm.querySelector('input[name="confirm_password"]').value;
            
            if (password !== confirmPassword) {
                showAuthError(registerForm, 'Passwords do not match');
                return;
            }
            
            const submitBtn = registerForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            
            submitBtn.disabled = true;
            submitBtn.textContent = 'Registering...';
            
            const formData = new FormData(registerForm);
            const response = await fetch('/register', {
                method: 'POST',
                body: formData
            });
            
            if (response.redirected) {
                window.location.href = response.url;
            } else {
                const error = await response.text();
                showAuthError(registerForm, error);
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
        });
    }
    
    // Fonction pour afficher les erreurs
    function showAuthError(form, message) {
        let errorElement = form.querySelector('.error-message');
        
        if (!errorElement) {
            errorElement = document.createElement('div');
            errorElement.className = 'error-message text-red-600 mb-4';
            form.insertBefore(errorElement, form.firstChild);
        }
        
        errorElement.textContent = message;
    }
    
    // Toggle password visibility
    document.querySelectorAll('.toggle-password').forEach(button => {
        button.addEventListener('click', function() {
            const input = this.previousElementSibling;
            const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
            input.setAttribute('type', type);
            
            const icon = this.querySelector('svg');
            if (type === 'password') {
                icon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />';
            } else {
                icon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />';
            }
        });
    });
});