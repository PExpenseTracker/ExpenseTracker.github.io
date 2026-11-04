document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const passwordInput = document.getElementById('password');
    const togglePasswordBtn = document.getElementById('togglePassword');
    const errorToast = document.getElementById('errorToast');
    
    let toastTimeout;

    togglePasswordBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const isPassword = passwordInput.type === 'password';
        passwordInput.type = isPassword ? 'text' : 'password';
        togglePasswordBtn.textContent = isPassword ? 'Hide' : 'Show';
    });

    passwordInput.addEventListener('input', () => {
        errorToast.classList.remove('show');
    });

    function triggerErrorToast() {
        errorToast.classList.add('show');
        clearTimeout(toastTimeout);

        toastTimeout = setTimeout(() => {
            errorToast.classList.remove('show');
        }, 3000);
    }

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
});