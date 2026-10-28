import { Request, Response } from 'express';
import { state, cancelBooking } from '../services/SchoolService';
import { RecordData } from '../services/store';
import { schoolNow } from '../services/validation';
export class BookingController {
  minhasReservas = async (req: Request, res: Response): Promise<void> => {
    const s = await state(), now = schoolNow();
    const reservas = s.reservas.filter(r => r.professorId === req.session.usuario!.id).map<RecordData>(r => ({ ...r, sala: s.salas.find(x => x.id === r.salaId)?.nome || 'Sala indisponível', horario: r.horarioInicio + ' — ' + r.horarioFim }));
    const reservasFuturas = reservas.filter(r => r.status === 'confirmada' && r.data + 'T' + r.horarioFim > now).sort((a, b) => (a.data + a.horarioInicio).localeCompare(b.data + b.horarioInicio));
    const reservasPassadas = reservas.filter(r => r.status !== 'confirmada' || r.data + 'T' + r.horarioFim <= now).sort((a, b) => (b.data + b.horarioInicio).localeCompare(a.data + a.horarioInicio));
    res.render('bookings/my-bookings', { reservasFuturas, reservasPassadas });
  };
  cancelar = async (req: Request, res: Response): Promise<void> => {
    await cancelBooking(req.session.usuario!.id, String(req.params.id));
    res.json({ success: true, message: 'Reserva cancelada.' });
  };
}
export default new BookingController();
