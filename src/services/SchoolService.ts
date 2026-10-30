
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
   * Procura o usuário com o e-mail informado.
   */
  const u = (await users()).find(
    u => u.email === target
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
   * Verifica se a conta está ativa. Contas desativadas não
   * podem se autenticar no sistema.
   */
  if (u.ativo === false) {
    throw new HttpError(
      401,
      'Esta conta está inativa. Contate a administração.'
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

export async function updateProfile(id: string, data: RecordData) {
  return transaction(async () => {
    const rows = await users();
    const previous = mustFind(rows, id, 'Usuário');
    const allowed: RecordData = { nome: required(data.nome, 'Nome', 3), email: required(data.email, 'E-mail').toLowerCase(), telefone: data.telefone == null || data.telefone === '' ? null : required(data.telefone, 'Telefone') };
    if (previous.perfil === 'aluno') { allowed.curso = data.curso ?? previous.curso; allowed.turma = data.turma ?? previous.turma; }
    if (previous.perfil === 'professor') allowed.disciplinas = strings(data.disciplinas ?? previous.disciplinas);
    const next = normalizeUser({ ...previous, ...allowed });
    if (rows.some(u => u.id !== id && u.email === next.email)) throw new HttpError(409, 'E-mail já cadastrado.');
    await writeData('usuarios', rows.map(u => u.id === id ? next : u));
    return safeUser(next);
  });
}

export async function changePassword(id: string, current: unknown, next: unknown) {
  return transaction(async () => {
    const rows = await users();
    const user = mustFind(rows, id, 'Usuário');
    const old = required(current, 'Senha atual');
    const nova = required(next, 'Nova senha', 8);
    if (!await bcrypt.compare(old, user.senhaHash)) throw new HttpError(401, 'Senha atual incorreta.');
    if (old === nova) throw new HttpError(400, 'Use uma senha diferente da atual.');
    user.senhaHash = await bcrypt.hash(nova, 10);
    await writeData('usuarios', rows);
  });
}

export async function setAvatar(id: string, url: string) {
  return transaction(async () => {
    const rows = await users();
    const u = mustFind(rows, id, 'Usuário');
    const previous = u.fotoUrl;
    u.fotoUrl = url;
    await writeData('usuarios', rows);
    return previous as string | null;
  });
}

export function classView(a: RecordData, s: Awaited<ReturnType<typeof state>>): RecordData {
  const professor = s.usuarios.find(u => u.id === a.professorId);
  const sala = s.salas.find(r => r.id === a.salaId);
  return { ...a, professor: { id: a.professorId, nome: professor?.nome || 'Professor indisponível', iniciais: (professor?.nome || '?').split(' ').map((x: string) => x[0]).slice(0, 2).join('') },
    sala: sala?.nome || 'Sala indisponível', predio: sala?.predio || '', horario: a.horarioInicio + ' — ' + a.horarioFim, descricao: a.descricao || '' };
}
/**
 * Busca uma aula da grade OU uma reserva avulsa pelo id e devolve
 * no formato que a view class-details.ejs espera.
 * `tipo` indica a origem: 'aula' (aulas-grade) ou 'reserva'.
 */
export async function buscarAulaPorId(id: string): Promise<RecordData> {
  const s = await state();
  const alvo = String(id ?? '');

  const aula = s.aulas.find(a => a.id === alvo);
  if (aula) return { ...classView(aula, s), tipo: 'aula' };

  const reserva = s.reservas.find(r => r.id === alvo);
  if (reserva) {
    const [ano, mes, dia] = String(reserva.data).split('-');
    return {
      ...classView({
        ...reserva,
        isNoa: false,
        ativa: reserva.status === 'confirmada',
        diaSemana: dia ? `${dia}/${mes}/${ano}` : reserva.data,
        semestre: '—',
        descricao: reserva.observacoes || '',
      }, s),
      tipo: 'reserva',
    };
  }

  throw new HttpError(404, 'Aula não encontrada.');
}

/**
 * Cria uma reserva avulsa de sala por um professor.
 * Valida: professor ativo, sala ativa, formato de horário, data/hora futura,
 * conflito com reservas confirmadas e aulas da grade.
 * As mensagens de conflito distinguem "sala ocupada" de "professor ocupado".
 */
export async function createBooking(id: string, data: RecordData) {
  return transaction(async () => {
    const s = await state();

    // 1) Professor precisa existir, estar ativo e ter perfil de professor.
    const professor = mustFind(s.usuarios, id, 'Professor');
    if (professor.perfil !== 'professor' || !professor.ativo) {
      throw new HttpError(403, 'Apenas professores ativos podem reservar.');
    }

    // 2) Sala precisa existir e estar ativa.
    const sala = mustFind(s.salas, required(data.salaId, 'Sala'), 'Sala');
    if (sala.ativa === false) throw new HttpError(409, 'Sala inativa.');

    // 3) Valida formato dos horários antes de instanciar a Reserva,
    //    para devolver mensagem clara em vez de erro do construtor.
    const inicio = required(data.horarioInicio, 'Início');
    const fim = required(data.horarioFim, 'Término');
    if (!validarFormatoHorario(inicio) || !validarFormatoHorario(fim)) {
      throw new HttpError(400, 'Horário inválido. Use o formato HH:MM.');
    }
    if (!validarHorarioReserva(inicio, fim)) {
      throw new HttpError(400, 'O horário de término deve ser posterior ao de início.');
    }

    // 4) Data precisa ser válida e não pode estar no passado.
    const dataStr = required(data.data, 'Data');
    if (!validarDataReserva(dataStr)) {
      throw new HttpError(400, 'Escolha uma data a partir de hoje.');
    }

    // 5) Constrói a reserva (mantém as validações do model Reserva).
    const reserva = validated(() => new Reserva(
      sala.id,
      id,
      required(data.disciplina, 'Disciplina', 2),
      required(data.turma, 'Turma'),
      dataStr,
      inicio,
      fim
    )).toJSON();

    // 6) Regra original preservada: horário de início não pode ser no passado.
    if (reserva.data + 'T' + reserva.horarioInicio <= schoolNow()) {
      throw new HttpError(400, 'Escolha um horário futuro.');
    }

    // 7) Detecta conflitos separando as causas para dar mensagem clara.
    //    - Mesma sala, mesma data, intervalo sobreposto, reserva confirmada.
    const conflitoSalaReserva = s.reservas.some(r =>
      r.status === 'confirmada' &&
      r.data === reserva.data &&
      r.salaId === sala.id &&
      overlaps(r, reserva)
    );
    //    - Mesma sala, data dentro do semestre da aula, intervalo sobreposto.
    const conflitoSalaAula = s.aulas.some(a =>
      a.salaId === sala.id &&
      vigente(a, reserva.data) &&
      overlaps(a, reserva)
    );
    if (conflitoSalaReserva || conflitoSalaAula) {
      throw new HttpError(409, 'Esta sala já está ocupada no horário selecionado. Escolha outro horário ou outra sala.');
    }

    //    - Professor com reserva confirmada sobreposta.
    const conflitoProfessorReserva = s.reservas.some(r =>
      r.status === 'confirmada' &&
      r.data === reserva.data &&
      r.professorId === id &&
      overlaps(r, reserva)
    );
    //    - Professor com aula na grade sobreposta.
    const conflitoProfessorAula = s.aulas.some(a =>
      a.professorId === id &&
      vigente(a, reserva.data) &&
      overlaps(a, reserva)
    );
    if (conflitoProfessorReserva || conflitoProfessorAula) {
      throw new HttpError(409, 'Você já possui uma aula ou reserva neste horário. Escolha outro horário.');
    }

    // 8) Persiste a reserva no store existente.
    await writeData('reservas', [...s.reservas, reserva]);
    return reserva;
  });
}

export async function cancelBooking(actor: string, id: string) {
  return transaction(async () => {
    const rows = await readData('reservas');
    const r = mustFind(rows, id, 'Reserva');
    if (r.professorId !== actor) throw new HttpError(403, 'Esta reserva pertence a outro professor.');
    if (r.data + 'T' + r.horarioFim <= schoolNow()) throw new HttpError(409, 'Reserva já encerrada.');
    r.status = 'cancelada';
    await writeData('reservas', rows);
  });
}

export async function saveRoom(data: RecordData, id?: string) {
  return transaction(async () => {
    const s = await state();
    const previous = id ? mustFind(s.salas, id, 'Sala') : {};
    const sala = validated(() => new Sala(required(data.nome, 'Nome', 2), data.capacidade, strings(data.recursos), required(data.predio, 'Prédio'), data.andar || undefined, id)).toJSON();
    const next: RecordData = { ...previous, ...sala, ativa: flag(data.ativa, true) };
    if (s.aulas.some(a => a.salaId === id && a.isNoa && (a.vagasTotal || 0) > next.capacidade)) throw new HttpError(409, 'A capacidade é menor que o limite de uma atividade NOA vinculada.');
    await writeData('salas', id ? s.salas.map(r => r.id === id ? next : r) : [...s.salas, next]);
    return next;
  });
}

export async function saveClass(data: RecordData, actor: RecordData, id?: string) {
  return transaction(async () => {
    const s = await state();
    const previous = id ? mustFind(s.aulas, id, 'Aula') : undefined;
    if (actor.perfil !== 'administrador' && (!previous || previous.professorId !== actor.id)) throw new HttpError(403, 'Sem permissão para editar a aula.');
    const professorId = actor.perfil === 'administrador' ? required(data.professorId, 'Professor') : previous!.professorId;
    const professor = mustFind(s.usuarios, professorId, 'Professor');
    const sala = mustFind(s.salas, required(data.salaId, 'Sala'), 'Sala');
    if (professor.perfil !== 'professor' || !professor.ativo || sala.ativa === false) throw new HttpError(400, 'Selecione professor e sala ativos.');
    const semestre = required(data.semestre, 'Semestre');
    const range = semesterRange(semestre);
    const aula = validated(() => new AulaGrade(required(data.disciplina, 'Disciplina', 2), professorId, sala.id, required(data.turma, 'Turma'), data.diaSemana, required(data.horarioInicio, 'Início'), required(data.horarioFim, 'Término'), flag(data.isNoa, false), id)).toJSON();
    const vagasTotal = aula.isNoa ? data.vagasTotal : 0;
    if (aula.isNoa && (!Number.isInteger(vagasTotal) || vagasTotal < 1 || vagasTotal > sala.capacidade)) throw new HttpError(400, 'Vagas devem ser positivas e não exceder a capacidade da sala.');
    const inscricoes = s.inscricoes.filter(i => i.aulaId === id);
    if (inscricoes.length && (!aula.isNoa || vagasTotal < inscricoes.length)) throw new HttpError(409, 'Existem inscrições incompatíveis com essa alteração.');
    const next: RecordData = { ...previous, ...aula, semestre, vagasTotal, ativa: flag(data.ativa, true), descricao: typeof data.descricao === 'string' ? data.descricao.trim() : '' };
    if (next.ativa && (s.aulas.some(a => a.id !== id && a.ativa !== false && a.semestre === semestre && a.diaSemana === next.diaSemana && (a.salaId === sala.id || a.professorId === professorId) && overlaps(a, next)) ||
      s.reservas.some(r => r.status === 'confirmada' && r.data >= range[0] && r.data <= range[1] && vigente(next, r.data) && (r.salaId === sala.id || r.professorId === professorId) && overlaps(r, next)))) throw new HttpError(409, 'Horário conflita com outra aula ou reserva.');
    await writeData('aulas-grade', id ? s.aulas.map(a => a.id === id ? next : a) : [...s.aulas, next]);
    return next;
  });
}

export async function cancelClass(id: string, actor: RecordData) {
  return transaction(async () => {
    const rows = await readData('aulas-grade');
    const a = mustFind(rows, id, 'Aula');
    if (actor.perfil !== 'administrador' && !(actor.perfil === 'professor' && a.professorId === actor.id)) throw new HttpError(403, 'Sem permissão.');
    a.ativa = false;
    await writeData('aulas-grade', rows);
  });
}

export async function removeRecord(collection: 'usuarios' | 'salas' | 'aulas-grade', id: string, actorId: string) {
  return transaction(async () => {
    const s = await state();
    const rows = collection === 'usuarios' ? s.usuarios : collection === 'salas' ? s.salas : s.aulas;
    const row = mustFind(rows, id, 'Registro');
    if (collection === 'usuarios' && (id === actorId || (row.perfil === 'administrador' && row.ativo && s.usuarios.filter(u => u.perfil === 'administrador' && u.ativo).length <= 1))) throw new HttpError(409, 'Não é possível remover essa conta administrativa.');
    const linked = collection === 'usuarios' ? s.reservas.some(r => r.professorId === id) || s.aulas.some(a => a.professorId === id) || s.inscricoes.some(i => i.alunoId === id)
      : collection === 'salas' ? s.reservas.some(r => r.salaId === id) || s.aulas.some(a => a.salaId === id) : s.inscricoes.some(i => i.aulaId === id);
    if (linked) throw new HttpError(409, 'Registro possui vínculos. Desative-o em vez de excluir.');
    await writeData(collection, rows.filter(r => r.id !== id));
  });
}

export async function enroll(alunoId: string, aulaId: string, cancel = false) {
  return transaction(async () => {
    const s = await state();
    const user = mustFind(s.usuarios, alunoId, 'Aluno');
    if (user.perfil !== 'aluno' || !user.ativo) throw new HttpError(403, 'Apenas alunos ativos podem se inscrever.');
    if (cancel) { await writeData('inscricoes-noa', s.inscricoes.filter(i => !(i.aulaId === aulaId && i.alunoId === alunoId))); return; }
    const a = mustFind(s.aulas, aulaId, 'Atividade');
    const sala = mustFind(s.salas, a.salaId, 'Sala');
    const professor = mustFind(s.usuarios, a.professorId, 'Professor');
    const [start, end] = semesterRange(a.semestre);
    const today = schoolNow().slice(0, 10);
    if (!a.isNoa || a.ativa === false || sala.ativa === false || !professor.ativo || today < start || today > end) throw new HttpError(409, 'Atividade não está disponível para inscrição.');
    if (s.inscricoes.some(i => i.aulaId === aulaId && i.alunoId === alunoId)) throw new HttpError(409, 'Você já está inscrito.');
    if (s.inscricoes.filter(i => i.aulaId === aulaId).length >= Math.min(a.vagasTotal, sala.capacidade)) throw new HttpError(409, 'Não há vagas.');
    await writeData('inscricoes-noa', [...s.inscricoes, { id: randomUUID(), alunoId, aulaId, criadoEm: new Date().toISOString() }]);
  });
}


// ============================================================
// Consultas de leitura para as telas (dashboard, noa, search).
// Reaproveitam state() e classView para manter um único ponto
// de verdade sobre como uma aula é apresentada.
// ============================================================

export type FiltrosBusca = {
  disciplina?: string;
  professor?: string;
  sala?: string;
  turno?: string;
  diaSemana?: string;
  semestre?: string;
  q?: string;
};

// Deriva o turno a partir do horário de início da aula.
// Manhã: <12h · Tarde: 12h–17h59 · Noite: >=18h
function turnoDe(horarioInicio: string): 'manha' | 'tarde' | 'noite' {
  const hora = Number(String(horarioInicio).slice(0, 2));
  if (hora < 12) return 'manha';
  if (hora < 18) return 'tarde';
  return 'noite';
}

// Aulas do dia para um professor específico.
export async function listarProximasAulasProfessor(professorId: string): Promise<RecordData[]> {
  const s = await state();
  const hoje = schoolNow().slice(0, 10);
  return s.aulas
    .filter(a => a.ativa !== false && a.professorId === professorId && vigente(a, hoje))
    .map(a => ({ ...classView(a, s), turno: turnoDe(a.horarioInicio) }));
}

// Salas sem reserva confirmada (nem aula vigente) no horário atual.
export async function listarSalasDisponiveisAgora(): Promise<RecordData[]> {
  const s = await state();
  const agora = schoolNow(); // "YYYY-MM-DDTHH:mm"
  const hoje = agora.slice(0, 10);
  const hora = agora.slice(11, 16);
  const ocupadas = new Set<string>();

  for (const r of s.reservas) {
    if (r.status !== 'confirmada') continue;
    if (r.data !== hoje) continue;
    if (hora >= r.horarioInicio && hora < r.horarioFim) ocupadas.add(r.salaId);
  }
  for (const a of s.aulas) {
    if (a.ativa === false) continue;
    if (!vigente(a, hoje)) continue;
    if (hora >= a.horarioInicio && hora < a.horarioFim) ocupadas.add(a.salaId);
  }
  return s.salas.filter(r => r.ativa !== false && !ocupadas.has(r.id));
}

// Aulas do dia para uma turma (usado no dashboard do aluno).
export async function listarCronogramaAluno(turma: string): Promise<RecordData[]> {
  const s = await state();
  const hoje = schoolNow().slice(0, 10);
  return s.aulas
    .filter(a => a.ativa !== false && a.turma === turma && vigente(a, hoje))
    .map(a => ({ ...classView(a, s), turno: turnoDe(a.horarioInicio) }));
}

// Todas as atividades NOA com status de disponibilidade calculado.
export async function listarAtividadesNoa(): Promise<RecordData[]> {
  const s = await state();
  const hoje = schoolNow().slice(0, 10);
  return s.aulas
    .filter(a => a.isNoa)
    .map(a => {
      const [start, end] = semesterRange(a.semestre);
      const sala = s.salas.find(r => r.id === a.salaId);
      const professor = s.usuarios.find(u => u.id === a.professorId);
      const disponivel =
        a.ativa !== false &&
        hoje >= start && hoje <= end &&
        !!sala && sala.ativa !== false &&
        !!professor && professor.ativo;
      return {
        ...classView(a, s),
        turno: turnoDe(a.horarioInicio),
        disponivel,
        vagasOcupadas: s.inscricoes.filter(i => i.aulaId === a.id).length,
      };
    });
}

// Inscrições NOA de um aluno (com o detalhe da atividade).
export async function listarInscricoesNoaAluno(alunoId: string): Promise<RecordData[]> {
  const s = await state();
  return s.inscricoes
    .filter(i => i.alunoId === alunoId)
    .map((i): RecordData | null => {
      const a = s.aulas.find(x => x.id === i.aulaId);
      return a ? { ...classView(a, s), inscricaoId: i.id, inscritoEm: i.criadoEm } : null;
    })
    .filter((x): x is RecordData => x !== null);
}

// Busca de aulas com filtros opcionais. Todos são combinados com AND.
// Se só `q` vier, faz busca textual ampla (compatível com a tela atual).
export async function buscarAulas(filtros: FiltrosBusca = {}): Promise<RecordData[]> {
  const s = await state();
  const norm = (v: unknown) => String(v ?? '').trim().toLocaleLowerCase('pt-BR');
  const disciplina = norm(filtros.disciplina);
  const professor = norm(filtros.professor);
  const sala = norm(filtros.sala);
  const turno = norm(filtros.turno);
  const diaSemana = norm(filtros.diaSemana);
  const semestre = norm(filtros.semestre);
  const q = norm(filtros.q);

  return s.aulas
    .map((a): RecordData => ({ ...classView(a, s), turno: turnoDe(a.horarioInicio) }))
    .filter(a => {
      if (disciplina && !norm(a.disciplina).includes(disciplina)) return false;
      if (professor && !norm(a.professor?.nome).includes(professor)) return false;
      if (sala && !norm(a.sala).includes(sala)) return false;
      if (turno && a.turno !== turno) return false;
      if (diaSemana && norm(a.diaSemana) !== diaSemana) return false;
      if (semestre && norm(a.semestre) !== semestre) return false;
      if (q) {
        const blob = [a.disciplina, a.professor?.nome, a.sala, a.turma, a.diaSemana, a.semestre]
          .map(norm).join(' ');
        if (!blob.includes(q)) return false;
      }
      return true;
    });
}

/**
 * Ativa/desativa um usuário administrativamente.
 * Não é possível desativar a si mesmo nem o último administrador ativo
 * (mesma regra de saveUser, para manter consistência).
 */
export async function atualizarStatusUsuario(
  id: string,
  ativo: boolean,
  actorId?: string
): Promise<RecordData> {
  return transaction(async () => {
    const s = await state();
    const alvo = mustFind(s.usuarios, required(id, 'ID'), 'Usuário');

    if (actorId && actorId === id && ativo === false) {
      throw new HttpError(409, 'Você não pode desativar sua própria conta.');
    }

    if (
      ativo === false &&
      alvo.perfil === 'administrador' &&
      alvo.ativo &&
      s.usuarios.filter(u => u.perfil === 'administrador' && u.ativo).length <= 1
    ) {
      throw new HttpError(409, 'Mantenha pelo menos um administrador ativo.');
    }

    const next: RecordData = { ...alvo, ativo: flag(ativo, true) };
    await writeData(
      'usuarios',
      s.usuarios.map(u => (u.id === id ? next : u))
    );
    return safeUser(next);
  });
}

/**
 * Lista as salas ativas marcando cada uma como disponível ou não
 * para a data/horário informados. Sem data/horário, todas voltam disponíveis.
 * Usado pela tela de reserva para exibir os cards de sala com status.
 */
export async function listarSalasComDisponibilidade(data?: string, horarioInicio?: string, horarioFim?: string) {
  const s = await state();
  const filtrar = !!(data && horarioInicio && horarioFim);
  return s.salas
    .filter(sala => sala.ativa !== false)
    .map(sala => {
      if (!filtrar) return { ...sala, disponivel: true };
      const faixa = { data, horarioInicio, horarioFim };
      const ocupadaPorReserva = s.reservas.some(r =>
        r.status === 'confirmada' && r.data === data && r.salaId === sala.id && overlaps(r, faixa)
      );
      const ocupadaPorAula = s.aulas.some(a =>
        a.ativa !== false && a.salaId === sala.id && vigente(a, data) && overlaps(a, faixa)
      );
      return { ...sala, disponivel: !(ocupadaPorReserva || ocupadaPorAula) };
    });
}

// ---------- Aliases (opcionais) ----------
export const listarSalas      = async () => (await state()).salas;
export const listarAulasGrade = async () => (await state()).aulas;
export const listarUsuarios   = users;

export const criarSala        = (dados: RecordData) => saveRoom(dados);
export const atualizarSala    = (id: string, dados: RecordData) => saveRoom(dados, id);
export const removerSala      = (id: string, actorId: string) => removeRecord('salas', id, actorId);

export const criarAulaGrade     = (dados: RecordData, actor: RecordData) => saveClass(dados, actor);
export const atualizarAulaGrade = (id: string, dados: RecordData, actor: RecordData) => saveClass(dados, actor, id);
export const removerAulaGrade   = (id: string, actorId: string) => removeRecord('aulas-grade', id, actorId);