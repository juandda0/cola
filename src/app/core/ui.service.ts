import { Injectable, signal } from '@angular/core';

export interface Aviso {
  id: number;
  titulo: string;
  detalle?: string;
}

/** Avisos breves en pantalla (toasts). */
@Injectable({ providedIn: 'root' })
export class UiService {
  readonly avisos = signal<Aviso[]>([]);
  private siguiente = 1;

  mostrar(titulo: string, detalle?: string): void {
    const aviso = { id: this.siguiente++, titulo, detalle };
    this.avisos.update((a) => [...a, aviso]);
    setTimeout(() => this.avisos.update((a) => a.filter((x) => x.id !== aviso.id)), 4500);
  }

  error(e: unknown, fallback = 'Algo salió mal. Intenta de nuevo.'): void {
    console.error(e);
    this.mostrar(fallback);
  }
}
