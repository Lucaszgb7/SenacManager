import { promises as fs } from 'fs';
import { randomUUID } from 'crypto';

/**
 * Classe base para todos os repositories.
 * Centraliza a leitura/escrita de arquivos JSON e a geração de IDs.
 */
export abstract class BaseRepository {
  /**
   * Lê um arquivo JSON e retorna um array de objetos brutos.
   * Se o arquivo não existir, retorna um array vazio.
   * Lança erro se o conteúdo não for um array válido.
   */
  protected async lerArquivo(caminho: string): Promise<any[]> {
    try {
      const conteudo = await fs.readFile(caminho, 'utf-8');

      // Arquivo vazio (ex: recém-criado) => trata como lista vazia
      if (!conteudo.trim()) {
        return [];
      }

      const dados = JSON.parse(conteudo);

      if (!Array.isArray(dados)) {
        throw new Error(`O arquivo "${caminho}" não contém um array JSON válido.`);
      }

      return dados;
    } catch (erro: any) {
      // Arquivo inexistente => lista vazia (primeira execução / seed ausente)
      if (erro?.code === 'ENOENT') {
        return [];
      }

      // Erro de JSON malformado
      if (erro instanceof SyntaxError) {
        throw new Error(`Erro ao interpretar JSON em "${caminho}": ${erro.message}`);
      }

      // Repassa erros já tratados acima
      throw new Error(`Erro ao ler o arquivo "${caminho}": ${erro.message}`);
    }
  }

  /**
   * Salva um array de objetos no arquivo JSON informado.
   * Escreve com indentação de 2 espaços para facilitar leitura manual.
   */
  protected async salvarArquivo(caminho: string, dados: any[]): Promise<void> {
    if (!Array.isArray(dados)) {
      throw new Error(`Tentativa de salvar dados inválidos em "${caminho}": esperado um array.`);
    }

    try {
      const conteudo = JSON.stringify(dados, null, 2);
      await fs.writeFile(caminho, conteudo, 'utf-8');
    } catch (erro: any) {
      throw new Error(`Erro ao escrever no arquivo "${caminho}": ${erro.message}`);
    }
  }

  /**
   * Gera um novo identificador único (UUID v4).
   */
  protected gerarId(): string {
    return randomUUID();
  }

  /**
   * Retorna a data/hora atual no formato ISO 8601 (UTC).
   * Útil para preencher campos como `criadoEm`.
   */
  protected agora(): string {
    return new Date().toISOString();
  }
}
