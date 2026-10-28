import { AulaGrade } from '../models/AulaGrade';
import { BaseRepository } from './BaseRepository';

export class AulaGradeRepository extends BaseRepository {

  constructor() {
    super();
  }

  protected fromJSON(dados: any): AulaGrade {
    return AulaGrade.fromJSON(dados);
  }

  async listarTodas(): Promise<AulaGrade[]> {
    return (await this.lerArquivo('aulas-grade')).map((dados) => this.fromJSON(dados));
  }

  async listarPorAluno(turma: string): Promise<AulaGrade[]> {
    return (await this.listarTodas()).filter((aula) => aula.turma === turma.trim().toUpperCase());
  }

  async listarPorProfessor(professorId: string): Promise<AulaGrade[]> {
    return (await this.listarTodas()).filter((aula) => aula.professorId === professorId);
  }

  async listarNoa(): Promise<AulaGrade[]> {
    return (await this.listarTodas()).filter((aula) => aula.isNoa);
  }

  async buscarPorId(id: string): Promise<AulaGrade | null> {
    return (await this.listarTodas()).find((aula) => aula.id === id) ?? null;
  }
}  
// Importa o modelo que representa uma aula fixa da grade curricular. import { AulaGrade } from '../models/AulaGrade';

// Importa a classe base que fornece os métodos de acesso aos arquivos de dados. import { BaseRepository } from './BaseRepository';

// Define o repositório responsável por consultar e recuperar as aulas da grade curricular. export class AulaGradeRepository extends BaseRepository {

// Inicializa o repositório utilizando o construtor da classe base. constructor() { super(); }

// Converte os dados lidos do arquivo em uma instância do modelo AulaGrade. protected fromJSON(dados: any): AulaGrade { return AulaGrade.fromJSON(dados); }

// Busca e retorna todas as aulas cadastradas na grade curricular. async listarTodas(): Promise<AulaGrade[]> { // Lê os registros do arquivo 'aulas-grade' e converte cada registro em um objeto AulaGrade. return (await this.lerArquivo('aulas-grade')).map((dados) => this.fromJSON(dados)); }

// Busca as aulas que pertencem à turma informada pelo aluno. async listarPorAluno(turma: string): Promise<AulaGrade[]> { // Recupera todas as aulas e filtra aquelas cuja turma corresponde à informada. // Remove espaços extras e converte o nome da turma para maiúsculas antes da comparação. return (await this.listarTodas()).filter((aula) => aula.turma === turma.trim().toUpperCase()); }

// Busca todas as aulas ministradas por um professor específico. async listarPorProfessor(professorId: string): Promise<AulaGrade[]> { // Filtra as aulas comparando o ID do professor com o professorId de cada aula. return (await this.listarTodas()).filter((aula) => aula.professorId === professorId); }

// Retorna somente as aulas identificadas como NOA. async listarNoa(): Promise<AulaGrade[]> { // Mantém apenas as aulas cujo atributo isNoa possui o valor true. return (await this.listarTodas()).filter((aula) => aula.isNoa); }

// Busca uma aula específica utilizando seu identificador único. async buscarPorId(id: string): Promise<AulaGrade | null> { // Procura uma aula com o ID informado. // Caso nenhuma aula seja encontrada, retorna null. return (await this.listarTodas()).find((aula) => aula.id === id) ?? null; } }