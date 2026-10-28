export type ColorTema = 'rosa' | 'amarillo';

export interface Perfil {
  uid: string;
  nombre: string;
  color: ColorTema;
  espacioId: string | null;
}

export interface Espacio {
  id: string;
  miembros: string[];
  horasRecordatorio: number[];
}

export interface Actividad {
  id: string;
  titulo: string;
  creadaPor: string;
  creadaEn: Date;
  estado: 'pendiente' | 'completada';
  completadaPor?: string;
  completadaEn?: Date;
}

export const COLORES: Record<ColorTema, { nombre: string; punto: string }> = {
  rosa: { nombre: 'Rosado', punto: 'var(--rosa)' },
  amarillo: { nombre: 'Amarillo', punto: 'var(--amarillo)' },
};
