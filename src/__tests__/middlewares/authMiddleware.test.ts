import { autenticado } from '../../middlewares/authMiddleware';
const request = (headers: Record<string, string> = {}, usuario?: unknown) => ({ headers, session: usuario === undefined ? {} : { usuario } }) as any;
describe('autenticado', () => {
  it('libera sessão válida', () => { const next = jest.fn(); autenticado(request({}, { id: 'u1' }), {} as any, next); expect(next).toHaveBeenCalledTimes(1); });
  it.each([{ accept: 'application/json' }, { 'content-type': 'application/json' }, { 'x-requested-with': 'XMLHttpRequest' }])('responde 401 para API (%o)', headers => { const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any; autenticado(request(headers), res, jest.fn()); expect(res.status).toHaveBeenCalledWith(401); expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false })); });
  it('redireciona navegador não autenticado', () => { const res = { redirect: jest.fn() } as any; autenticado(request({ accept: 'text/html' }), res, jest.fn()); expect(res.redirect).toHaveBeenCalledWith('/login'); });
});
