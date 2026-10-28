import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { UiService } from '../core/ui.service';

@Component({
  selector: 'app-entrar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="centro">
      <svg class="marca" viewBox="-17 -15 34 32" aria-hidden="true"><path fill="var(--rosa)" d="M0 16C-3 12-17 4-17-5a8.500 8.500 0 0117-3 8.500 8.500 0 0117 3C17 4 3 12 0 16z" /></svg>
      <h1 class="titulo">Sofi y Juan</h1>
      <button class="boton ancho" (click)="entrar()" [disabled]="cargando()">
        <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
          <path fill="currentColor" d="M24 20v8.5h11.8C34.7 33.9 30.1 37 24 37a13 13 0 010-26c3.3 0 6.3 1.2 8.6 3.2l6-6A21.9 21.9 0 0024 2a22 22 0 100 44c12.7 0 21-8.9 21-21.4 0-1.4-.1-2.5-.4-3.6H24z" />
        </svg>
        {{ cargando() ? 'Entrando…' : 'Entrar con Google' }}
      </button>
    </section>
  `,
  styles: `
    :host { display: block; }
    .centro {
      min-height: 100dvh; max-width: 360px; margin: 0 auto; padding: 24px;
      display: flex; flex-direction: column; justify-content: center; gap: 16px;
    }
    .marca { width: 64px; height: 60px; }
  `,
})
export class EntrarPage {
  private readonly auth = inject(AuthService);
  private readonly ui = inject(UiService);
  private readonly router = inject(Router);
  protected readonly cargando = signal(false);

  constructor() {
    // Al iniciar sesión, el guard decide si va a la bienvenida o a la cola.
    effect(() => {
      if (this.auth.usuario()) void this.router.navigateByUrl('/');
    });
  }

  protected async entrar(): Promise<void> {
    this.cargando.set(true);
    try {
      await this.auth.entrarConGoogle();
    } catch (e) {
      this.ui.error(e, 'No se pudo iniciar sesión.');
    } finally {
      this.cargando.set(false);
    }
  }
}
