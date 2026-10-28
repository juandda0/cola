import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

const TRAZOS: Record<string, string> = {
  check: 'M5 12.5l4.5 4.5L19 7.5',
  cola: 'M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01',
  hechas: 'M21 12a9 9 0 11-18 0 9 9 0 0118 0zM8.5 12.5l2.5 2.5 4.5-5',
  ajustes: 'M4 7h9M17 7h3M4 17h3M11 17h9M15 4.5v5M9 14.5v5',
  mas: 'M12 5v14M5 12h14',
  enviar: 'M12 19V5M5 12l7-7 7 7',
  opciones: 'M5 12h.01M12 12h.01M19 12h.01',
  candado: 'M7.5 11V8a4.5 4.5 0 019 0v3M6 11h12v9H6z',
  compartir: 'M4 12v7a1 1 0 001 1h14a1 1 0 001-1v-7M16 6l-4-4-4 4M12 2v13',
  campana: 'M6 9a6 6 0 1112 0c0 6 2 7 2 7H4s2-1 2-7zM10 20a2 2 0 004 0',
  salir: 'M15 4h4a1 1 0 011 1v14a1 1 0 01-1 1h-4M10 8l-4 4 4 4M6 12h10',
  cerrar: 'M6 6l12 12M18 6L6 18',
};

@Component({
  selector: 'app-icono',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[style.width.px]': 'tamano()', '[style.height.px]': 'tamano()' },
  template: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
    stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path [attr.d]="trazo()" /></svg>`,
  styles: `
    :host { display: inline-flex; flex: none; }
    svg { width: 100%; height: 100%; }
  `,
})
export class Icono {
  readonly nombre = input.required<string>();
  readonly tamano = input(20);
  protected readonly trazo = computed(() => TRAZOS[this.nombre()] ?? '');
}
