
import 'dotenv/config'; // Carrega as variáveis de ambiente definidas no arquivo .env para que possam ser acessadas por process.env.

import { saveUser } from '../services/SchoolService'; // Importa a função responsável por cadastrar e salvar usuários no sistema.
import { closePool } from '../database/connection'; // Importa a função responsável por encerrar as conexões do pool com o banco de dados.

// ---------------------------------------------------------------------
// Função principal de criação do administrador
// ---------------------------------------------------------------------

/**
 * Executa o processo de criação de um usuário administrador.
 *
 * Obtém o nome e o e-mail pelos argumentos do terminal,
 * lê a senha de uma variável de ambiente e solicita o cadastro
 * do administrador por meio do serviço da aplicação.
 */
async function main() {
  // Obtém os argumentos fornecidos no terminal, ignorando os dois primeiros valores do process.argv.
  const [nome, email] = process.argv.slice(2);

  // Recupera a senha do administrador a partir da variável de ambiente configurada.
  const senha = process.env.SENAC_ADMIN_PASSWORD;

  // Verifica se o nome, o e-mail e a senha foram informados antes de iniciar o cadastro.
  if (!nome || !email || !senha) {
    // Interrompe a execução caso falte algum dado obrigatório e informa como fornecê-lo.
    throw new Error('Informe nome e e-mail como argumentos e a senha pela variável SENAC_ADMIN_PASSWORD (mínimo 8 caracteres).');
  }

  // Cadastra o usuário com os dados recebidos e define seu perfil como administrador.
  await saveUser({
    nome, // Informa o nome do administrador.
    email, // Informa o endereço de e-mail do administrador.
    senha, // Fornece a senha ao serviço, que deve tratá-la com segurança.
    perfil: 'administrador', // Define o perfil da conta como administrador.
    ativo: true // Define a conta como ativa no momento da criação.
  });

  // Exibe uma mensagem de confirmação sem revelar a senha utilizada no cadastro.
  console.log('Administrador criado. A senha não foi exibida nem gravada em texto puro.');
}

// ---------------------------------------------------------------------
// Execução e tratamento de erros
// ---------------------------------------------------------------------

// Executa a função principal e captura possíveis erros durante o cadastro.
main()
  .catch(error => {
    // Exibe a mensagem do erro no terminal para facilitar a identificação do problema.
    console.error(error.message);

    // Define o código de saída como 1 para indicar que a execução terminou com falha.
    process.exitCode = 1;
  })

  // Fecha o pool de conexões com o banco de dados após a conclusão ou falha da operação.
  .finally(closePool);
