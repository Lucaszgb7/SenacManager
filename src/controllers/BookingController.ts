import { Request, Response } from 'express';
import { cancelBooking, classView, state } from '../services/SchoolService';
import { HttpError, schoolNow } from '../services/validation';

export class BookingController {
  async minhasReservas(req: Request, res: Response): Promise<void> {
    const usuario = req.session.usuario;
    if (!usuario) { res.redirect('/login'); return; }
    const s = await state(), now = schoolNow();
    const reservas = s.reservas.filter(r => r.professorId === usuario.id).map(r => classView(r, s));
    const futura = (r: typeof reservas[number]) => r.status === 'confirmada' && r.data + 'T' + r.horarioFim > now;
    const order = (a: typeof reservas[number], b: typeof reservas[number]) =>
      (a.data + a.horarioInicio).localeCompare(b.data + b.horarioInicio);
    res.render('bookings/my-bookings', {
      reservasFuturas: reservas.filter(futura).sort(order),
      reservasPassadas: reservas.filter(r => !futura(r)).sort((a, b) => order(b, a)),
      usuario: res.locals.usuario,
    });
  }

  async cancelar(req: Request, res: Response): Promise<void> {
    const usuario = req.session.usuario;
    if (!usuario) throw new HttpError(401, 'Não autenticado.');
    await cancelBooking(usuario.id, String(req.params.id ?? ''));
    if ((req.headers.accept || '').includes('application/json') || req.is('application/json')) {
      res.json({ success: true, message: 'Reserva cancelada com sucesso.' });
    } else {
      res.redirect('/bookings/my');
    }
  }
}

export default new BookingController();
