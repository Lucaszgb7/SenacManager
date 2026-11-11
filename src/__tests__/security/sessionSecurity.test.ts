import { CleanableSessionStore } from '../../config/session';

describe('Segurança — Armazenamento e Limpeza Automática de Sessões', () => {
  let store: CleanableSessionStore;

  beforeEach(() => {
    store = new CleanableSessionStore(50); // intervalo rápido para testes
  });

  afterEach(() => {
    store.stopCleanup();
    store.clear();
  });

  it('salva e recupera uma sessão válida com seus dados serializados', (done) => {
    const sid = 'sess-123';
    const sessionData = {
      cookie: { originalMaxAge: 3600000, maxAge: 3600000 } as any,
      usuario: { id: 'prof-1', nome: 'Carlos', perfil: 'professor' },
    };

    store.set(sid, sessionData, (setErr) => {
      expect(setErr).toBeFalsy();
      store.get(sid, (getErr, retrieved) => {
        expect(getErr).toBeNull();
        expect(retrieved).toEqual(sessionData);
        done();
      });
    });
  });

  it('destrói a sessão imediatamente quando solicitado via destroy', (done) => {
    const sid = 'sess-logout';
    const sessionData = {
      cookie: { maxAge: 3600000 } as any,
      usuario: { id: 'aluno-1', nome: 'João', perfil: 'aluno' },
    };

    store.set(sid, sessionData, () => {
      store.destroy(sid, (destroyErr) => {
        expect(destroyErr).toBeFalsy();
        store.get(sid, (getErr, retrieved) => {
          expect(getErr).toBeNull();
          expect(retrieved).toBeNull();
          done();
        });
      });
    });
  });

  it('não retorna sessão expirada e remove do armazenamento', (done) => {
    const sid = 'sess-expirada';
    const expiredSession = {
      cookie: { maxAge: -1000 } as any, // já expirada
      usuario: { id: 'admin-1', nome: 'Roberto', perfil: 'administrador' },
    };

    store.set(sid, expiredSession, () => {
      store.get(sid, (getErr, retrieved) => {
        expect(getErr).toBeNull();
        expect(retrieved).toBeNull();
        done();
      });
    });
  });

  it('atualiza a expiração da sessão através do método touch', (done) => {
    const sid = 'sess-touch';
    const initialSession = {
      cookie: { maxAge: 1000 } as any,
      usuario: { id: 'aluno-2', perfil: 'aluno' },
    };

    store.set(sid, initialSession, () => {
      const refreshedSession = {
        cookie: { maxAge: 3600000 } as any,
        usuario: { id: 'aluno-2', perfil: 'aluno' },
      };

      store.touch(sid, refreshedSession, (touchErr) => {
        expect(touchErr).toBeFalsy();
        store.get(sid, (getErr, retrieved) => {
          expect(getErr).toBeNull();
          expect(retrieved).toBeTruthy();
          done();
        });
      });
    });
  });
});
