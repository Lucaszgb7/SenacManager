/* ============================================================
   Tela: Salas Disponíveis — filtros client-side
   Sem libs, JavaScript vanilla puro.
   ============================================================ */

(function () {
  'use strict';

  const buscaInput = document.getElementById('buscaSala');
  const tabs = document.querySelectorAll('.rooms-tab');
  const cards = document.querySelectorAll('.room-card');
  const emptyState = document.getElementById('roomsEmpty');

  let filtroAtual = 'todas'; // 'todas' | 'disponivel' | 'ocupada'
  let termoBusca = '';

  /* ---------------------------------------------------------
     Contadores nas abas
     --------------------------------------------------------- */
  function atualizarContadores() {
    let total = 0;
    let disponiveis = 0;
    let ocupadas = 0;

    cards.forEach((card) => {
      const status = card.dataset.roomStatus;
      const nome = card.dataset.roomName || '';
      const bateBusca = nome.includes(termoBusca);

      // Contadores refletem a busca atual (o que o usuário está vendo)
      if (bateBusca) {
        total++;
        if (status === 'disponivel') disponiveis++;
        else if (status === 'ocupada') ocupadas++;
      }
    });

    const setCount = (key, value) => {
      const el = document.querySelector(`[data-count="${key}"]`);
      if (el) el.textContent = value;
    };

    setCount('todas', total);
    setCount('disponivel', disponiveis);
    setCount('ocupada', ocupadas);
  }

  /* ---------------------------------------------------------
     Aplicação dos filtros
     --------------------------------------------------------- */
  function aplicarFiltros() {
    let visiveis = 0;

    cards.forEach((card) => {
      const status = card.dataset.roomStatus;
      const nome = card.dataset.roomName || '';

      const bateBusca = nome.includes(termoBusca);
      const bateAba = filtroAtual === 'todas' || status === filtroAtual;

      const mostrar = bateBusca && bateAba;
      card.hidden = !mostrar;

      if (mostrar) visiveis++;
    });

    if (emptyState) {
      emptyState.hidden = visiveis > 0;
    }
  }

  /* ---------------------------------------------------------
     Listeners
     --------------------------------------------------------- */
  if (buscaInput) {
    buscaInput.addEventListener('input', (event) => {
      termoBusca = event.target.value.trim().toLowerCase();
      atualizarContadores();
      aplicarFiltros();
    });
  }

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => {
        t.classList.remove('is-active');
        t.setAttribute('aria-selected', 'false');
      });

      tab.classList.add('is-active');
      tab.setAttribute('aria-selected', 'true');

      filtroAtual = tab.dataset.filter || 'todas';
      aplicarFiltros();
    });
  });

  /* ---------------------------------------------------------
     Inicialização
     --------------------------------------------------------- */
  atualizarContadores();
  aplicarFiltros();
})();