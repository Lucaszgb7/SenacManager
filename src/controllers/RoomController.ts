import { Request, Response } from 'express';
import { state, createBooking } from '../services/SchoolService';
import { schoolNow, vigente, overlaps } from '../services/validation';
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
  telaReserva = async (req: Request, res: Response): Promise<void> => {
    const s = await state();
    const { data, horarioInicio, horarioFim } = req.query;
    const salas = s.salas.filter(sala => sala.ativa !== false).map(sala => ({ ...sala, indisponivel: typeof data === 'string' && typeof horarioInicio === 'string' && typeof horarioFim === 'string' &&
      (s.reservas.some(r => r.salaId === sala.id && r.status === 'confirmada' && r.data === data && overlaps(r, { horarioInicio, horarioFim })) || s.aulas.some(a => a.salaId === sala.id && vigente(a, data) && overlaps(a, { horarioInicio, horarioFim }))) }));
    res.render('rooms/room-booking', { salas, filtros: req.query, hoje: schoolNow().slice(0, 10) });
  };
  confirmarReserva = async (req: Request, res: Response): Promise<void> => {
    const reserva = await createBooking(req.session.usuario!.id, req.body || {});
    res.status(201).json({ success: true, reserva, redirect: '/bookings/my' });
  };
}
export default new RoomController();
