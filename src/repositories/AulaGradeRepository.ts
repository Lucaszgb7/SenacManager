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
