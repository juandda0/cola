import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { DatosService } from '../core/datos.service';
import { COLORES, ColorTema } from '../core/modelos';
import { UiService } from '../core/ui.service';
import { CLAVE_CODIGO } from './unirse';

function codigoGuardado(): string {
  try {
    return localStorage.getItem(CLAVE_CODIGO) ?? '';
  } catch {
    return '';
  }
}

@Component({
  selector: 'app-bienvenida',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  template: `
    <section class="pagina">
      @if (paso() === 1) {
        <h1 class="titulo">Hola 👋</h1>
        <p class="subtitulo">Cuéntanos quién eres. Cada uno tiene su color.</p>

        <label class="etiqueta" for="nombre">Tu nombre</label>
        <input id="nombre" class="campo" [(ngModel)]="nombre" maxlength="30" autocomplete="given-name" placeholder="Juan, Sofi…" />

        <div class="etiqueta">Tu color</div>
        <div class="colores" role="radiogroup" aria-label="Tu color">
          @for (c of colores; track c) {
            <button type="button" role="radio" [attr.aria-checked]="color() === c" class="color"
              [class.sel]="color() === c" [attr.data-c]="c" (click)="color.set(c)">
              <span class="punto" [class]="c"></span>{{ nombres[c] }}
            </button>
          }
        </div>

        <button class="boton ancho sig" [disabled]="!nombre().trim() || guardando()" (click)="continuar()">Continuar</button>
      } @else {
        <h1 class="titulo">Su espacio</h1>
        <p class="subtitulo">Una cola compartida entre los dos.</p>

        @if (codigo()) {
          <div class="tarjeta bloque">
            <p>Te invitaron a una cola. ¿Entrar?</p>
            <button class="boton ancho" [disabled]="guardando()" (click)="unirse()">Unirme</button>
          </div>
        } @else {
          <div class="tarjeta bloque">
            <strong>Soy el primero</strong>
            <p class="subtitulo">Creas el espacio y luego invitas a tu pareja con un enlace.</p>
            <button class="boton ancho" [disabled]="guardando()" (click)="crear()">Crear nuestro espacio</button>
          </div>
          <div class="tarjeta bloque">
            <strong>Ya me invitaron</strong>
            <input class="campo" [(ngModel)]="manual" placeholder="Código de invitación" autocapitalize="none" autocomplete="off" />
            <button class="boton suave ancho" [disabled]="!manual().trim() || guardando()" (click)="unirse(manual())">Unirme con código</button>
          </div>
        }
        <button class="boton peligro ancho" (click)="salir()">Salir</button>
      }
    </section>
  `,
  styles: `
    :host { display: block; max-width: 480px; margin: 0 auto; }
    .colores { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .color {
      display: flex; align-items: center; gap: 10px; min-height: 52px; padding: 0 14px;
      border: 1px solid var(--borde); border-radius: var(--radio); background: var(--bg); font-weight: 500;
    }
    .color .punto { width: 14px; height: 14px; }
    .color.sel[data-c='rosa'] { border-color: var(--rosa); background: color-mix(in srgb, var(--rosa) 12%, var(--bg)); }
    .color.sel[data-c='amarillo'] { border-color: var(--amarillo); background: color-mix(in srgb, var(--amarillo) 16%, var(--bg)); }
    .sig { margin-top: 28px; }
    .bloque { display: flex; flex-direction: column; gap: 10px; padding: 16px; margin-top: 20px; }
    .peligro { margin-top: 24px; }
  `,
})
export class BienvenidaPage {
  private readonly datos = inject(DatosService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly ui = inject(UiService);

  protected readonly colores: ColorTema[] = ['rosa', 'amarillo'];
  protected readonly nombres = { rosa: COLORES.rosa.nombre, amarillo: COLORES.amarillo.nombre };

  protected readonly nombre = signal(this.auth.usuario()?.displayName?.split(' ')[0] ?? '');
  protected readonly color = signal<ColorTema>('amarillo');
  protected readonly paso = signal(this.datos.perfil()?.nombre ? 2 : 1);
  protected readonly codigo = signal(codigoGuardado());
  protected readonly manual = signal('');
  protected readonly guardando = signal(false);

  protected async continuar(): Promise<void> {
    await this.ejecutar(async () => {
      await this.datos.guardarPerfil(this.nombre(), this.color());
      this.paso.set(2);
    });
  }

  protected crear(): Promise<void> {
    return this.ejecutar(async () => {
      await this.datos.crearEspacio();
      await this.router.navigateByUrl('/');
    });
  }

  protected unirse(codigo = this.codigo()): Promise<void> {
    return this.ejecutar(
      async () => {
        await this.datos.unirse(codigo);
        try {
          localStorage.removeItem(CLAVE_CODIGO);
        } catch {
          /* no importa */
        }
        await this.router.navigateByUrl('/');
      },
      'Ese código no sirve, o el espacio ya está completo.',
    );
  }

  protected async salir(): Promise<void> {
    await this.auth.salir();
    await this.router.navigateByUrl('/entrar');
  }

  private async ejecutar(accion: () => Promise<void>, mensajeError?: string): Promise<void> {
    this.guardando.set(true);
    try {
      await accion();
    } catch (e) {
      this.ui.error(e, mensajeError);
    } finally {
      this.guardando.set(false);
    }
  }
}
