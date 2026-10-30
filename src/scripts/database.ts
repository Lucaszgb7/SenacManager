
import 'dotenv/config'; // Carrega as variáveis de ambiente do arquivo .env para disponibilizar configurações ao script.

import bcrypt from 'bcryptjs'; // Importa a biblioteca utilizada para gerar hashes seguros de senhas.
import { initializeSchema } from '../database/schema'; // Importa a função responsável por criar e inicializar a estrutura das tabelas do banco de dados.
import { getPool, closePool, databaseOptions } from '../database/connection'; // Importa as funções para obter o pool de conexões MySQL e encerrá-lo ao final da execução.
import { readData as readJson } from '../database/jsonStore'; // Importa a função de leitura dos dados JSON e atribui a ela o nome readJson neste arquivo.
import { transaction, upsertData } from '../database/mysqlStore'; // Importa as funções para executar transações e inserir ou atualizar registros no MySQL.
import { Collection } from '../database/types'; // Importa o tipo que define as coleções de dados aceitas pelo sistema.

// ---------------------------------------------------------------------
// Coleções utilizadas na inicialização e importação dos dados
// ---------------------------------------------------------------------

// Define as coleções que serão lidas dos arquivos JSON e importadas para o banco MySQL.
const collections: Collection[] = [
  'usuarios', // Armazena os dados dos usuários, como alunos, professores e administradores.
  'salas', // Armazena os dados das salas físicas, incluindo capacidade e recursos.
  'reservas', // Armazena as reservas de salas realizadas pelos professores.
  'aulas-grade', // Armazena os dados das aulas que fazem parte da grade de horários.
  'inscricoes-noa' // Armazena as inscrições dos alunos nas atividades NOA.
];

// ---------------------------------------------------------------------
// Diagnóstico seguro do banco de dados MySQL
// ---------------------------------------------------------------------

/**
 * Realiza um diagnóstico seguro e não-destrutivo do banco de dados:
 * - Não remove dados, tabelas ou volumes.
 * - Não expõe senhas ou credenciais sensíveis.
 * - Reporta o status da conexão, tabelas existentes e registros.
 */
async function checkDatabase(): Promise<void> {
  console.log('=== SenacManager — Diagnóstico Seguro do Banco de Dados ===');
  let opts;
  try {
    opts = databaseOptions();
    console.log(`[Configuração] Host: ${opts.host}:${opts.port} | Banco: ${opts.database} | Usuário: ${opts.user}`);
  } catch (err: any) {
    console.log(`[Configuração] Variáveis incompletas: ${err.message}`);
    console.log('[Status] Fallback ativo: Armazenamento em arquivos JSON locais (src/data/*.json).');
    return;
  }

  let conn;
  try {
    const pool = getPool();
    conn = await pool.getConnection();
    console.log('[Conexão] Conexão com o servidor MySQL estabelecida com sucesso.');
  } catch (err: any) {
    console.log(`[Conexão] Não foi possível conectar ao MySQL: ${err.code || err.message}`);
    console.log('[Status] Fallback ativo: Sistema operando com persistência JSON local (src/data/*.json).');
    return;
  }

  try {
    const [tables]: any = await conn.query(
      'SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ?',
      [opts.database]
    );
    const existingTableNames = new Set(
      Array.isArray(tables) ? tables.map((t: any) => t.TABLE_NAME || t.table_name) : []
    );

    const requiredTables = [
      'usuarios',
      'salas',
      'reservas',
      'aulas_grade',
      'inscricoes_noa'
    ];

    console.log('[Tabelas]');
    let allPresent = true;
    for (const table of requiredTables) {
      if (existingTableNames.has(table)) {
        const [countRes]: any = await conn.query(`SELECT COUNT(*) as total FROM \`${table}\``);
        const total = countRes[0]?.total ?? 0;
        console.log(`  ✓ ${table}: presente (${total} registros)`);
      } else {
        allPresent = false;
        console.log(`  ✗ ${table}: ausente`);
      }
    }

    if (allPresent) {
      console.log('[Status] Todas as tabelas necessárias foram encontradas no MySQL.');
    } else {
      console.log('[Status] Algumas tabelas estão ausentes. Execute `npm run db:init` para criar a estrutura.');
    }
  } finally {
    if (conn) conn.release();
  }
}

// ---------------------------------------------------------------------
// Função principal de gerenciamento do banco de dados
// ---------------------------------------------------------------------

/**
 * Executa a operação solicitada pelo terminal.
 *
 * A função aceita quatro ações:
 * - check: diagnóstico seguro sem alterações.
 * - init: inicializa a estrutura do banco de dados.
 * - seed: importa dados dos arquivos JSON para o MySQL.
 * - reset: remove as tabelas existentes e recria a estrutura.
 */
async function main() {
  // Obtém a ação informada como primeiro argumento após o nome do script.
  const action = process.argv[2];

  // Verifica se a ação informada corresponde a uma das operações permitidas.
  if (!['init', 'seed', 'reset', 'check'].includes(action || '')) {
    // Interrompe a execução caso a ação seja inválida e informa as opções aceitas.
    throw new Error('Use check, init, seed ou reset.');
  }

  // Operação de verificação segura (diagnóstico)
  if (action === 'check') {
    await checkDatabase();
    return;
  }

  // ---------------------------------------------------------------------
  // Operação de redefinição do banco de dados
  // ---------------------------------------------------------------------

  // Verifica se o usuário solicitou explicitamente a redefinição das tabelas.
  if (action === 'reset') {

    // Percorre as tabelas na ordem inversa das dependências conhecidas pelas chaves estrangeiras.
    for (const table of [
      'inscricoes_noa', // Remove primeiro as inscrições, que podem depender de outros registros.
      'reservas', // Remove os registros de reservas de salas.
      'aulas_grade', // Remove os registros das aulas da grade de horários.
      'salas', // Remove os registros das salas físicas.
      'usuarios' // Remove os registros dos usuários por último.
    ]) {

      // Executa o comando SQL que remove a tabela, caso ela exista.
      await getPool().query(`DROP TABLE IF EXISTS \`${table}\``);
    }
  }

  // ---------------------------------------------------------------------
  // Inicialização da estrutura do banco de dados
  // ---------------------------------------------------------------------

  // Inicializa ou atualiza a estrutura do banco, exceto quando a operação solicitada é apenas seed.
  if (action !== 'seed') {
    // Cria as tabelas e estruturas definidas na configuração do schema.
    await initializeSchema();
  }

  // ---------------------------------------------------------------------
  // Importação dos dados iniciais
  // ---------------------------------------------------------------------

  // Verifica se a operação solicitada é a importação dos dados iniciais.
  if (action === 'seed') {

    // Obtém a senha opcional utilizada para gerar o hash das senhas dos usuários importados.
    const password = process.env.SEED_PASSWORD;

    // Se a senha foi informada, verifica se ela possui pelo menos seis caracteres.
    if (password && password.length < 6) {
      // Interrompe a importação caso a senha informada não atenda ao tamanho mínimo definido.
      throw new Error('SEED_PASSWORD deve ter pelo menos 6 caracteres.');
    }

    // Executa a importação dentro de uma transação para agrupar as operações de gravação.
    await transaction(async () => {

      // Percorre todas as coleções definidas anteriormente.
      for (const collection of collections) {

        // Lê os registros da coleção correspondente no armazenamento JSON.
        const rows = await readJson(collection);

        // Verifica se a coleção atual contém usuários e se uma senha de seed foi fornecida.
        if (collection === 'usuarios' && password) {

          // Gera um hash da senha informada utilizando o fator de custo 10 do bcrypt.
          const hash = await bcrypt.hash(password, 10);

          // Percorre os registros de usuários lidos do arquivo JSON.
          for (const row of rows) {

            // Substitui o campo senhaHash de cada usuário pelo hash gerado.
            row.senhaHash = hash;
          }
        }

        // Insere os registros ou atualiza os existentes no MySQL conforme a implementação de upsertData.
        await upsertData(collection, rows);
      }
    });
  }

  // ---------------------------------------------------------------------
  // Mensagem de conclusão
  // ---------------------------------------------------------------------

  // Exibe no terminal a ação executada e informa que ela foi concluída.
  console.log('Banco de dados: ' + action + ' concluído.');
}

// ---------------------------------------------------------------------
// Execução e tratamento de erros
// ---------------------------------------------------------------------

// Executa a função principal e captura erros que possam ocorrer durante o processamento.
main()

  // Trata erros exibindo a mensagem correspondente no terminal.
  .catch(error => {
    // Exibe a mensagem do erro para facilitar a identificação do problema.
    console.error(error.message);

    // Define o código de saída como 1 para indicar que o script terminou com falha.
    process.exitCode = 1;
  })

  // Encerra o pool de conexões com o banco de dados após a conclusão ou falha do script.
  .finally(closePool);
