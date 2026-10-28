const relativo = new Intl.RelativeTimeFormat('es', { numeric: 'auto' });
const corto = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short' });

/** "hace 3 días", "ayer", "hoy"… */
export function hace(fecha: Date): string {
  const dias = Math.floor((Date.now() - fecha.getTime()) / 86_400_000);
  if (dias <= 0) {
    const horas = Math.floor((Date.now() - fecha.getTime()) / 3_600_000);
    return horas <= 0 ? 'hace un momento' : relativo.format(-horas, 'hour');
  }
  return dias < 30 ? relativo.format(-dias, 'day') : corto.format(fecha);
}

export function fechaCorta(fecha: Date): string {
  return corto.format(fecha);
}

const ALFABETO = 'abcdefghjkmnpqrstuvwxyz23456789';

/** Código aleatorio e impredecible para invitar a la pareja. */
export function codigoAleatorio(largo = 12): string {
  const bytes = crypto.getRandomValues(new Uint8Array(largo));
  return Array.from(bytes, (b) => ALFABETO[b % ALFABETO.length]).join('');
}

export function horaLegible(h: number): string {
  const sufijo = h < 12 ? 'a. m.' : 'p. m.';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12} ${sufijo}`;
}
