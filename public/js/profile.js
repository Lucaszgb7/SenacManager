/**
 * JS do perfil: preview de avatar, toggle de senha e força de senha.
 * Mantido simples e sem dependências para respeitar a regra do projeto.
 */
(function () {
  'use strict';

  /* ---------- Prévia do avatar ---------- */
  const avatarInput = document.getElementById('avatar-input');
  const avatarPreview = document.getElementById('avatar-preview');

  if (avatarInput && avatarPreview) {
    const avatarForm = avatarInput.closest('form');
    const avatarFeedback = avatarForm ? avatarForm.querySelector('[data-feedback]') : null;

    const setFeedback = (msg) => {
      if (avatarFeedback) {
        avatarFeedback.textContent = msg;
        avatarFeedback.className = 'feedback feedback--error';
        avatarFeedback.hidden = false;
      }
    };

    const clearFeedback = () => {
      if (avatarFeedback) {
        avatarFeedback.textContent = '';
        avatarFeedback.hidden = true;
      }
    };

    avatarInput.addEventListener('change', function () {
      clearFeedback();
      const file = this.files && this.files[0];
      if (!file) return;

      // Validação rápida no cliente (backend valida novamente)
      if (!file.type.startsWith('image/')) {
        setFeedback('Selecione um arquivo de imagem válido (JPG, PNG ou WebP).');
        this.value = '';
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        setFeedback('A imagem deve ter no máximo 2 MB.');
        this.value = '';
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => { avatarPreview.src = e.target.result; };
      reader.readAsDataURL(file);
    });
  }

  /* ---------- Toggle de visibilidade da senha ---------- */
  document.querySelectorAll('.toggle-password').forEach((btn) => {
    btn.addEventListener('click', () => {
      const input = document.getElementById(btn.dataset.target);
      if (!input) return;
      input.type = input.type === 'password' ? 'text' : 'password';
      btn.textContent = input.type === 'password' ? '👁' : '🙈';
    });
  });

  /* ---------- Força da nova senha ---------- */
  const newPassword = document.getElementById('nova-senha');
  const confirmPassword = document.getElementById('confirmar-senha');
  const strengthBar = document.querySelector('.password-strength .bar');
  const strengthText = document.querySelector('.strength-text');
  const matchHint = document.getElementById('password-match');

  function scorePassword(pwd) {
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/\d/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    return score; // 0..4
  }

  if (newPassword && strengthBar) {
    newPassword.addEventListener('input', () => {
      const pwd = newPassword.value;
      const score = scorePassword(pwd);
      const pct = (score / 4) * 100;
      const colors = ['#dc2626', '#f59e0b', '#f59e0b', '#10b981', '#10b981'];
      strengthBar.style.setProperty('--strength', pct + '%');
      strengthBar.style.setProperty('--strength-color', colors[score]);

      if (!pwd) {
        strengthText.textContent = 'Mín. 8 caracteres, com letras e números.';
      } else if (score <= 1) {
        strengthText.textContent = 'Senha fraca.';
      } else if (score === 2) {
        strengthText.textContent = 'Senha razoável.';
      } else {
        strengthText.textContent = 'Senha forte.';
      }
    });
  }

  if (confirmPassword && matchHint) {
    confirmPassword.addEventListener('input', () => {
      if (!confirmPassword.value) { matchHint.textContent = ''; return; }
      const ok = confirmPassword.value === newPassword.value;
      matchHint.textContent = ok ? '✓ Senhas coincidem.' : '✗ Senhas não coincidem.';
      matchHint.style.color = ok ? '#059669' : '#dc2626';
    });
  }

  /* ---------- Fechar alertas ---------- */
  document.querySelectorAll('.alert-close').forEach((btn) => {
    btn.addEventListener('click', () => btn.closest('.alert')?.remove());
  });
})();