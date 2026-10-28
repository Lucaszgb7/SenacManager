// Identifica o caminho do arquivo de rotas responsável pelas reservas.

// Importa o Router do Express para criar e organizar as rotas HTTP.
import { Router } from "express";

// Importa o controlador responsável pela lógica das reservas.
import BookingController from "../controllers/BookingController";

// Importa o middleware que verifica se o usuário está autenticado.
import { autenticado } from "../middlewares/authMiddleware";

// Importa o middleware que verifica se o usuário possui um perfil permitido.
import { permitirPerfis } from "../middlewares/perfilMiddleware";

// ---------------------------------------------------------------------
// Configuração das rotas de reservas
// ---------------------------------------------------------------------

// Cria uma instância do Router para agrupar as rotas de reservas.
const bookingRoutes = Router();

// ---------------------------------------------------------------------
// Rota para listar as reservas do professor autenticado
// ---------------------------------------------------------------------

/**
 * Define a rota GET /bookings/my.
 *
 * Permite que o professor consulte suas próprias reservas.
 * A autenticação e a autorização são verificadas antes de executar
 * o método do controlador.
 */

// Registra uma rota GET para consultar as reservas do professor.
bookingRoutes.get(
  "/bookings/my", // Define o caminho utilizado para consultar as reservas.

  autenticado, // Verifica se existe um usuário autenticado na sessão.

  permitirPerfis("professor"), // Permite o acesso somente a usuários com perfil de professor.

  BookingController.minhasReservas // Executa o método que lista as reservas do professor.
);

// ---------------------------------------------------------------------
// Rota para cancelar uma reserva
// ---------------------------------------------------------------------

/**
 * Define a rota POST /bookings/:id/cancelar.
 *
 * Permite que um professor solicite o cancelamento de uma reserva
 * identificada pelo parâmetro id.
 *
 * O controlador deve verificar se a reserva pertence ao professor
 * autenticado antes de permitir o cancelamento, evitando uma
 * vulnerabilidade de autorização conhecida como IDOR.
 */

// Registra uma rota POST utilizada para solicitar o cancelamento.
bookingRoutes.post(
  "/bookings/:id/cancelar", // Define o caminho e recebe o ID da reserva pela URL.

  autenticado, // Exige que o usuário esteja autenticado.

  permitirPerfis("professor"), // Restringe o acesso a usuários com perfil de professor.

  BookingController.cancelar // Executa o método que valida e processa o cancelamento.
);

// ---------------------------------------------------------------------
// Exportação das rotas
// ---------------------------------------------------------------------

// Exporta o Router para que as rotas sejam registradas na aplicação Express.
export default bookingRoutes;
