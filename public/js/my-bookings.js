/* =========================================================
   SenacManager — Tela "Minhas Reservas"
   - Filtro por status (todas / confirmadas / canceladas)
   - Cancelamento mock (com confirmação)
   ========================================================= */
(function () {
  'use strict';

  /* ---------- 1) Filtro por status ---------- */
  const filterButtons = document.querySelectorAll('[data-filter-status]');
  const cards = document.querySelectorAll('.booking-card');

  filterButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      filterButtons.forEach(function (b) { b.classList.remove('is-active'); });
      btn.classList.add('is-active');

      const status = btn.getAttribute('data-filter-status');

      cards.forEach(function (card) {
        const cardStatus = card.getAttribute('data-status') || '';
        const show = status === 'todas' || cardStatus === status;
        card.style.display = show ? '' : 'none';
      });
    });
  });

  /* ---------- 2) Cancelar reserva (mock) ---------- */
  document.querySelectorAll('[data-action="cancelar"]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      const card = btn.closest('.booking-card');
      const title = card ? (card.querySelector('.booking-card__title') || {}).textContent : 'reserva';

      if (!confirm('Deseja cancelar "' + title + '"? (mock)')) return;

      if (card) {
        card.classList.add('booking-card--cancelada');
        card.setAttribute('data-status', 'cancelada');

        const statusEl = card.querySelector('.booking-status');
        if (statusEl) {
          statusEl.className = 'booking-status booking-status--cancelada';
          statusEl.textContent = 'Cancelada';
        }
        btn.remove();
      }
    });
  });
})();