/* ============================================================
   Tela: Reserva de Sala (Professor) — interações client-side
   Sem libs, JavaScript vanilla puro.
   ============================================================ */

(function () {
  'use strict';

  const form = document.getElementById('bookingForm');
  const dataInput = document.getElementById('data');
  const horarioSelect = document.getElementById('horario');
  const turmaSelect = document.getElementById('turma');
  const roomsGrid = document.getElementById('roomsGrid');
  const btnConfirmar = document.getElementById('btnConfirmar');
  const summary = document.getElementById('bookingSummary');
  const alertSucesso = document.getElementById('alertSucesso');

  const summarySala = document.getElementById('summarySala');
  const summaryData = document.getElementById('summaryData');
  const summaryHorario = document.getElementById('summaryHorario');
  const summaryTurma = document.getElementById('summaryTurma');

  /** @type {{id:string, nome:string, capacidade:number, recursos:string[]} | null} */
  let salaSelecionada = null;

  /* ---------------------------------------------------------
     Seleção de sala
     --------------------------------------------------------- */
  function limparSelecao() {
    if (!roomsGrid) return;
    roomsGrid.querySelectorAll('.room-card.is-selected').forEach((el) => {
      el.classList.remove('is-selected');
      el.setAttribute('aria-pressed', 'false');
    });
    salaSelecionada = null;
  }

  function selecionarSala(card) {
    limparSelecao();
    card.classList.add('is-selected');
    card.setAttribute('aria-pressed', 'true');

    salaSelecionada = {
      id: card.dataset.roomId,
      nome: card.dataset.roomName,
      capacidade: card.querySelector('.room-card-capacity')?.textContent || '',
      recursos: Array.from(card.querySelectorAll('.room-resource-tag')).map(
        (el) => el.textContent
      ),
    };

    atualizarEstadoFormulario();
  }

  if (roomsGrid) {
    roomsGrid.addEventListener('click', (event) => {
      const card = event.target.closest('.room-card');
      if (!card) return;
      selecionarSala(card);
    });
  }

  /* ---------------------------------------------------------
     Atualização do botão + resumo
     --------------------------------------------------------- */
  function turmaValida() {
    return turmaSelect && turmaSelect.value !== '';
  }

  function horarioValido() {
    return horarioSelect && horarioSelect.value !== '';
  }

  function dataValida() {
    return dataInput && dataInput.value !== '';
  }

  function formularioCompleto() {
    return salaSelecionada && turmaValida() && horarioValido() && dataValida();
  }

  function atualizarEstadoFormulario() {
    const pronto = formularioCompleto();

    btnConfirmar.disabled = !pronto;

    if (!salaSelecionada) {
      summary.hidden = true;
      return;
    }

    // Mostra o resumo assim que a sala é escolhida
    summary.hidden = false;
    summarySala.textContent = salaSelecionada.nome;
    summaryData.textContent = dataValida() ? formatarData(dataInput.value) : '—';
    summaryHorario.textContent = horarioValido() ? horarioSelect.value : '—';
    summaryTurma.textContent = turmaValida()
      ? turmaSelect.options[turmaSelect.selectedIndex].text
      : '—';
  }

  function formatarData(iso) {
    if (!iso) return '—';
    const [ano, mes, dia] = iso.split('-');
    return `${dia}/${mes}/${ano}`;
  }

  /* ---------------------------------------------------------
     Listeners dos campos do formulário
     --------------------------------------------------------- */
  [dataInput, horarioSelect, turmaSelect].forEach((el) => {
    if (!el) return;
    el.addEventListener('change', atualizarEstadoFormulario);
  });

  /* ---------------------------------------------------------
     Confirmação (mockada, sem backend)
     --------------------------------------------------------- */
  btnConfirmar.addEventListener('click', () => {
    if (!formularioCompleto()) return;

    // Feedback visual simples — sem popup real
    alertSucesso.hidden = false;
    alertSucesso.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    // Bloqueia o botão após confirmar (evita duplo clique)
    btnConfirmar.disabled = true;
    btnConfirmar.textContent = 'Reserva confirmada';
  });

  /* ---------------------------------------------------------
     Inicialização
     --------------------------------------------------------- */
  atualizarEstadoFormulario();
})();