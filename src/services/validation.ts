export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export function required(value: unknown, label: string, min = 1): string {
  if (typeof value !== 'string' || value.trim().length < min) throw new HttpError(400, label + ' inválido.');
  return value.trim();
}
export function flag(value: unknown, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  if (typeof value !== 'boolean') throw new HttpError(400, 'Valor booleano inválido.');
  return value;
}
export function strings(value: unknown): string[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.some(v => typeof v !== 'string')) throw new HttpError(400, 'Lista de textos inválida.');
  return value;
}
export function validated<T>(fn: () => T): T {
  try { return fn(); } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(400, error instanceof Error ? error.message : 'Dados inválidos.');
  }
}
export function schoolNow(): string {
  const parts = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
  const get = (key: string) => parts.find(p => p.type === key)!.value;
  return get('year') + '-' + get('month') + '-' + get('day') + 'T' + get('hour') + ':' + get('minute');
}
export function semesterRange(semestre: string): [string, string] {
  if (!/^\d{4}\.[12]$/.test(semestre)) throw new HttpError(400, 'Semestre inválido. Use AAAA.1 ou AAAA.2.');
  const year = semestre.slice(0, 4);
  return semestre.endsWith('.1') ? [year + '-01-01', year + '-06-30'] : [year + '-07-01', year + '-12-31'];
}
export function weekday(date: string): string {
  return ['domingo','segunda','terca','quarta','quinta','sexta','sabado'][new Date(date + 'T12:00:00Z').getUTCDay()]!;
}
export const overlaps = (a: any, b: any) => a.horarioInicio < b.horarioFim && a.horarioFim > b.horarioInicio;
export function vigente(aula: any, date: string): boolean {
  if (aula.ativa === false) return false;
  const [start, end] = semesterRange(aula.semestre);
  return date >= start && date <= end && weekday(date) === aula.diaSemana;
}

// ------------------------------------------------------------
// Validações de reserva
// ------------------------------------------------------------

// Garante formato YYYY-MM-DD e que a data não está no passado
export function validarDataReserva(data: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return false;
  const d = new Date(data + 'T00:00:00');
  if (isNaN(d.getTime())) return false;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  return d >= hoje;
}

// Garante que o início é estritamente anterior ao fim (comparação lexicográfica de HH:MM)
export function validarHorarioReserva(inicio: string, fim: string): boolean {
  return !!inicio && !!fim && inicio < fim;
}

// Verifica se o horário está no formato HH:MM (00:00 a 23:59)
export function validarFormatoHorario(horario: string): boolean {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(horario);
}