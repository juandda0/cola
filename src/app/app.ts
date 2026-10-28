import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { DatosService } from './core/datos.service';
import { UiService } from './core/ui.service';

const COLOR_BARRA = { rosa: '#e8559a', amarillo: '#f5c518' };

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet],
  template: `
    <router-outlet />
    <div class="avisos" aria-live="polite">
      @for (a of ui.avisos(); track a.id) {
        <div class="aviso">
          <strong>{{ a.titulo }}</strong>
          @if (a.detalle) {
            <span>{{ a.detalle }}</span>
          }
        </div>
      }
    </div>
  `,
  styles: `
    .avisos {
      position: fixed; z-index: 50; left: 0; right: 0; top: calc(12px + env(safe-area-inset-top));
      display: flex; flex-direction: column; align-items: center; gap: 8px; pointer-events: none;
    }
    .aviso {
      display: flex; flex-direction: column; gap: 2px;
      max-width: min(92vw, 420px); padding: 10px 14px;
      background: var(--texto); color: var(--bg); border-radius: var(--radio);
      box-shadow: var(--sombra); font-size: 14px; animation: entrar 0.2s ease-out;
    }
    .aviso span { opacity: 0.8; font-size: 13px; }
    @keyframes entrar { from { opacity: 0; transform: translateY(-8px); } }
  `,
})
export class App {
  protected readonly ui = inject(UiService);
  private readonly datos = inject(DatosService);

  constructor() {
    // El color principal de la app es el de quien la está usando.
    effect(() => {
      const color = this.datos.perfil()?.color ?? 'amarillo';
      document.documentElement.dataset['tema'] = color;
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', COLOR_BARRA[color]);
    });
  }
}
