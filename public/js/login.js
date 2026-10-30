/* ============================================================
   login.js — comportamentos da tela de login do SenacManager
   - Toggle mostrar/ocultar senha
   - Validação simples no client antes do submit
   - Estado de loading no botão ao enviar
   ============================================================ */

(function () {
  'use strict';

  // ---------- Referências do DOM ----------
  const form = document.getElementById('login-form');
  if (!form) return; // segurança: só executa na tela de login

  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const toggleBtn = document.getElementById('toggle-password');
  const iconEye = document.getElementById('icon-eye');
  const iconEyeOff = document.getElementById('icon-eye-off');
  const submitBtn = document.getElementById('submit-btn');

  // Helpers para localizar mensagens de erro
  const getErrorEl = (fieldName) =>
    form.querySelector(`[data-error-for="${fieldName}"]`);

  const showError = (inputEl, message) => {
    inputEl.classList.add('error');
    const errorEl = getErrorEl(inputEl.name);
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.classList.add('visible');
    }
  };

  const clearError = (inputEl) => {
    inputEl.classList.remove('error');
    const errorEl = getErrorEl(inputEl.name);
    if (errorEl) {
      errorEl.textContent = '';
      errorEl.classList.remove('visible');
    }
  };

  // ---------- 1. Toggle de visibilidade da senha ----------
  toggleBtn.addEventListener('click', () => {
    const isPassword = passwordInput.type === 'password';
    passwordInput.type = isPassword ? 'text' : 'password';

    // Alterna ícones e rótulo acessível
    if (isPassword) {
      iconEye.style.display = 'none';
      iconEyeOff.style.display = 'block';
      toggleBtn.setAttribute('aria-label', 'Ocultar senha');
      toggleBtn.setAttribute('aria-pressed', 'true');
    } else {
      iconEye.style.display = 'block';
      iconEyeOff.style.display = 'none';
      toggleBtn.setAttribute('aria-label', 'Mostrar senha');
      toggleBtn.setAttribute('aria-pressed', 'false');
    }
  });

  // ---------- 2. Validação simples ----------
  // Regex pragmática: não substitui validação do backend.
  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const validateEmail = () => {
    const value = emailInput.value.trim();
    if (!value) {
      showError(emailInput, 'Informe seu e-mail.');
      return false;
    }
    if (!EMAIL_REGEX.test(value)) {
      showError(emailInput, 'Digite um e-mail válido.');
      return false;
    }
    clearError(emailInput);
    return true;
  };

  const validatePassword = () => {
    const value = passwordInput.value;
    if (!value) {
      showError(passwordInput, 'Informe sua senha.');
      return false;
    }
    clearError(passwordInput);
    return true;
  };

  // Revalida ao sair do campo (feedback imediato)
  emailInput.addEventListener('blur', validateEmail);
  passwordInput.addEventListener('blur', validatePassword);

  // Limpa o erro enquanto o usuário digita
  emailInput.addEventListener('input', () => clearError(emailInput));
  passwordInput.addEventListener('input', () => clearError(passwordInput));

  // ---------- 3. Submit: validação + estado de loading ----------
  form.addEventListener('submit', (event) => {
    const emailOk = validateEmail();
    const passwordOk = validatePassword();

    if (!emailOk || !passwordOk) {
      event.preventDefault();
      // Foca o primeiro campo com erro
      const firstError = form.querySelector('input.error');
      if (firstError) firstError.focus();
      return;
    }

    // Desabilita o botão e troca o texto para feedback visual
    submitBtn.disabled = true;
    submitBtn.classList.add('btn-loading');
    submitBtn.textContent = 'Entrando...';
    // O submit segue naturalmente (POST /auth/login)
  });

  window.fillLogin = (email, password) => {
    emailInput.value = email;
    passwordInput.value = password;
    clearError(emailInput);
    clearError(passwordInput);
    emailInput.focus();
  };
})();