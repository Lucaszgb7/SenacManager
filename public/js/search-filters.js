const aulas = [
    {
      id: 1,
      disciplina: "Matemática",
      professor: "Carlos Silva",
      sala: "Sala 01",
      turno: "Manhã",
      diaSemana: "Segunda-feira",
      horario: "08:00 - 09:40"
    },
    {
      id: 2,
      disciplina: "Banco de Dados",
      professor: "Ana Souza",
      sala: "Laboratório 02",
      turno: "Tarde",
      diaSemana: "Segunda-feira",
      horario: "14:00 - 15:40"
    },
    {
      id: 3,
      disciplina: "Programação Web",
      professor: "Ricardo Lima",
      sala: "Laboratório 01",
      turno: "Tarde",
      diaSemana: "Terça-feira",
      horario: "13:00 - 14:40"
    },
    {
      id: 4,
      disciplina: "Português",
      professor: "Mariana Costa",
      sala: "Sala 03",
      turno: "Manhã",
      diaSemana: "Terça-feira",
      horario: "09:50 - 11:30"
    },
    {
      id: 5,
      disciplina: "Física",
      professor: "João Henrique",
      sala: "Sala 05",
      turno: "Manhã",
      diaSemana: "Quarta-feira",
      horario: "08:00 - 09:40"
    },
    {
      id: 6,
      disciplina: "Desenvolvimento de Sistemas",
      professor: "Ricardo Lima",
      sala: "Laboratório 01",
      turno: "Tarde",
      diaSemana: "Quarta-feira",
      horario: "15:50 - 17:30"
    },
    {
      id: 7,
      disciplina: "Química",
      professor: "Fernanda Alves",
      sala: "Laboratório 03",
      turno: "Manhã",
      diaSemana: "Quinta-feira",
      horario: "09:50 - 11:30"
    },
    {
      id: 8,
      disciplina: "História",
      professor: "Paulo Santos",
      sala: "Sala 04",
      turno: "Tarde",
      diaSemana: "Quinta-feira",
      horario: "14:00 - 15:40"
    },
    {
      id: 9,
      disciplina: "Redes de Computadores",
      professor: "Ana Souza",
      sala: "Laboratório 02",
      turno: "Noite",
      diaSemana: "Quinta-feira",
      horario: "19:00 - 20:40"
    },
    {
      id: 10,
      disciplina: "Biologia",
      professor: "Juliana Martins",
      sala: "Sala 06",
      turno: "Manhã",
      diaSemana: "Sexta-feira",
      horario: "08:00 - 09:40"
    },
    {
      id: 11,
      disciplina: "Programação Web",
      professor: "Ricardo Lima",
      sala: "Laboratório 01",
      turno: "Noite",
      diaSemana: "Sexta-feira",
      horario: "19:00 - 20:40"
    },
    {
      id: 12,
      disciplina: "Matemática",
      professor: "Carlos Silva",
      sala: "Sala 02",
      turno: "Tarde",
      diaSemana: "Sexta-feira",
      horario: "15:50 - 17:30"
    }
  ];
  
  
  /* Elementos da tela */
  
  const searchInput = document.getElementById("search-input");
  
  const disciplinaSelect =
    document.getElementById("filter-disciplina");
  
  const professorSelect =
    document.getElementById("filter-professor");
  
  const salaSelect =
    document.getElementById("filter-sala");
  
  const turnoSelect =
    document.getElementById("filter-turno");
  
  const diaSelect =
    document.getElementById("filter-dia");
  
  const resultsContainer =
    document.getElementById("search-results");
  
  const resultsCount =
    document.getElementById("results-count");
  
  const emptyState =
    document.getElementById("empty-state");
  
  const clearFiltersButton =
    document.getElementById("clear-filters");
  
  
  /* Remove acentos e deixa tudo minúsculo */
  
  function normalizarTexto(texto) {
    return texto
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }
  
  
  /* Preenche os selects automaticamente */
  
  function preencherSelect(select, valores) {
    const valoresUnicos = [...new Set(valores)];
  
    valoresUnicos.sort();
  
    valoresUnicos.forEach((valor) => {
      const option = document.createElement("option");
  
      option.value = valor;
      option.textContent = valor;
  
      select.appendChild(option);
    });
  }
  
  
  function preencherFiltros() {
    preencherSelect(
      disciplinaSelect,
      aulas.map((aula) => aula.disciplina)
    );
  
    preencherSelect(
      professorSelect,
      aulas.map((aula) => aula.professor)
    );
  
    preencherSelect(
      salaSelect,
      aulas.map((aula) => aula.sala)
    );
  }
  
  
  /* Renderiza os cards */
  
  function renderizarAulas(listaDeAulas) {
    resultsContainer.innerHTML = "";
  
    const quantidade = listaDeAulas.length;
  
    if (quantidade === 1) {
      resultsCount.textContent = "1 aula encontrada";
    } else {
      resultsCount.textContent =
        `${quantidade} aulas encontradas`;
    }
  
  
    /* Estado vazio */
  
    if (quantidade === 0) {
      emptyState.hidden = false;
      resultsContainer.hidden = true;
      return;
    }
  
    emptyState.hidden = true;
    resultsContainer.hidden = false;
  
  
    /* Criação dos cards */
  
    listaDeAulas.forEach((aula) => {
      const card = document.createElement("a");
  
      card.href = "/classes/details";
  
      card.classList.add(
        "card",
        "class-card"
      );
  
      card.innerHTML = `
        <div class="class-card-header">
  
          <h3 class="class-card-title">
            ${aula.disciplina}
          </h3>
  
          <span class="class-turno">
            ${aula.turno}
          </span>
  
        </div>
  
        <div class="class-card-info">
  
          <p>
            <strong>Professor:</strong>
            ${aula.professor}
          </p>
  
          <p>
            <strong>Sala:</strong>
            ${aula.sala}
          </p>
  
          <p>
            <strong>Dia:</strong>
            ${aula.diaSemana}
          </p>
  
          <p>
            <strong>Horário:</strong>
            ${aula.horario}
          </p>
  
        </div>
      `;
  
      resultsContainer.appendChild(card);
    });
  }
  
  
  /* Faz todos os filtros funcionarem juntos */
  
  function filtrarAulas() {
    const busca =
      normalizarTexto(searchInput.value.trim());
  
    const disciplina =
      disciplinaSelect.value;
  
    const professor =
      professorSelect.value;
  
    const sala =
      salaSelect.value;
  
    const turno =
      turnoSelect.value;
  
    const dia =
      diaSelect.value;
  
  
    const aulasFiltradas = aulas.filter((aula) => {
  
      /*
        A busca livre procura por:
        disciplina, professor, sala, turno,
        dia da semana e horário.
      */
  
      const textoDaAula = normalizarTexto(`
        ${aula.disciplina}
        ${aula.professor}
        ${aula.sala}
        ${aula.turno}
        ${aula.diaSemana}
        ${aula.horario}
      `);
  
  
      const correspondeBusca =
        !busca ||
        textoDaAula.includes(busca);
  
  
      const correspondeDisciplina =
        !disciplina ||
        aula.disciplina === disciplina;
  
  
      const correspondeProfessor =
        !professor ||
        aula.professor === professor;
  
  
      const correspondeSala =
        !sala ||
        aula.sala === sala;
  
  
      const correspondeTurno =
        !turno ||
        aula.turno === turno;
  
  
      const correspondeDia =
        !dia ||
        aula.diaSemana === dia;
  
  
      return (
        correspondeBusca &&
        correspondeDisciplina &&
        correspondeProfessor &&
        correspondeSala &&
        correspondeTurno &&
        correspondeDia
      );
    });
  
  
    renderizarAulas(aulasFiltradas);
  }
  
  
  /* Limpa todos os filtros */
  
  function limparFiltros() {
    searchInput.value = "";
  
    disciplinaSelect.value = "";
    professorSelect.value = "";
    salaSelect.value = "";
    turnoSelect.value = "";
    diaSelect.value = "";
  
    renderizarAulas(aulas);
  }
  
  
  /* Eventos */
  
  searchInput.addEventListener(
    "input",
    filtrarAulas
  );
  
  disciplinaSelect.addEventListener(
    "change",
    filtrarAulas
  );
  
  professorSelect.addEventListener(
    "change",
    filtrarAulas
  );
  
  salaSelect.addEventListener(
    "change",
    filtrarAulas
  );
  
  turnoSelect.addEventListener(
    "change",
    filtrarAulas
  );
  
  diaSelect.addEventListener(
    "change",
    filtrarAulas
  );
  
  clearFiltersButton.addEventListener(
    "click",
    limparFiltros
  );
  
  
  /* Inicialização */
  
  preencherFiltros();
  
  renderizarAulas(aulas);