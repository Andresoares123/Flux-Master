const loginForm = document.getElementById('loginForm');
const resetForm = document.getElementById('resetForm');
const toggleResetBtn = document.getElementById('toggleResetBtn');
const errorMsg = document.getElementById('errorMsg');
const successMsg = document.getElementById('successMsg');
const resetErrorMsg = document.getElementById('resetErrorMsg');

let modoReset = false;

toggleResetBtn.addEventListener('click', () => {
    modoReset = !modoReset;
    errorMsg.style.display = 'none';
    successMsg.style.display = 'none';
    resetErrorMsg.style.display = 'none';
    
    if (modoReset) {
        loginForm.style.display = 'none';
        resetForm.style.display = 'block';
        toggleResetBtn.textContent = 'Voltar para o login';
    } else {
        loginForm.style.display = 'block';
        resetForm.style.display = 'none';
        toggleResetBtn.textContent = 'Redefinir senha';
    }
});

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorMsg.style.display = 'none';
    const user = document.getElementById('user').value.trim();
    const password = document.getElementById('password').value;

    const savedCustomPass = localStorage.getItem('lm_custom_pass');

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usuario: user, senha: password })
        });
        const data = await response.json();

        if (data.success || (savedCustomPass && password === savedCustomPass && user.toUpperCase() === 'LUCAS MENDES')) {
            localStorage.setItem('lm_token', data.token || 'lm-token-local');
            localStorage.setItem('lm_user', data.nome || 'Lucas Mendes');
            window.location.href = '/dashboard.html';
        } else {
            errorMsg.style.display = 'block';
        }
    } catch (err) {
        errorMsg.textContent = 'Erro de conexão com o servidor.';
        errorMsg.style.display = 'block';
    }
});

resetForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    resetErrorMsg.style.display = 'none';
    const newPass = document.getElementById('newPassword').value;
    const confirmPass = document.getElementById('confirmPassword').value;

    if (newPass.length < 3) {
        resetErrorMsg.textContent = 'A senha deve ter pelo menos 3 caracteres.';
        resetErrorMsg.style.display = 'block';
        return;
    }
    if (newPass !== confirmPass) {
        resetErrorMsg.textContent = 'As senhas não coincidem.';
        resetErrorMsg.style.display = 'block';
        return;
    }

    localStorage.setItem('lm_custom_pass', newPass);
    await fetch('/api/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario: 'LUCAS MENDES', novaSenha: newPass })
    });

    resetForm.reset();
    toggleResetBtn.click();
    successMsg.textContent = 'Senha atualizada com sucesso! Faça login.';
    successMsg.style.display = 'block';
});