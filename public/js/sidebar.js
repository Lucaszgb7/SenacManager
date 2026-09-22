/* =========================================================
   SenacManager — Comportamento do header + sidebar
   - Hambúrguer abre/fecha sidebar no mobile
   - Dropdown do avatar (abre/fecha)
   - Clique fora fecha dropdown
   ========================================================= */
(function () {
  'use strict';

  /* ---------- Hambúrguer / Sidebar off-canvas ---------- */
  const hamburger = document.getElementById('hamburgerBtn');
  const sidebar   = document.getElementById('appSidebar');
  const backdrop  = document.getElementById('sidebarBackdrop');

  function toggleSidebar(open) {
    if (!sidebar) return;
    const willOpen = typeof open === 'boolean' ? open : !sidebar.classList.contains('is-open');
    sidebar.classList.toggle('is-open', willOpen);
    if (hamburger) {
      hamburger.classList.toggle('is-open', willOpen);
      hamburger.setAttribute('aria-expanded', String(willOpen));
    }
    if (backdrop) backdrop.hidden = !willOpen;
  }

  if (hamburger) {
    hamburger.addEventListener('click', function () { toggleSidebar(); });
  }
  if (backdrop) {
    backdrop.addEventListener('click', function () { toggleSidebar(false); });
  }

  /* ---------- Dropdown do avatar ---------- */
  const trigger  = document.getElementById('avatarTrigger');
  const dropdown = document.getElementById('avatarDropdown');

  if (trigger && dropdown) {
    trigger.addEventListener('click', function (e) {
      e.stopPropagation();
      const willOpen = dropdown.hidden;
      dropdown.hidden = !willOpen;
      trigger.setAttribute('aria-expanded', String(willOpen));
    });

    document.addEventListener('click', function (e) {
      if (!dropdown.hidden && !dropdown.contains(e.target) && e.target !== trigger) {
        dropdown.hidden = true;
        trigger.setAttribute('aria-expanded', 'false');
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !dropdown.hidden) {
        dropdown.hidden = true;
        trigger.setAttribute('aria-expanded', 'false');
      }
    });
  }
})();