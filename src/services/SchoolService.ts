
/*
 * Importa a biblioteca bcryptjs, utilizada para gerar hashes
 * de senhas e comparar senhas digitadas com os hashes armazenados.
 */
import bcrypt from 'bcryptjs';

/*
 * Importa randomUUID, função que gera identificadores únicos
 * para usuários, reservas e outros registros.
 */
import { randomUUID } from 'crypto';

/*
 * Importa funções e tipos responsáveis pela leitura, escrita
 * e manipulação dos dados armazenados no sistema.
 *
 * readData: lê os registros de uma coleção.
 * writeData: grava registros em uma coleção.
 * transaction: executa operações dentro de uma transação.
 * RecordData: tipo utilizado para representar um registro.
 * Collection: tipo que representa as coleções disponíveis.
 */
import {
  readData,
  writeData,
  transaction,
  RecordData,
  Collection
} from './store';

/*
 * Importa funções auxiliares para validar e manipular dados.
 *
 * required: verifica se um campo obrigatório foi preenchido.
 * flag: interpreta valores booleanos.
 * strings: normaliza listas de textos.
 * validated: executa uma validação e trata erros.
 * HttpError: representa erros HTTP da aplicação.
 * schoolNow: obtém a data e hora utilizadas pelo sistema.
 * vigente: verifica se uma aula está vigente em determinada data.
 * overlaps: verifica se dois intervalos de horário se sobrepõem.
 * semesterRange: retorna o intervalo de datas de um semestre.
 * validarFormatoHorario: verifica o formato HH:MM.
 * validarHorarioReserva: verifica se o horário final é posterior ao inicial.
 * validarDataReserva: verifica se a data da reserva é válida.
 */
import {
  required,
  flag,
  strings,
  validated,
  HttpError,
  schoolNow,
  vigente,
  overlaps,
  semesterRange,
  validarFormatoHorario,
  validarHorarioReserva,
  validarDataReserva
} from './validation';

/*
 * Importa os modelos que representam os diferentes tipos
 * de usuários e os registros principais do sistema.
 */
import { Professor } from '../models/Professor';
import { Aluno } from '../models/Aluno';
import { Administrador } from '../models/Administrador';
import { Sala } from '../models/Sala';
import { Reserva } from '../models/Reserva';
import { AulaGrade } from '../models/AulaGrade';

/*
 * Converte os dados recebidos em uma instância do modelo
 * correspondente ao perfil do usuário.
 *
 * Recebe:
 * data: objeto contendo os dados do usuário.
 *
 * Retorna:
 * uma instância de Professor, Aluno ou Administrador.
 */
export function userModel(data: RecordData) {

  /*
   * Compatibilidade com registros antigos:
   * se o perfil estiver como "admin", converte para
   * "administrador".
   */
  const perfil = data.perfil === 'admin'
    ? 'administrador'
    : data.perfil;

  /*
   * Se o perfil for professor, cria o objeto Professor
   * a partir dos dados recebidos.
   */
  if (perfil === 'professor') {
    return Professor.fromJSON(data);
  }

  /*
   * Se o perfil for aluno, cria o objeto Aluno.
   */
  if (perfil === 'aluno') {
    return Aluno.fromJSON(data);
  }

  /*
   * Se o perfil for administrador, cria o objeto
   * Administrador.
   */
  if (perfil === 'administrador') {
    return Administrador.fromJSON(data);
  }

  /*
   * Se nenhum perfil válido for encontrado,
   * interrompe a operação com erro HTTP 400.
   */
  throw new HttpError(400, 'Perfil inválido.');
}

/*
 * Remove a senha criptografada do objeto antes de
 * disponibilizar os dados do usuário.
 *
 * Isso evita que o campo senhaHash seja enviado
 * desnecessariamente para telas ou respostas da API.
 */
export function safeUser(u: RecordData) {

  /*
   * Extrai senhaHash e guarda todos os outros campos
   * dentro do objeto safe.
   */
  const { senhaHash, ...safe } = u;

  /*
   * Retorna somente os dados que não foram removidos.
   */
  return safe;
}

/*
 * Busca todos os usuários armazenados.
 *
 * O retorno é uma lista de registros normalizados
 * conforme seus respectivos modelos.
 */
export async function users(): Promise<RecordData[]> {

  /*
   * Lê a coleção "usuarios".
   *
   * map percorre cada usuário encontrado e cria
   * um novo objeto com os dados originais.
   */
  return (await readData('usuarios')).map(u => ({

    /*
     * Copia os campos do registro original.
     */
    ...u,

    /*
     * Converte o usuário para seu modelo correspondente
     * e incorpora os dados retornados por toJSON().
     */
    ...userModel(u).toJSON(),

    /*
     * Considera o usuário ativo quando o campo ativo
     * não estiver explicitamente definido como false.
     */
    ativo: u.ativo !== false
  }));
}

/*
 * Recupera o estado completo do sistema.
 *
 * A função reúne usuários, salas, reservas, aulas
 * da grade e inscrições em atividades NOA.
 */
export async function state() {

  /*
   * Promise.all executa as cinco leituras em paralelo,
   * evitando esperar cada consulta individualmente.
   */
  const [
    usuarios,
    salas,
    reservas,
    aulas,
    inscricoes
  ] = await Promise.all([

    /*
     * Carrega usuários utilizando a função users(),
     * que também normaliza seus modelos.
     */
    users(),

    /*
     * Carrega todas as salas.
     */
    readData('salas'),

    /*
     * Carrega todas as reservas.
     */
    readData('reservas'),

    /*
     * Carrega todas as aulas da grade.
     */
    readData('aulas-grade'),

    /*
     * Carrega todas as inscrições nas atividades NOA.
     */
    readData('inscricoes-noa')
  ]);

  /*
   * Retorna os dados organizados em um único objeto.
   */
  return {
    usuarios,
    salas,
    reservas,
    aulas,
    inscricoes
  };
}

/*
 * Procura um registro pelo seu identificador.
 *
 * rows: lista em que a busca será realizada.
 * id: identificador procurado.
 * name: nome do tipo de registro, utilizado na mensagem de erro.
 */
function mustFind(
  rows: RecordData[],
  id: string,
  name: string
) {

  /*
   * Procura o primeiro registro cujo id seja igual ao informado.
   */
  const row = rows.find(r => r.id === id);

  /*
   * Se nenhum registro for encontrado,
   * lança um erro HTTP 404.
   */
  if (!row) {
    throw new HttpError(404, name + ' não encontrado.');
  }

  /*
   * Retorna o registro encontrado.
   */
  return row;
}

/*
 * Busca um usuário pelo identificador.
 *
 * Primeiro carrega a lista de usuários e depois
 * procura aquele cujo id corresponde ao parâmetro.
 *
 * Caso não encontre, retorna undefined.
 */
export async function findUser(id: string) {
  return (await users()).find(u => u.id === id);
}

/*
 * Autentica um usuário utilizando e-mail e senha.
 *
 * Recebe valores inicialmente desconhecidos porque
 * eles podem vir de uma requisição externa.
 */
export async function authenticate(
  email: unknown,
  password: unknown
) {

  /*
   * Verifica se o e-mail foi preenchido e converte
   * seu conteúdo para letras minúsculas.
   *
   * Assim, o e-mail não depende de maiúsculas
   * ou minúsculas para ser localizado.
   */
  const target = required(email, 'E-mail').toLowerCase();

  /*
   * Verifica se a senha foi preenchida.
   */
  const secret = required(password, 'Senha');

  /*
   * Procura um usuário com o e-mail informado
   * que também esteja ativo.
   */
  const u = (await users()).find(
    u => u.email === target && u.ativo
  );

  /*
   * Se o usuário não existir ou a senha não corresponder
   * ao hash armazenado, retorna erro HTTP 401.
   *
   * bcrypt.compare compara a senha digitada com
   * o hash armazenado, sem precisar descriptografá-lo.
   */
  if (!u || !await bcrypt.compare(secret, u.senhaHash)) {
    throw new HttpError(
      401,
      'E-mail ou senha inválidos.'
    );
  }

  /*
   * Retorna os dados do usuário sem senhaHash.
   */
  return safeUser(u);
}

/*
 * Normaliza e valida os dados de um usuário.
 *
 * Essa função é utilizada antes de salvar ou atualizar
 * os dados de um usuário no sistema.
 */
function normalizeUser(data: RecordData): RecordData {

  /*
   * Exige um nome com pelo menos três caracteres.
   */
  const nome = required(data.nome, 'Nome', 3);

  /*
   * Exige um e-mail e converte para letras minúsculas.
   */
  const email = required(data.email, 'E-mail').toLowerCase();

  /*
   * Exige que o perfil tenha sido informado.
   */
  const perfil = required(data.perfil, 'Perfil');

  /*
   * Tenta criar o modelo correspondente ao perfil.
   *
   * validated trata erros que possam ocorrer
   * durante a validação do modelo.
   */
  const model = validated(() =>
    userModel({
      ...data,
      nome,
      email,
      perfil
    })
  );

  /*
   * Retorna os dados recebidos, os campos normalizados
   * pelo modelo e o status de ativação.
   *
   * Quando ativo não estiver explicitamente como false,
   * o usuário será considerado ativo.
   */
  return {
    ...data,
    ...model.toJSON(),
    ativo: flag(data.ativo, true)
  };
}

/*
 * Cria um usuário novo ou atualiza um usuário existente.
 *
 * data: dados enviados para criação ou atualização.
 * id: identificador opcional; quando informado,
 *     indica que um usuário existente será atualizado.
 * actorId: identificador de quem está executando a operação,
 *          utilizado para proteger a própria conta.
 */
export async function saveUser(
  data: RecordData,
  id?: string,
  actorId?: string
) {

  /*
   * Executa a operação dentro de uma transação,
   * conforme a implementação da função transaction.
   */
  return transaction(async () => {

    /*
     * Carrega o estado atual do sistema.
     */
    const s = await state();

    /*
     * Se houver um id, procura o usuário existente.
     *
     * Se não houver id, previous ficará undefined,
     * indicando uma possível criação.
     */
    const previous = id
      ? mustFind(s.usuarios, id, 'Usuário')
      : undefined;

    /*
     * Impede que o usuário altere o próprio perfil
     * ou desative a própria conta por esta operação.
     */
    if (
      previous &&
      actorId === id &&
      (
        data.ativo === false ||
        (data.perfil && data.perfil !== previous.perfil)
      )
    ) {
      throw new HttpError(
        409,
        'Você não pode desativar sua conta ou alterar seu próprio perfil.'
      );
    }

    /*
     * Se o usuário já existir, preserva o hash da senha atual.
     */
    let senhaHash = previous?.senhaHash;

    /*
     * Se for um usuário novo ou uma nova senha tiver sido
     * informada, exige uma senha com pelo menos oito caracteres.
     */
    if (!previous || data.senha) {

      /*
       * Valida o preenchimento e o tamanho da senha.
       */
      const senha = required(data.senha, 'Senha', 8);

      /*
       * Gera um novo hash da senha usando fator de custo 10.
       *
       * O sistema armazena o hash, não a senha em texto puro.
       */
      senhaHash = await bcrypt.hash(senha, 10);
    }

    /*
     * Monta o registro que será validado e salvo.
     */
    const input: RecordData = {

      /*
       * Preserva os dados anteriores quando for uma atualização.
       */
      ...(previous || {}),

      /*
       * Reutiliza o id existente ou gera um novo UUID.
       */
      id: id || randomUUID(),

      /*
       * Preserva a data de criação ou registra a data atual.
       */
      criadoEm: previous?.criadoEm || new Date().toISOString(),

      /*
       * Armazena o hash da senha.
       */
      senhaHash,

      /*
       * Define os campos principais enviados pelo formulário.
       */
      nome: data.nome,
      email: data.email,
      perfil: data.perfil,

      /*
       * Preserva o status anterior quando não houver
       * uma alteração explícita no campo ativo.
       *
       * Para usuários novos, o padrão é ativo.
       */
      ativo: flag(data.ativo, previous?.ativo ?? true),

      /*
       * Normaliza a lista de disciplinas.
       * Se não houver novo valor, tenta preservar o anterior.
       */
      disciplinas: strings(
        data.disciplinas ?? previous?.disciplinas
      ),

      /*
       * Define curso e turma com base nos dados novos
       * ou nos valores anteriormente armazenados.
       */
      curso: data.curso ?? previous?.curso,
      turma: data.turma ?? previous?.turma,

      /*
       * Preserva telefone e foto existentes.
       *
       * Quando não houver valores anteriores,
       * os campos começam como null.
       */
      telefone: previous?.telefone ?? null,
      fotoUrl: previous?.fotoUrl ?? null
    };

    /*
     * Valida os dados e normaliza o objeto
     * conforme o modelo do perfil selecionado.
     */
    const u = normalizeUser(input);

    /*
     * Impede o cadastro de dois usuários com o mesmo e-mail.
     *
     * O registro atual é ignorado na comparação durante
     * uma atualização para permitir que ele mantenha
     * seu próprio e-mail.
     */
    if (
      s.usuarios.some(
        other => other.id !== u.id && other.email === u.email
      )
    ) {
      throw new HttpError(409, 'E-mail já cadastrado.');
    }

    /*
     * Impede que o último administrador ativo seja
     * transformado em outro perfil ou desativado.
     */
    if (
      previous?.perfil === 'administrador' &&
      previous.ativo &&
      (u.perfil !== 'administrador' || !u.ativo) &&
      s.usuarios.filter(
        x => x.perfil === 'administrador' && x.ativo
      ).length <= 1
    ) {
      throw new HttpError(
        409,
        'Mantenha pelo menos um administrador ativo.'
      );
    }

    /*
     * Impede a mudança de perfil de usuários que possuem
     * aulas, reservas ou inscrições vinculadas.
     *
     * Isso evita inconsistências nos registros associados.
     */
    if (
      previous &&
      previous.perfil !== u.perfil &&
      (
        s.aulas.some(a => a.professorId === id) ||
        s.reservas.some(r => r.professorId === id) ||
        s.inscricoes.some(i => i.alunoId === id)
      )
    ) {
      throw new HttpError(
        409,
        'Usuário possui registros vinculados; não é possível alterar o perfil.'
      );
    }

    /*
     * Se o usuário já existia, substitui seu registro.
     *
     * Caso contrário, adiciona o novo usuário à lista.
     */
    await writeData(
      'usuarios',
      previous
        ? s.usuarios.map(x => x.id === id ? u : x)
        : [...s.usuarios, u]
    );

    /*
     * Retorna o usuário sem expor senhaHash.
     */
    return safeUser(u);
  });
}
