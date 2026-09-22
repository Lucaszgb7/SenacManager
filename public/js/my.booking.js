/* =========================================================
   Minhas Reservas — interações
   - Troca de abas
   - Cancelamento com confirmação
   ========================================================= */
(function () {
  'use strict';

  /* ---------- Troca de abas ---------- */
  const tabs = document.querySelectorAll('.tab');
  const panels = document.querySelectorAll('.tab-panel');

  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      const target = tab.dataset.tab;

      tabs.forEach(function (t) {
        const isActive = t === tab;
        t.classList.toggle('is-active', isActive);
        t.setAttribute('aria-selected', isActive ? 'true' : 'false');
      });

      panels.forEach(function (panel) {
        panel.classList.toggle('is-active', panel.dataset.panel === target);
      });
    });
  });

  /* ---------- Cancelamento de reserva ---------- */
  const cancelButtons = document.querySelectorAll('.js-cancel-booking');

  cancelButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      const label = btn.dataset.bookingLabel || 'esta reserva';
      const confirmou = window.confirm(
        'Tem certeza que deseja cancelar a reserva?\n\n' + label
      );

      if (!confirmou) return;

      const card = btn.closest('.booking-card');
      if (!card) return;

      // Atualiza badge para "Cancelada"
      const badge = card.querySelector('.badge');
      if (badge) {
        badge.classList.remove('badge-confirmada');
        badge.classList.add('badge-cancelada');
        badge.textContent = 'Cancelada';
      }

      // Remove a ação de cancelar (reserva já cancelada)
      const actions = card.querySelector('.booking-card-actions');
      if (actions) actions.remove();

      // Feedback simples
      window.alert('Reserva cancelada com sucesso.');
    });
  });
})();