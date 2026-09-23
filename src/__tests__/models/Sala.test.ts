import { Sala } from '../../models/Sala';
describe('Sala', () => {
  it('aplica normalização, remove recursos duplicados e serializa', () => { const s = new Sala('  Laboratório  ', 20, [' Projetor ', 'projetor', 'PC'], ' Prédio A ', ' 2', 'sala-1'); expect(s.nome).toBe('Laboratório'); expect(s.recursos).toEqual(['projetor', 'pc']); expect(s.predio).toBe('Prédio A'); expect(s.andar).toBe('2'); expect(s.toJSON()).toEqual({ id: 'sala-1', nome: 'Laboratório', capacidade: 20, recursos: ['projetor', 'pc'], predio: 'Prédio A', andar: '2' }); });
  it.each([['nome', () => new Sala('A', 10, [], 'Bloco A')], ['capacidade', () => new Sala('Sala A', 0, [], 'Bloco A')], ['prédio', () => new Sala('Sala A', 10, [], '')], ['recurso', () => new Sala('Sala A', 10, ['x'], 'Bloco A')]])('valida %s', (_c, criar) => expect(criar).toThrow());
  it('reconstrói a partir de JSON e mantém andar opcional', () => { const s = Sala.fromJSON({ id: 'sala-2', nome: 'Sala B', capacidade: 12, recursos: [], predio: 'Bloco B' }); expect(s.id).toBe('sala-2'); expect(s.andar).toBeUndefined(); expect(s.toJSON()).toEqual({ id: 'sala-2', nome: 'Sala B', capacidade: 12, recursos: [], predio: 'Bloco B' }); });
});
