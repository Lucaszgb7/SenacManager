/* =========================================================
   SenacManager — Tela "Meu Perfil"
   - Toggle mostrar/ocultar senha (3 campos)
   - Validação client-side
   ========================================================= */
(function () {
  'use strict';

  /* ---------- 1) Toggle mostrar/ocultar senha ---------- */
  const toggleButtons = document.querySelectorAll('.toggle-password');
  toggleButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      const targetId = btn.getAttribute('data-target');
      const input = document.getElementById(targetId);
      if (!input) return;

      const isPassword = input.type === 'password';
      input.type = isPassword ? 'text' : 'password';
      btn.textContent = isPassword ? '🙈' : '👁';
      btn.setAttribute(
        'aria-label',
        isPassword ? 'Ocultar senha' : 'Mostrar senha'
      );
    });
  });

  /* ---------- 2) Validação do formulário de informações ---------- */
  const formInfo = document.getElementById('formInfo');
  if (formInfo) {
    formInfo.addEventListener('submit', function (e) {
      e.preventDefault();

      const nome = document.getElementById('nome');
      const email = document.getElementById('email');

      if (!nome.value.trim()) {
        alert('Por favor, preencha o nome completo.');
        nome.focus();
        return;
      }
      if (!email.value.trim() || !/^\S+@\S+\.\S+$/.test(email.value)) {
        alert('Por favor, informe um e-mail válido.');
        email.focus();
        return;
      }
      alert('Informações pessoais salvas com sucesso! (mock)');
    });
  }

  /* ---------- 3) Validação do formulário de senha ---------- */
  const formSenha = document.getElementById('formSenha');
  const feedback = document.getElementById('senhaFeedback');

  function showFeedback(msg) {
    if (!feedback) return;
    feedback.textContent = msg;
    feedback.hidden = false;
  }
  function clearFeedback() {
    if (!feedback) return;
    feedback.textContent = '';
    feedback.hidden = true;
  }

  if (formSenha) {
    formSenha.addEventListener('submit', function (e) {
      e.preventDefault();
      clearFeedback();

      const atual = document.getElementById('senhaAtual');
      const nova = document.getElementById('novaSenha');
      const confirmar = document.getElementById('confirmarSenha');

      if (!atual.value) {
        showFeedback('Preencha a senha atual.');
        atual.focus();
        return;
      }
      if (!nova.value || nova.value.length < 6) {
        showFeedback('A nova senha deve ter pelo menos 6 caracteres.');
        nova.focus();
        return;
      }
      if (nova.value !== confirmar.value) {
        showFeedback('A confirmação não corresponde à nova senha.');
        confirmar.focus();
        return;
      }

      alert('Senha alterada com sucesso! (mock)');
      formSenha.reset();
    });
  }
})();