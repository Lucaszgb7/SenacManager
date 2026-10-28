
import { Router, Request, Response, NextFunction } from "express"; // Importa os recursos do Express para criar rotas e tipar requisições, respostas e funções intermediárias.
import multer from "multer"; // Importa o Multer para identificar e tratar erros relacionados ao envio de arquivos.

import ProfileController from "../controllers/ProfileController"; // Importa o controller responsável pelas operações do perfil do usuário.
import { uploadAvatar } from "../config/multer"; // Importa a configuração do Multer responsável pelo upload da foto de perfil.
import { autenticado } from "../middlewares/authMiddleware"; // Importa o middleware que verifica se o usuário está autenticado.

// ---------------------------------------------------------------------
// Configuração das rotas de perfil
// ---------------------------------------------------------------------

// Cria um roteador do Express para agrupar todas as rotas relacionadas ao perfil.
const profileRoutes = Router();

// ---------------------------------------------------------------------
// Middleware para tratamento de erros do Multer
// ---------------------------------------------------------------------

/**
 * Middleware responsável por interceptar e tratar erros durante o upload.
 *
 * Executa o processamento do arquivo antes de chamar o controller.
 * Dessa forma, erros de tamanho, formato ou quantidade de arquivos
 * podem ser retornados ao frontend no formato JSON.
 *
 * @param req Requisição HTTP recebida do cliente.
 * @param res Resposta HTTP enviada ao cliente.
 * @param next Função utilizada para continuar o fluxo ou encaminhar um erro.
 */
function tratarErrosMulter(
  req: Request, // Recebe os dados enviados pelo cliente na requisição HTTP.
  res: Response, // Permite enviar uma resposta HTTP ao cliente.
  next: NextFunction // Permite continuar para o próximo middleware ou encaminhar um erro.
): void {
  // Executa o middleware de upload para aceitar um único arquivo no campo "avatar".
  uploadAvatar.single("avatar")(req, res, (err: unknown) => {

    // Verifica se o Multer terminou o processamento sem encontrar erros.
    if (!err) {
      next(); // Continua a execução para o próximo middleware, neste caso o controller.
      return; // Encerra a execução desta função para evitar o processamento desnecessário.
    }

    // ---------------------------------------------------------------------
    // Tratamento de formato de arquivo inválido
    // ---------------------------------------------------------------------

    // Verifica se o erro foi gerado pelo filtro de arquivos configurado no Multer.
    if (err instanceof Error && err.message === "TIPO_INVALIDO") {
      // Retorna o status HTTP 415, indicando que o formato do arquivo não é aceito.
      res.status(415).json({
        success: false, // Informa ao frontend que a operação não foi concluída.
        message: "Formato inválido. Envie uma imagem JPG, PNG ou WEBP.", // Explica quais formatos de imagem são aceitos.
      });

      return; // Interrompe a execução após enviar a resposta.
    }

    // ---------------------------------------------------------------------
    // Tratamento de erros nativos do Multer
    // ---------------------------------------------------------------------

    // Verifica se o erro pertence à classe de erros do próprio Multer.
    if (err instanceof multer.MulterError) {

      // Verifica se o arquivo ultrapassou o limite de tamanho configurado.
      if (err.code === "LIMIT_FILE_SIZE") {
        // Retorna o status HTTP 413, indicando que o conteúdo enviado é muito grande.
        res.status(413).json({
          success: false, // Informa que o upload falhou.
          message: "Arquivo muito grande. O tamanho máximo é 2MB.", // Informa o limite de tamanho permitido.
        });

        return; // Encerra a execução após responder ao cliente.
      }

      // Verifica se o cliente tentou enviar mais arquivos do que o permitido.
      if (err.code === "LIMIT_FILE_COUNT") {
        // Retorna o status HTTP 400 por causa da quantidade de arquivos enviada.
        res.status(400).json({
          success: false, // Indica que a requisição não foi aceita.
          message: "Envie apenas um arquivo por vez.", // Orienta o usuário a enviar somente um arquivo.
        });

        return; // Interrompe o processamento após enviar a resposta.
      }

      // Verifica se o arquivo foi enviado em um campo diferente do esperado.
      if (err.code === "LIMIT_UNEXPECTED_FILE") {
        // Retorna o status HTTP 400 porque o campo do arquivo é inesperado.
        res.status(400).json({
          success: false, // Informa que a operação não foi concluída.
          message: 'Campo de arquivo inesperado. Use o campo "avatar".', // Informa o nome correto do campo utilizado no upload.
        });

        return; // Encerra a execução para evitar outras respostas.
      }

      // Trata outros erros reconhecidos pelo Multer que não foram especificados anteriormente.
      res.status(400).json({
        success: false, // Indica que ocorreu uma falha no processamento do arquivo.
        message: `Falha no upload: ${err.message}`, // Retorna a descrição do erro para auxiliar na identificação do problema.
      });

      return; // Finaliza a execução após enviar a resposta de erro.
    }

    // ---------------------------------------------------------------------
    // Encaminhamento de erros desconhecidos
    // ---------------------------------------------------------------------

    // Encaminha erros que não foram reconhecidos para o middleware global de tratamento de erros.
    next(err);
  });
}

// ---------------------------------------------------------------------
// Rota para visualizar o perfil
// ---------------------------------------------------------------------

// Registra uma rota GET para consultar os dados do perfil do usuário.
profileRoutes.get(
  "/profile", // Define o endereço da rota de consulta do perfil.
  autenticado, // Exige que o usuário esteja autenticado antes de acessar a rota.
  ProfileController.verPerfil.bind(ProfileController) // Executa o método verPerfil mantendo o contexto correto do controller.
);

// ---------------------------------------------------------------------
// Rota para atualizar as informações do perfil
// ---------------------------------------------------------------------

// Registra uma rota PUT para atualizar os dados pessoais do usuário.
profileRoutes.put(
  "/profile", // Define o endereço utilizado para atualizar o perfil.
  autenticado, // Impede que usuários não autenticados alterem os dados.
  ProfileController.atualizarInfo.bind(ProfileController) // Executa o método responsável por atualizar as informações do perfil.
);

// ---------------------------------------------------------------------
// Rota para alterar a senha
// ---------------------------------------------------------------------

// Registra uma rota PUT para permitir a alteração da senha da conta.
profileRoutes.put(
  "/profile/senha", // Define o endereço utilizado para alterar a senha.
  autenticado, // Exige autenticação antes de permitir a alteração da senha.
  ProfileController.alterarSenha.bind(ProfileController) // Executa o método que processa a alteração da senha.
);

// ---------------------------------------------------------------------
// Rota para enviar ou atualizar a foto de perfil
// ---------------------------------------------------------------------

// Registra uma rota POST responsável pelo envio da foto de perfil do usuário.
profileRoutes.post(
  "/profile/foto", // Define o endereço da rota de upload da foto.
  autenticado, // Garante que somente usuários autenticados possam enviar uma foto.
  tratarErrosMulter, // Processa o upload e trata erros de formato, tamanho e quantidade antes de chamar o controller.
  ProfileController.uploadFoto.bind(ProfileController) // Executa o método que finaliza o processamento da foto de perfil.
);

// ---------------------------------------------------------------------
// Exportação das rotas
// ---------------------------------------------------------------------

// Exporta o roteador para que ele possa ser registrado na aplicação principal do Express.
export default profileRoutes;
