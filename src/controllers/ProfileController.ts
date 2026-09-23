// src/controllers/ProfileController.ts
import { Request, Response } from "express";
import bcrypt from "bcrypt";
import fs from "fs";
import path from "path";

import { UsuarioRepository } from "../repositories/UsuarioRepository";
import { AVATAR_DIR_PUBLIC_PATH } from "../config/multer";

/**
 * Controller das ações do perfil do usuário logado.
 *
 * Observações do projeto:
 * - UsuarioRepository é INSTANCIÁVEL (segue o padrão dos demais repos).
 * - IDs são STRING.
 * - As rotas de edição são chamadas via fetch → sempre respondem JSON.
 */
export class ProfileController {
  private usuarioRepo = new UsuarioRepository();

  /**
   * GET /profile
   * Renderiza a tela com os dados completos do usuário logado.
   */
  async verPerfil(req: Request, res: Response): Promise<Response | void> {
    try {
      const usuarioSessao = req.session.usuario;
      if (!usuarioSessao) {
        res.redirect("/login");
        return;
      }

      const usuario = await this.usuarioRepo.buscarPorId(usuarioSessao.id);
      if (!usuario) {
        req.session.destroy(() => {
          res.redirect("/login");
        });
        return;
      }

      // SEGURANÇA: nunca entregar senhaHash para a view.
      const usuarioSeguro = {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        perfil: usuario.perfil,
        telefone: usuario.telefone ?? null,
        fotoUrl: usuario.fotoUrl ?? null,
        ...(usuario.perfil === "professor" && {
          titulacao: (usuario as any).titulacao ?? null,
          areaAtuacao: (usuario as any).areaAtuacao ?? null,
        }),
        ...(usuario.perfil === "aluno" && {
          matricula: (usuario as any).matricula ?? null,
          curso: (usuario as any).curso ?? null,
        }),
      };

      res.render("profile/profile", { usuario: usuarioSeguro });
      return;
    } catch (err) {
      console.error("[ProfileController.verPerfil] Erro:", err);
      res.status(500).render("errors/500", {
        message: "Erro ao carregar o perfil.",
      });
      return;
    }
  }

  /**
   * PUT /profile
   * Atualiza dados cadastrais (nome, email, telefone, campos extras).
   */
  async atualizarInfo(req: Request, res: Response): Promise<Response | void> {
    try {
      const usuarioSessao = req.session.usuario;
      if (!usuarioSessao) {
        res.status(401).json({ success: false, message: "Não autenticado." });
        return;
      }

      const { nome, email, telefone, ...extras } = req.body as {
        nome?: string;
        email?: string;
        telefone?: string;
        [key: string]: unknown;
      };

      if (!nome || !email) {
        res.status(400).json({
          success: false,
          message: "Nome e e-mail são obrigatórios.",
        });
        return;
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        res.status(400).json({
          success: false,
          message: "E-mail em formato inválido.",
        });
        return;
      }

      // SEGURANÇA: se o e-mail está mudando, verifica duplicidade.
      if (email !== usuarioSessao.email) {
        const existente = await this.usuarioRepo.buscarPorEmail(email);
        if (existente && existente.id !== usuarioSessao.id) {
          res.status(409).json({
            success: false,
            message: "Este e-mail já está em uso por outra conta.",
          });
          return;
        }
      }

      // SEGURANÇA: whitelist de campos editáveis (anti mass assignment).
      // NUNCA deixar o usuário atualizar `perfil`, `senhaHash`, `id`, `fotoUrl`.
      const camposAtualizaveis: Record<string, unknown> = {
        nome: String(nome).trim(),
        email: String(email).trim().toLowerCase(),
        telefone: telefone ? String(telefone).trim() : null,
      };

      const permitidosPorPerfil: Record<string, string[]> = {
        professor: ["titulacao", "areaAtuacao"],
        aluno: ["matricula", "curso"],
        administrador: [],
      };
      const permitidos = permitidosPorPerfil[usuarioSessao.perfil] ?? [];
      for (const campo of permitidos) {
        if (campo in extras) {
          camposAtualizaveis[campo] = extras[campo];
        }
      }

      await this.usuarioRepo.atualizar(usuarioSessao.id, camposAtualizaveis);

      // Atualiza a sessão para refletir imediatamente no header da aplicação.
      req.session.usuario!.nome = camposAtualizaveis.nome as string;
      req.session.usuario!.email = camposAtualizaveis.email as string;

      res.json({
        success: true,
        message: "Dados atualizados com sucesso.",
        usuario: {
          id: usuarioSessao.id,
          nome: req.session.usuario!.nome,
          email: req.session.usuario!.email,
          perfil: usuarioSessao.perfil,
        },
      });
      return;
    } catch (err) {
      console.error("[ProfileController.atualizarInfo] Erro:", err);
      res.status(500).json({
        success: false,
        message: "Erro ao atualizar os dados.",
      });
      return;
    }
  }

  /**
   * PUT /profile/senha
   * Troca a senha, exigindo a senha atual como confirmação.
   */
  async alterarSenha(req: Request, res: Response): Promise<Response | void> {
    try {
      const usuarioSessao = req.session.usuario;
      if (!usuarioSessao) {
        res.status(401).json({ success: false, message: "Não autenticado." });
        return;
      }

      const { senhaAtual, novaSenha } = req.body as {
        senhaAtual?: string;
        novaSenha?: string;
      };

      if (!senhaAtual || !novaSenha) {
        res.status(400).json({
          success: false,
          message: "Informe a senha atual e a nova senha.",
        });
        return;
      }

      if (novaSenha.length < 8) {
        res.status(400).json({
          success: false,
          message: "A nova senha deve ter pelo menos 8 caracteres.",
        });
        return;
      }

      if (senhaAtual === novaSenha) {
        res.status(400).json({
          success: false,
          message: "A nova senha deve ser diferente da atual.",
        });
        return;
      }

      const usuario = await this.usuarioRepo.buscarPorId(usuarioSessao.id);
      if (!usuario) {
        res.status(404).json({ success: false, message: "Usuário não encontrado." });
        return;
      }

      // SEGURANÇA: confirma a senha atual antes de permitir a troca.
      const senhaConfere = await bcrypt.compare(senhaAtual, usuario.senhaHash);
      if (!senhaConfere) {
        res.status(401).json({
          success: false,
          message: "Senha atual incorreta.",
        });
        return;
      }

      // SEGURANÇA: novo hash com bcrypt (10 rounds).
      const novoHash = await bcrypt.hash(novaSenha, 10);

      await this.usuarioRepo.atualizar(usuarioSessao.id, {
        senhaHash: novoHash,
      });

      res.json({
        success: true,
        message: "Senha alterada com sucesso.",
      });
      return;
    } catch (err) {
      console.error("[ProfileController.alterarSenha] Erro:", err);
      res.status(500).json({
        success: false,
        message: "Erro ao alterar a senha.",
      });
      return;
    }
  }

  /**
   * POST /profile/foto
   * O Multer já processou o arquivo em req.file (ou retornou erro no middleware).
   */
  async uploadFoto(req: Request, res: Response): Promise<Response | void> {
    try {
      const usuarioSessao = req.session.usuario;
      if (!usuarioSessao) {
        if (req.file) this.removerArquivo(req.file.path);
        res.status(401).json({ success: false, message: "Não autenticado." });
        return;
      }

      if (!req.file) {
        res.status(400).json({
          success: false,
          message: "Nenhum arquivo enviado. Selecione uma imagem.",
        });
        return;
      }

      const urlPublica = `${AVATAR_DIR_PUBLIC_PATH}/${req.file.filename}`;

      // SEGURANÇA: remove a foto anterior, se existir.
      const usuarioCompleto = await this.usuarioRepo.buscarPorId(usuarioSessao.id);
      if (
        usuarioCompleto?.fotoUrl &&
        usuarioCompleto.fotoUrl.startsWith(AVATAR_DIR_PUBLIC_PATH)
      ) {
        const antigoAbsoluto = path.resolve(
          __dirname,
          "..",
          "..",
          "public",
          usuarioCompleto.fotoUrl.replace(/^\//, "")
        );
        this.removerArquivo(antigoAbsoluto);
      }

      await this.usuarioRepo.atualizar(usuarioSessao.id, { fotoUrl: urlPublica });

      res.json({
        success: true,
        message: "Foto atualizada com sucesso.",
        fotoUrl: urlPublica,
      });
      return;
    } catch (err) {
      // Se o erro veio depois do Multer salvar, remove o órfão.
      if (req.file) this.removerArquivo(req.file.path);
      console.error("[ProfileController.uploadFoto] Erro:", err);
      res.status(500).json({
        success: false,
        message: "Erro ao processar o upload.",
      });
      return;
    }
  }

  // -----------------------------------------------------------------
  // Helpers privados
  // -----------------------------------------------------------------

  /**
   * Remove arquivo do disco silenciosamente. Nunca lança.
   */
  private removerArquivo(caminhoAbsoluto: string): void {
    fs.unlink(caminhoAbsoluto, (err) => {
      if (err && (err as NodeJS.ErrnoException).code !== "ENOENT") {
        console.warn(
          "[ProfileController] Falha ao remover arquivo:",
          caminhoAbsoluto,
          err.message
        );
      }
    });
  }
}

export default new ProfileController();