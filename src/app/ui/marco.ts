import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { PushService } from '../core/push.service';
import { Icono } from './icono';

/** Marco de las pantallas principales: contenido + barra inferior (primero móvil). */
@Component({
  selector: 'app-marco',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Icono],
  template: `
    <main><router-outlet /></main>
    <nav aria-label="Principal">
      <a routerLink="/" routerLinkActive="activo" [routerLinkActiveOptions]="{ exact: true }">
        <app-icono nombre="cola" /><span>Cola</span>
      </a>
      <a routerLink="/hechas" routerLinkActive="activo">
        <app-icono nombre="hechas" /><span>Hechas</span>
      </a>
      <a routerLink="/ajustes" routerLinkActive="activo">
        <app-icono nombre="ajustes" /><span>Ajustes</span>
      </a>
    </nav>
  `,
  styles: `
    :host { display: flex; flex-direction: column; min-height: 100dvh; }
    main { flex: 1; width: 100%; max-width: 640px; margin: 0 auto; padding-bottom: 72px; }
    nav {
      position: fixed; inset: auto 0 0 0; z-index: 10;
      display: flex; justify-content: center; gap: 4px;
      padding: 6px 12px calc(6px + env(safe-area-inset-bottom));
      background: color-mix(in srgb, var(--bg) 92%, transparent);
      backdrop-filter: blur(10px);
      border-top: 1px solid var(--borde);
    }
    a {
      flex: 1; max-width: 160px;
      display: flex; flex-direction: column; align-items: center; gap: 2px;
      padding: 6px 0; border-radius: var(--radio);
      color: var(--texto-2); font-size: 11px; font-weight: 500; text-decoration: none;
    }
    a.activo { color: var(--acento-texto); }
    a.activo app-icono { color: var(--acento-texto); }
  `,
})
export class MarcoComponent {
  constructor() {
    // Con sesión y perfil listos, deja las notificaciones al día en este dispositivo.
    void inject(PushService).iniciar();
  }
}
