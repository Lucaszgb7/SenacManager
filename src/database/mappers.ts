import { Collection, RecordData } from './types';
// Somente identificadores constantes podem entrar nas consultas SQL.
export const definitions = {
  usuarios: { table: 'usuarios', fields: ['id','nome','email','senhaHash','perfil','ativo','criadoEm','disciplinas','titulacao','curso','turma','matricula','nivelAcesso','departamento','telefone','fotoUrl'] },
  salas: { table: 'salas', fields: ['id','nome','predio','andar','capacidade','recursos','ativa','criadoEm'] },
  reservas: { table: 'reservas', fields: ['id','professorId','salaId','data','horarioInicio','horarioFim','status','turma','disciplina','observacoes','criadoEm'] },
  'aulas-grade': { table: 'aulas_grade', fields: ['id','professorId','salaId','disciplina','diaSemana','horarioInicio','horarioFim','turma','semestre','isNoa','vagasTotal','ativa','criadoEm','descricao'] },
  'inscricoes-noa': { table: 'inscricoes_noa', fields: ['id','alunoId','aulaId','criadoEm'] },
} satisfies Record<Collection, { table: string; fields: string[] }>;
export const column = (field: string) => field.replace(/[A-Z]/g, c => '_' + c.toLowerCase());
const arrays = new Set(['recursos','disciplinas']);
const booleans = new Set(['ativo','ativa','isNoa']);
export function toDatabase(name: Collection, row: RecordData): RecordData {
  const result: RecordData = {};
  for (const field of definitions[name].fields) {
    let value = row[field] ?? null;
    if (value !== null) {
      if (arrays.has(field)) value = JSON.stringify(value);
      else if (booleans.has(field)) value = value ? 1 : 0;
      else if (field === 'criadoEm') value = new Date(value).toISOString().slice(0, 23).replace('T', ' ');
      else if (field === 'email') value = String(value).trim().toLowerCase();
    }
    result[column(field)] = value;
  }
  // Preserva campo ausente versus null dos arquivos JSON.
  result.campos = JSON.stringify(definitions[name].fields.filter(f => row[f] !== undefined));
  return result;
}
export function fromDatabase(name: Collection, row: RecordData): RecordData {
  const present: string[] | undefined = typeof row.campos === 'string' ? JSON.parse(row.campos) : row.campos;
  const result: RecordData = {};
  for (const field of definitions[name].fields) {
    if (present && !present.includes(field)) continue;
    let value = row[column(field)];
    if (value === undefined) continue;
    if (value !== null) {
      if (arrays.has(field)) value = typeof value === 'string' ? JSON.parse(value) : value;
      else if (booleans.has(field)) value = value === true || value === 1 || value === '1';
      else if (field === 'criadoEm') value = value instanceof Date ? value.toISOString() : new Date(String(value).replace(' ', 'T').replace(/Z$/, '') + 'Z').toISOString();
      else if (field === 'horarioInicio' || field === 'horarioFim') value = String(value).slice(0, 5);
      else if (field === 'data') value = String(value).slice(0, 10);
      else if (field === 'id' || field.endsWith('Id')) value = String(value);
    }
    result[field] = value;
  }
  return result;
}
