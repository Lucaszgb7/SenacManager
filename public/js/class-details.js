/* =========================================================
   Detalhes da Aula — ações
   ========================================================= */
(function () {
  'use strict';

  const cancelBtn = document.querySelector('.js-cancel-class');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', function () {
      const ok = window.confirm(
        'Tem certeza que deseja cancelar esta aula?\n\nOs alunos vinculados serão notificados.'
      );
      if (!ok) return;

      // TODO: integrar com backend
      window.alert('Aula cancelada.');
      window.history.back();
    });
  }

  const removeBtn = document.querySelector('.js-remove-class');
  if (removeBtn) {
    removeBtn.addEventListener('click', function () {
      const ok = window.confirm(
        'Remover esta aula permanentemente?\n\nEsta ação não pode ser desfeita.'
      );
      if (!ok) return;

      // TODO: integrar com backend
      window.alert('Aula removida.');
      window.location.href = '/classes';
    });
  }
})();