(function () {
  'use strict';

  const personalForm = document.getElementById('personal-form');
  const passwordForm = document.getElementById('password-form');
  if (!personalForm || !passwordForm) return;

  const clearError = (input) => {
    input.classList.remove('error');
    input.removeAttribute('aria-invalid');
    const message = document.getElementById(input.id + '-error');
    message.textContent = '';
    message.classList.remove('visible');
  };
  const showError = (input, text) => {
    input.classList.add('error');
    input.setAttribute('aria-invalid', 'true');
    const message = document.getElementById(input.id + '-error');
    message.textContent = text;
    message.classList.add('visible');
  };
  const validate = (form) => {
    form.querySelectorAll('input').forEach((input) => {
      clearError(input);
      if (!input.value.trim()) showError(input, 'Preencha este campo.');
      else if (input.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value.trim())) {
        showError(input, 'Digite um e-mail válido.');
      }
    });
    const firstError = form.querySelector('input.error');
    if (firstError) firstError.focus();
    return !firstError;
  };

  // Mesmo comportamento do login.js, aplicado aos três campos.
  const setVisibility = (button, visible) => {
    const input = document.getElementById(button.dataset.passwordTarget);
    input.type = visible ? 'text' : 'password';
    button.textContent = visible ? 'Ocultar' : 'Mostrar';
    const label = document.querySelector('label[for="' + input.id + '"]').textContent.toLowerCase();
    button.setAttribute('aria-label', (visible ? 'Ocultar ' : 'Mostrar ') + label);
    button.setAttribute('aria-pressed', String(visible));
  };
  document.querySelectorAll('[data-password-target]').forEach((button) => {
    button.addEventListener('click', () => {
      const input = document.getElementById(button.dataset.passwordTarget);
      setVisibility(button, input.type === 'password');
    });
  });

  personalForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const feedback = document.getElementById('personal-feedback');
    feedback.textContent = '';
    if (!validate(personalForm)) return;
    const name = personalForm.elements.namedItem('nome').value.trim();
    const email = personalForm.elements.namedItem('email').value.trim();
    document.getElementById('profile-name').textContent = name;
    document.getElementById('profile-email').textContent = email;
    const initials = name.split(/\s+/).map(part => part[0]).slice(0, 2).join('').toUpperCase();
    document.querySelectorAll('#profile-avatar, [data-user-initials]').forEach(el => { el.textContent = initials; });
    document.querySelectorAll('[data-user-name]').forEach(el => { el.textContent = name; });
    feedback.textContent = 'Informações atualizadas nesta demonstração. Ao recarregar, os dados iniciais serão restaurados.';
  });

  passwordForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const feedback = document.getElementById('password-feedback');
    feedback.textContent = '';
    if (!validate(passwordForm)) return;
    const password = document.getElementById('nova-senha');
    const confirmation = document.getElementById('confirmar-senha');
    if (password.value !== confirmation.value) {
      showError(confirmation, 'A confirmação deve ser igual à nova senha.');
      confirmation.focus();
      return;
    }
    passwordForm.reset();
    passwordForm.querySelectorAll('[data-password-target]').forEach(button => setVisibility(button, false));
    feedback.textContent = 'Validação concluída. Nesta demonstração, a senha atual não é verificada e nenhuma senha é alterada.';
  });

  [personalForm, passwordForm].forEach((form) => {
    form.noValidate = true;
    form.querySelector('button[type="submit"]').disabled = false;
    form.querySelectorAll('input').forEach((input) => {
      input.addEventListener('input', () => {
        clearError(input);
        form.querySelector('[role="status"]').textContent = '';
        if (input.id === 'nova-senha') clearError(document.getElementById('confirmar-senha'));
      });
    });
  });
})();