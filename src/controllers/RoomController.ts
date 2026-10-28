import { Request, Response } from 'express';
import { createBooking, listarSalasComDisponibilidade, state } from '../services/SchoolService';
import { HttpError, schoolNow, vigente } from '../services/validation';

export class RoomController {
  listarDisponiveis = async (_req: Request, res: Response): Promise<void> => {
    const s = await state();
    const now = schoolNow(), today = now.slice(0, 10), time = now.slice(11);
    const salas = s.salas.map(sala => {
      const ocupacaoAtual = s.reservas.find(r => r.salaId === sala.id && r.status === 'confirmada' &&
        r.data === today && r.horarioInicio <= time && r.horarioFim > time) ||
        s.aulas.find(a => a.salaId === sala.id && vigente(a, today) && a.horarioInicio <= time && a.horarioFim > time);
      const ocupacao = ocupacaoAtual && { ...ocupacaoAtual, professor: s.usuarios.find(u => u.id === ocupacaoAtual.professorId)?.nome || 'Professor indisponível' };
      return { ...sala, status: sala.ativa === false ? 'inativa' : ocupacaoAtual ? 'ocupada' : 'disponivel', ocupacaoAtual: ocupacao };
    });
    res.render('rooms/available-rooms', { salas, atualizadoEm: new Date(), usuario: res.locals.usuario });
  };

  telaReserva = async (req: Request, res: Response): Promise<void> => {
    const filtros = {
      salaId: String(req.query.salaId ?? ''),
      data: String(req.query.data ?? ''),
      horarioInicio: String(req.query.horarioInicio ?? ''),
      horarioFim: String(req.query.horarioFim ?? ''),
    };
    const salas = await listarSalasComDisponibilidade(filtros.data, filtros.horarioInicio, filtros.horarioFim);
    res.render('rooms/room-booking', {
      salas, filtros, usuario: res.locals.usuario, salaSelecionada: String(req.query.salaId ?? ''),
      hoje: schoolNow().slice(0, 10), erro: null,
    });
  };

  confirmarReserva = async (req: Request, res: Response): Promise<void> => {
    const usuario = req.session.usuario;
    if (!usuario) throw new HttpError(401, 'Não autenticado.');
    // O serviço valida data, sala ativa e conflitos dentro da mesma transação.
    const reserva = await createBooking(usuario.id, req.body || {});
    if ((req.headers.accept || '').includes('application/json') || req.is('application/json')) {
      res.status(201).json({ success: true, message: 'Reserva criada com sucesso.', reserva });
    } else {
      res.redirect('/bookings/my');
    }
  };
}

export default new RoomController();
