
import { Router } from "express"; // Importa o Router do Express para criar e organizar as rotas da aplicação.

import RoomController from "../controllers/RoomController"; // Importa o controller responsável pelas operações relacionadas às salas e reservas.
import { autenticado } from "../middlewares/authMiddleware"; // Importa o middleware que verifica se o usuário está autenticado.
import { permitirPerfis } from "../middlewares/perfilMiddleware"; // Importa o middleware que controla o acesso às rotas conforme o perfil do usuário.

// ---------------------------------------------------------------------
// Configuração das rotas de salas
// ---------------------------------------------------------------------

// Cria um roteador do Express para agrupar as rotas relacionadas às salas e às reservas.
const roomRoutes = Router();

// ---------------------------------------------------------------------
// Rota para consultar salas disponíveis
// ---------------------------------------------------------------------

/**
 * GET /rooms/available
 *
 * Lista as salas e seus respectivos status de disponibilidade.
 * Permite o acesso a qualquer usuário autenticado, incluindo professores,
 * alunos e administradores.
 */

// Registra uma rota GET responsável por consultar as salas disponíveis.
roomRoutes.get(
  "/rooms/available", // Define o endereço utilizado para consultar a disponibilidade das salas.
  autenticado, // Exige que o usuário esteja autenticado antes de acessar a rota.
  RoomController.listarDisponiveis // Executa o método do controller responsável por listar as salas disponíveis.
);

// ---------------------------------------------------------------------
// Rota para exibir a tela de reserva
// ---------------------------------------------------------------------

/**
 * GET /rooms/booking
 *
 * Exibe o formulário utilizado para solicitar uma reserva de sala.
 * O acesso é permitido somente aos usuários com perfil de professor.
 */

// Registra uma rota GET responsável por exibir a tela de reserva.
roomRoutes.get(
  "/rooms/booking", // Define o endereço da página de reservas de salas.
  autenticado, // Verifica se o usuário possui uma sessão autenticada.
  permitirPerfis("professor"), // Permite o acesso somente a usuários com perfil de professor.
  RoomController.telaReserva // Executa o método do controller que apresenta o formulário de reserva.
);

// ---------------------------------------------------------------------
// Rota para confirmar uma reserva
// ---------------------------------------------------------------------

/**
 * POST /rooms/booking
 *
 * Recebe os dados enviados pelo formulário e solicita a confirmação
 * da reserva de uma sala.
 * Somente professores autenticados podem acessar essa operação.
 */

// Registra uma rota POST responsável por processar a solicitação de reserva.
roomRoutes.post(
  "/rooms/booking", // Define o endereço para o envio dos dados da reserva.
  autenticado, // Impede que usuários não autenticados solicitem reservas.
  permitirPerfis("professor"), // Restringe a operação aos usuários com perfil de professor.
  RoomController.confirmarReserva // Executa o método do controller que processa e confirma a reserva.
);

// ---------------------------------------------------------------------
// Exportação das rotas
// ---------------------------------------------------------------------

// Exporta o roteador para que as rotas possam ser registradas na aplicação principal do Express.
export default roomRoutes;
