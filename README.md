# 🎓 SenacManager

Plataforma centralizada de gerenciamento de salas, horários e aulas para cursos técnicos e Ensino Médio Técnico (Médio Tec) do Senac.

---

## 📋 Sobre o Projeto

O **SenacManager** é um sistema web que resolve um problema real do ambiente escolar: a dificuldade de organização de salas, horários e aulas.

Professores frequentemente não sabem quais salas estão disponíveis, onde outros colegas estão dando aula ou quais espaços já estão ocupados. Alunos, por sua vez, têm dificuldade em acompanhar mudanças de horário, sala e professor. A administração precisa de uma ferramenta centralizada para cadastrar e organizar tudo isso.

### 🎯 Objetivo

Centralizar as informações escolares em um único lugar, permitindo que:

- **Professores** consultem salas disponíveis em tempo real, saibam onde outros professores estão lecionando e reservem salas sem conflitos de horário.
- **Alunos** acessem o cronograma de aulas, vejam informações de disciplina, sala, horário e professor, e se inscrevam em atividades extras (NOA).
- **Administradores** cadastrem e gerenciem salas, horários e usuários de forma simples e eficiente.

---

## 🚀 Stack Técnica

| Camada | Tecnologia |
|--------|-----------|
| Runtime | Node.js |
| Linguagem | TypeScript |
| Framework Web | Express (padrão MVC) |
| Template Engine | EJS puro (sem SPA) |
| Estilização | CSS puro (sem frameworks) |
| Client-side | JavaScript vanilla (sem libs) |

> ⚠️ **Sem React, Vue, Tailwind, Bootstrap ou jQuery.** O projeto segue uma arquitetura MVC simples com renderização server-side via EJS.

---

## 👥 Perfis de Usuário

| Perfil | Descrição |
|--------|-----------|
| **Professor** | Consulta salas, reserva espaços, gerencia suas reservas |
| **Aluno** | Consulta cronograma, visualiza detalhes das aulas, inscreve-se em NOA |
| **Administrador** | Cadastra/edita salas, horários e usuários |

---

## 🖥️ Telas do Sistema

| # | Tela | Perfil | Rota sugerida |
|---|------|--------|---------------|
| 1 | Login | Todos | `/login` |
| 2 | Dashboard | Todos | `/dashboard` |
| 3 | Reserva de Sala | Professor | `/rooms/booking` |
| 4 | Salas Disponíveis | Professor / Admin | `/rooms/available` |
| 5 | Minhas Reservas | Professor | `/bookings/my-bookings` |
| 6 | NOA — Novas Oportunidades de Aprendizagem | Aluno | `/noa` |
| 7 | Pesquisa / Filtros | Todos | `/search` |
| 8 | Detalhes da Aula | Todos | `/classes/details` |
| 9 | Perfil | Todos | `/profile` |
| 10 | Painel Administrador | Admin | `/admin` |

---

## 📁 Estrutura de Pastas

```
SenacManager/
├── public/
│   ├── css/
│   │   ├── global.css              # variáveis, reset, tipografia base
│   │   ├── components.css          # .btn, .card, .input-group, etc.
│   │   ├── dashboard.css           # layout header + sidebar + cards
│   │   ├── room-booking.css
│   │   ├── available-rooms.css
│   │   ├── my-bookings.css
│   │   ├── noa.css
│   │   ├── search-filters.css
│   │   ├── class-details.css
│   │   ├── profile.css
│   │   └── admin-panel.css
│   └── js/
│       ├── login.js                # toggle de senha
│       ├── room-booking.js
│       ├── search-filters.js
│       ├── profile.js
│       └── admin-panel.js
│
├── src/
│   ├── views/
│   │   ├── partials/
│   │   │   ├── head.ejs
│   │   │   ├── header.ejs
│   │   │   └── sidebar.ejs
│   │   ├── auth/
│   │   │   └── login.ejs
│   │   ├── dashboard/
│   │   │   ├── dashboard-professor.ejs
│   │   │   ├── dashboard-aluno.ejs
│   │   │   └── dashboard-admin.ejs
│   │   ├── rooms/
│   │   │   ├── room-booking.ejs
│   │   │   └── available-rooms.ejs
│   │   ├── bookings/
│   │   │   └── my-bookings.ejs
│   │   ├── noa/
│   │   │   └── noa.ejs
│   │   ├── search/
│   │   │   └── search-filters.ejs
│   │   ├── classes/
│   │   │   └── class-details.ejs
│   │   ├── profile/
│   │   │   └── profile.ejs
│   │   └── admin/
│   │       └── admin-panel.ejs
│   │
│   ├── controllers/
│   ├── models/
│   ├── routes/
│   └── app.ts
│
├── package.json
├── tsconfig.json
└── README.md
```

---

## 🎨 Padrões de Projeto

### Layout padrão de toda tela

Toda view deve seguir o layout de **header + sidebar**, incluindo os partials:

```ejs
<%- include('../partials/head', { title: '...' }) %>
<%- include('../partials/header', { usuario: usuario }) %>
<%- include('../partials/sidebar', { perfil: '...' }) %>
```

### Regras de CSS

1. **Reaproveitar** sempre as classes já existentes em `components.css`:
   `.btn`, `.btn-primary`, `.card`, `.input-group`, `.error-message`, `.alert-error`, `.checkbox-group`, `.link`, `.toggle-password`.
2. Classes novas devem ser **específicas da tela** e ir no CSS daquela tela — **nunca** em `components.css`.
3. Nomes de classe em **minúsculo**, semânticos (ex: `.room-card`, `.status-badge`).

### Dados

Todo o front-end usa **dados mockados** (arrays/objetos fixos em memória ou passados pelo controller). O backend real (banco/repository) será implementado em etapa posterior.

---

## 🧪 Como rodar o projeto

### Pré-requisitos

- Node.js 18+
- npm ou yarn

### Instalação

```bash
# clonar o repositório
git clone <url-do-repositorio>
cd SenacManager

# instalar dependências
npm install
```

### Executar em modo de desenvolvimento

```bash
npm run dev
```

### Executar em modo de produção

```bash
npm run build
npm start
```

A aplicação estará disponível em `http://localhost:3000`.

---

## 🤝 Fluxo de Contribuição (Git)

Cada tela do sistema foi desenvolvida de forma independente por um membro da equipe. O padrão de commits segue o modelo **Conventional Commits**:

```
feat: cria tela de reserva de sala para o professor
feat: cria tela de salas disponiveis em tempo real
feat: cria tela de minhas reservas do professor
feat: cria tela NOA de novas oportunidades de aprendizagem
feat: cria tela de pesquisa e filtros de aulas
feat: cria tela de detalhes da aula
feat: cria tela de perfil do usuario
feat: cria painel administrativo de salas, horarios e usuarios
```

### Divisão de tarefas

| Tela | Responsável |
|------|-------------|
| Reserva de Sala | Gabriel |
| Salas Disponíveis | Gabriel |
| Minhas Reservas | Mateus |
| NOA | Heytor Andrade |
| Pesquisa / Filtros | Max |
| Detalhes da Aula | — |
| Perfil | — |
| Painel Administrador | — |

---

## 🔮 Roadmap / Evoluções Futuras

- [ ] Implementação do backend real (banco de dados + repository)
- [ ] Autenticação e autorização por perfil (JWT/sessão)
- [ ] Notificações de mudança de sala em tempo real
- [ ] Avisos para alunos e professores
- [ ] Calendário integrado
- [ ] Registro de presença
- [ ] Integração com outros sistemas da escola
- [ ] Upload real de avatar no perfil
- [ ] Relatórios administrativos (ocupação de salas, etc.)

---

## 📄 Licença

Projeto acadêmico desenvolvido para o Senac — uso educacional.

---

## 👨‍💻 Equipe

Projeto desenvolvido por estudantes do curso técnico/Médio Tec do Senac.

- Gabriel
- Mateus
- Heytor Andrade
- Max

---

> **SenacManager** — organização escolar simples, centralizada e eficiente. 🎓