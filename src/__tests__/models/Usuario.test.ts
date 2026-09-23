import { Professor } from '../../models/Professor';
const hash = 'hash-de-senha-com-pelo-menos-20';
describe('Usuario/Professor', () => {
  it('normaliza nome, email e disciplinas', () => { const p = new Professor('  Ana Souza  ', 'ANA@EXEMPLO.COM', hash, [' Matemática ', 'matemática', ' História ']); expect(p.nome).toBe('Ana Souza'); expect(p.email).toBe('ana@exemplo.com'); expect(p.disciplinas).toEqual(['Matemática', 'História']); expect(p.perfil).toBe('professor'); });
  it.each([['nome curto', () => new Professor('Jo', 'a@b.com', hash)], ['email inválido', () => new Professor('João Silva', 'invalido', hash)], ['hash curto', () => new Professor('João Silva', 'a@b.com', 'curto')]])('rejeita %s', (_d, criar) => expect(criar).toThrow());
  it('serializa e reconstrói um professor', () => { const p = new Professor('Maria Lima', 'Maria@Exemplo.com', hash, ['Programação'], 'prof-1', new Date('2024-01-02T03:04:05.000Z')); expect(Professor.fromJSON(p.toJSON()).toJSON()).toEqual(p.toJSON()); });
  it('retorna cópia defensiva das disciplinas', () => { const p = new Professor('João Silva', 'joao@a.com', hash, ['Redes']); const d = p.disciplinas; d.push('Banco de Dados'); expect(p.disciplinas).toEqual(['Redes']); });
});
