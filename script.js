document.addEventListener('DOMContentLoaded', () => {
    // Optional: Initialize Supabase client if you need database access on the login page later
    let supabaseClient = null;
    try {
        if (window.supabase) {
            const SUPABASE_URL = 'https://ajyhxlvqjkgovcrfsnig.supabase.co';
            const SUPABASE_KEY = 'sb_publishable_wa_eoq6Z21iTyijZgWALkg_6DXwPCWw';
            supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        }
    } catch (e) {
        console.error('Supabase initialization error:', e);
    }

    const loginForm = document.getElementById('loginForm');
    const passwordInput = document.getElementById('password');
    const togglePasswordBtn = document.getElementById('togglePassword');
    const errorToast = document.getElementById('errorToast');
    
    let toastTimeout;

    if (togglePasswordBtn && passwordInput) {
        togglePasswordBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const isPassword = passwordInput.type === 'password';
            passwordInput.type = isPassword ? 'text' : 'password';
            togglePasswordBtn.textContent = isPassword ? 'Hide' : 'Show';
        });
    }

    if (passwordInput && errorToast) {
        passwordInput.addEventListener('input', () => {
            errorToast.classList.remove('show');
        });
    }

    function triggerErrorToast() {
        if (!errorToast) return;
        errorToast.classList.add('show');
        clearTimeout(toastTimeout);

        toastTimeout = setTimeout(() => {
            errorToast.classList.remove('show');
        }, 3000);
    }

    if (loginForm && passwordInput) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const password = passwordInput.value.trim();

            if (password !== '032602') {
                triggerErrorToast();
                passwordInput.focus();
                return;
            }

            window.location.href = 'dashboard.html';
        });
    }
});