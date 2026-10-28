// Importa o Router para criar rotas e os tipos Request, Response e NextFunction do Express.
import { Router, Request, Response, NextFunction } from 'express';

// Importa o controlador responsável por executar as operações de autenticação.
import AuthController from '../controllers/AuthController';

// ---------------------------------------------------------------------
// Configuração das rotas de autenticação
// ---------------------------------------------------------------------

// Cria uma instância do Router para agrupar as rotas relacionadas à autenticação.
const authRoutes = Router();

// ---------------------------------------------------------------------
// Middleware de autorização para administradores
// ---------------------------------------------------------------------

/**
 * Middleware responsável por verificar se o usuário está autenticado
 * e possui o perfil de administrador.
 *
 * É utilizado para proteger rotas que permitem cadastrar usuários,
 * impedindo o acesso de pessoas não autenticadas ou sem autorização.
 *
 * @param req Objeto que contém os dados da requisição HTTP.
 * @param res Objeto utilizado para enviar a resposta HTTP.
 * @param next Função que permite continuar o processamento da requisição.
 */
function exigirAdministrador(
  req: Request, // Recebe a requisição enviada pelo cliente.
  res: Response, // Permite enviar respostas ao cliente.
  next: NextFunction // Permite continuar para o próximo middleware ou controlador.
): void { // Indica que a função não retorna um valor diretamente.
  // Obtém o usuário armazenado na sessão, caso exista.
  const usuario = req.session?.usuario;

  // Verifica se existe um usuário autenticado na sessão.
  if (!usuario) {
    // Retorna o status HTTP 401, indicando ausência de autenticação.
    res.status(401).json({
      // Informa que a operação não foi concluída com sucesso.
      success: false,

      // Explica que o usuário precisa estar autenticado.
      message: 'Não autenticado.',
    });

    // Interrompe a execução para impedir o acesso à rota protegida.
    return;
  }

  // Verifica se o usuário autenticado possui o perfil de administrador.
  if (usuario.perfil !== 'administrador') {
    // Retorna o status HTTP 403, indicando falta de permissão.
    res.status(403).json({
      // Informa que a operação não foi concluída com sucesso.
      success: false,

      // Explica que somente administradores podem cadastrar usuários.
      message: 'Apenas administradores podem cadastrar usuários.',
    });

    // Interrompe a execução para impedir que o usuário prossiga.
    return;
  }

  // Permite que a requisição continue porque o usuário está autorizado.
  next();
}

// ---------------------------------------------------------------------
// Rota para exibir a página de login
// ---------------------------------------------------------------------

// Define uma rota GET para acessar a página de login.
authRoutes.get(
  '/login', // Caminho utilizado para acessar a página de login.

  // Define a função executada quando a rota é acessada.
  (_req: Request, res: Response) => {
    // Renderiza a página de login e informa que não existe erro inicial.
    res.render('auth/login', { error: null });
  }
);

// ---------------------------------------------------------------------
// Rota para realizar o login
// ---------------------------------------------------------------------

// Define uma rota POST para enviar os dados de autenticação.
// O controlador verifica as credenciais e executa o processo de login.
authRoutes.post('/auth/login', AuthController.login);

// ---------------------------------------------------------------------
// Rota para registrar usuários
// ---------------------------------------------------------------------

// Define uma rota POST para cadastrar usuários.
// O middleware exigirAdministrador é executado antes do controlador.
// Somente administradores autenticados podem prosseguir para o registro.
authRoutes.post(
  '/auth/registrar', // Caminho utilizado para cadastrar um usuário.
  exigirAdministrador, // Verifica a autenticação e a autorização.
  AuthController.registrar // Executa a lógica de cadastro do usuário.
);

// ---------------------------------------------------------------------
// Rota para realizar o logout
// ---------------------------------------------------------------------

// Define uma rota POST para encerrar a sessão de autenticação.
// O controlador é responsável por executar o processo de logout.
authRoutes.post('/auth/logout', AuthController.logout);

// ---------------------------------------------------------------------
// Exportação das rotas
// ---------------------------------------------------------------------

// Exporta o Router para que ele possa ser registrado na aplicação Express.
export default authRoutes;
