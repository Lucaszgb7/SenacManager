import { Request, Response } from 'express';
import { state, createBooking, listarSalasComDisponibilidade } from '../services/SchoolService';
import { schoolNow, vigente, HttpError } from '../services/validation';
export class RoomController {
  listarDisponiveis = async (req: Request, res: Response): Promise<void> => {
    const s = await state();
    const now = schoolNow(), date = now.slice(0, 10), time = now.slice(11);
    const salas = s.salas.map(sala => {
      const reserva = s.reservas.find(r => r.salaId === sala.id && r.status === 'confirmada' && r.data === date && r.horarioInicio <= time && r.horarioFim > time);
      const aula = s.aulas.find(a => a.salaId === sala.id && vigente(a, date) && a.horarioInicio <= time && a.horarioFim > time);
      const ocupacao = reserva || aula;
      return { ...sala, status: sala.ativa === false ? 'inativa' : ocupacao ? 'ocupada' : 'disponivel', ocupacaoAtual: ocupacao ? { ...ocupacao, professor: s.usuarios.find(u => u.id === ocupacao.professorId)?.nome || 'Professor indisponível' } : null };
    });
    res.render('rooms/available-rooms', { salas });
  };
  /**
   * GET /rooms/booking
   * Renderiza o formulário de reserva com:
   * - salas já marcadas como disponíveis/ocupadas para o intervalo consultado;
   * - filtros preenchidos com data, horários e sala vindos da query;
   * - mensagens de sucesso/erro de um POST anterior.
   */
  telaReserva = async (req: Request, res: Response): Promise<void> => {
    // Filtros da query normalizados para string
    const filtros = {
      data: String(req.query.data || ''),
      horarioInicio: String(req.query.horarioInicio || ''),
      horarioFim: String(req.query.horarioFim || ''),
      salaId: String(req.query.salaId || ''),
    };

    // Salas com disponibilidade calculada para o intervalo consultado
    const salas = await listarSalasComDisponibilidade(
      filtros.data || undefined,
      filtros.horarioInicio || undefined,
      filtros.horarioFim || undefined
    );

    res.render('rooms/room-booking', {
      salas,
      filtros,
      hoje: schoolNow().slice(0, 10),
      sucesso: String(req.query.sucesso || ''),
      erro: String(req.query.erro || ''),
    });
  };
  /**
   * POST /rooms/booking
   * Cria a reserva pelo createBooking e devolve ao formulário com mensagem
   * de sucesso ou erro na query string (POST-redirect-GET).
   */
  confirmarReserva = async (req: Request, res: Response): Promise<void> => {
    // Campos preservados no redirect para o formulário voltar preenchido
    const voltar = {
      data: String(req.body?.data || ''),
      horarioInicio: String(req.body?.horarioInicio || ''),
      horarioFim: String(req.body?.horarioFim || ''),
      salaId: String(req.body?.salaId || ''),
    };

    // Clientes JSON (fetch/API) recebem o status HTTP real; erros seguem para o errorMiddleware
    if ((req.headers.accept || '').includes('application/json') || req.is('application/json')) {
      const record = await createBooking(req.session.usuario!.id, req.body || {});
      res.status(201).json({ success: true, message: 'Reserva realizada com sucesso!', record, reserva: record });
      return;
    }

    try {
      await createBooking(req.session.usuario!.id, req.body || {});
      // Confirmação: volta à tela de reserva com a mensagem de sucesso
      const qs = new URLSearchParams({ ...voltar, sucesso: 'Reserva realizada com sucesso!' });
      res.redirect('/rooms/booking?' + qs.toString());
    } catch (err) {
      // Erros de validação/conflito emitidos por createBooking viram mensagem visível
      const msg = err instanceof HttpError ? err.message : 'Não foi possível concluir a reserva.';
      const qs = new URLSearchParams({ ...voltar, erro: msg });
      res.redirect('/rooms/booking?' + qs.toString());
    }
  };
}
export default new RoomController();
