/* =========================================================
   SenacManager — Painel Administrativo
   - Troca de abas
   - Abrir/fechar modais
   - Busca client-side em cada tabela
   ========================================================= */
(function () {
  'use strict';

  /* ---------- 1) Troca de abas ---------- */
  const tabs = document.querySelectorAll('.tab');
  const panels = document.querySelectorAll('.tab-panel');

  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      const target = tab.getAttribute('data-tab');

      tabs.forEach(function (t) { t.classList.toggle('is-active', t === tab); });
      panels.forEach(function (p) {
        p.classList.toggle('is-active', p.getAttribute('data-panel') === target);
      });
    });
  });

  /* ---------- 2) Modais ---------- */
  const modals = document.querySelectorAll('.modal');

  function openModal(id) {
    const modal = document.getElementById(id);
    if (!modal) return;
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
  }
  function closeModal(modal) {
    if (!modal) return;
    modal.hidden = true;
    document.body.style.overflow = '';
  }

  document.querySelectorAll('[data-open-modal]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      openModal(btn.getAttribute('data-open-modal'));
    });
  });

  document.querySelectorAll('[data-close-modal]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      closeModal(btn.closest('.modal'));
    });
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      modals.forEach(function (m) { if (!m.hidden) closeModal(m); });
    }
  });

  // Submissão de modais (mock)
  modals.forEach(function (modal) {
    const form = modal.querySelector('form');
    if (!form) return;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      alert('Registro salvo com sucesso! (mock)');
      closeModal(modal);
      form.reset();
    });
  });

  /* ---------- 3) Busca client-side ---------- */
  document.querySelectorAll('.input-search').forEach(function (input) {
    input.addEventListener('input', function () {
      const tableKey = input.getAttribute('data-search');
      const table = document.querySelector('[data-table="' + tableKey + '"]');
      if (!table) return;

      const term = input.value.trim().toLowerCase();
      const rows = table.querySelectorAll('tbody tr');

      rows.forEach(function (row) {
        const text = row.textContent.toLowerCase();
        row.style.display = text.indexOf(term) !== -1 ? '' : 'none';
      });
    });
  });

  /* ---------- 4) Ações Editar/Excluir (mock) ---------- */
  document.querySelectorAll('[data-action]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      const action = btn.getAttribute('data-action');
      const row = btn.closest('tr');
      const firstCell = row ? row.querySelector('td') : null;
      const label = firstCell ? firstCell.textContent.trim() : 'registro';

      if (action === 'editar') {
        alert('Editar: ' + label + ' (mock)');
      } else if (action === 'excluir') {
        if (confirm('Deseja realmente excluir "' + label + '"? (mock)')) {
          if (row) row.remove();
        }
      }
    });
  });
})();