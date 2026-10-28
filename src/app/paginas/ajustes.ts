import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { DatosService } from '../core/datos.service';
import { COLORES, ColorTema } from '../core/modelos';
import { PushService } from '../core/push.service';
import { UiService } from '../core/ui.service';
import { horaLegible } from '../core/utilidades';
import { CLAVE_CODIGO } from './unirse';
import { Icono } from '../ui/icono';

@Component({
  selector: 'app-ajustes',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icono],
  template: `
    <section class="pagina">
      <h1 class="titulo">Ajustes</h1>

      <div class="etiqueta">Tú</div>
      <div class="tarjeta bloque">
        <input class="campo" [value]="nombre()" (input)="nombre.set($any($event.target).value)" (change)="guardarNombre()" maxlength="30" aria-label="Tu nombre" />
        <div class="colores" role="radiogroup" aria-label="Tu color">
          @for (c of colores; track c) {
            <button type="button" role="radio" class="color" [attr.data-c]="c" [class.sel]="datos.perfil()?.color === c"
              [attr.aria-checked]="datos.perfil()?.color === c" [disabled]="datos.companero()?.color === c" (click)="cambiarColor(c)">
              <span class="punto" [class]="c"></span>{{ nombres[c] }}
            </button>
          }
        </div>
      </div>

      <div class="etiqueta">Integrantes <span class="contador">{{ datos.espacio()?.miembros?.length ?? 1 }}/2</span></div>
      <div class="tarjeta integrantes">
        @if (datos.perfil(); as yo) {
          <div class="persona">
            <span class="avatar" [attr.data-c]="yo.color">{{ inicial(yo.nombre) }}</span>
            <span class="nombre">{{ yo.nombre }} <small>tú</small></span>
          </div>
        }
        @if (datos.companero(); as c) {
          <div class="persona">
            <span class="avatar" [attr.data-c]="c.color">{{ inicial(c.nombre) }}</span>
            <span class="nombre">{{ c.nombre }}</span>
          </div>
        } @else {
          <div class="persona espera">
            <span class="avatar vacio-av">?</span>
            <span class="nombre">Esperando a tu pareja…</span>
          </div>
          <button class="boton ancho" (click)="invitar()"><app-icono nombre="compartir" [tamano]="18" /> Compartir invitación</button>
        }
      </div>

      <div class="etiqueta">Notificaciones</div>
      <div class="tarjeta bloque">
        @switch (push.estado()) {
          @case ('activo') {
            <p class="fila"><app-icono nombre="campana" [tamano]="18" /> Activadas en este dispositivo.</p>
            <div>
              <p class="subtitulo">Recordarme la actividad pendiente a las:</p>
              <div class="horas">
                @for (h of horasPosibles; track h) {
                  <button type="button" class="hora" [class.sel]="horasActuales().includes(h)" (click)="alternarHora(h)">{{ legible(h) }}</button>
                }
              </div>
            </div>
            <button class="boton suave ancho" (click)="push.desactivar()">Desactivar en este dispositivo</button>
          }
          @case ('bloqueado') {
            <p class="subtitulo">Las notificaciones están bloqueadas. Habilítalas desde los ajustes del navegador para este sitio.</p>
          }
          @case ('no-soportado') {
            <p class="subtitulo">
              @if (push.necesitaInstalar) {
                En iPhone primero instala la app: en Safari toca Compartir → «Agregar a pantalla de inicio» y ábrela desde ahí.
              } @else {
                Este navegador no admite notificaciones push.
              }
            </p>
          }
          @default {
            <p class="subtitulo">Te avisamos cuando tu pareja agregue o complete algo, y te recordamos lo pendiente.</p>
            <button class="boton ancho" [disabled]="push.estado() === 'cargando'" (click)="push.activar()">
              <app-icono nombre="campana" [tamano]="18" /> Activar notificaciones
            </button>
          }
        }
      </div>

      <div class="etiqueta">Cuenta</div>
      <button class="boton contorno ancho" (click)="salirDelEspacio()" [disabled]="saliendo()">Salir de este espacio</button>
      <button class="boton peligro ancho salir" (click)="salir()"><app-icono nombre="salir" [tamano]="18" /> Cerrar sesión</button>
    </section>
  `,
  styles: `
    .bloque { display: flex; flex-direction: column; gap: 12px; padding: 14px; }
    .fila { display: flex; align-items: center; gap: 8px; }
    .colores { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .color { display: flex; align-items: center; gap: 10px; min-height: 44px; padding: 0 12px; border: 1px solid var(--borde); border-radius: var(--radio); background: var(--bg); }
    .color:disabled { opacity: 0.4; cursor: not-allowed; }
    .color .punto { width: 12px; height: 12px; }
    .color.sel[data-c='rosa'] { border-color: var(--rosa); background: color-mix(in srgb, var(--rosa) 12%, var(--bg)); }
    .color.sel[data-c='amarillo'] { border-color: var(--amarillo); background: color-mix(in srgb, var(--amarillo) 16%, var(--bg)); }
    .horas { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
    .hora { min-height: 34px; padding: 0 12px; border: 1px solid var(--borde); border-radius: 17px; background: var(--bg); font-size: 14px; }
    .hora.sel { background: var(--acento); border-color: var(--acento); color: var(--acento-tinta); font-weight: 600; }
    .salir { margin-top: 8px; }
    .integrantes { display: flex; flex-direction: column; gap: 4px; padding: 6px 14px 14px; }
    .persona { display: flex; align-items: center; gap: 12px; min-height: 52px; }
    .nombre { font-weight: 500; }
    .nombre small { margin-left: 4px; color: var(--texto-3); font-weight: 400; }
    .avatar { display: grid; place-items: center; flex: none; width: 34px; height: 34px; border-radius: 50%; font-weight: 700; }
    .avatar[data-c='rosa'] { background: var(--rosa); color: #fff; }
    .avatar[data-c='amarillo'] { background: var(--amarillo); color: #3a2e00; }
    .vacio-av { border: 1.5px dashed var(--texto-3); color: var(--texto-3); }
    .espera .nombre { color: var(--texto-2); font-weight: 400; }
    .ancho + .ancho { margin-top: 8px; }
  `,
})
export class AjustesPage {
  protected readonly datos = inject(DatosService);
  protected readonly push = inject(PushService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly ui = inject(UiService);

  protected readonly colores: ColorTema[] = ['rosa', 'amarillo'];
  protected readonly nombres = { rosa: COLORES.rosa.nombre, amarillo: COLORES.amarillo.nombre };
  protected readonly horasPosibles = [8, 10, 12, 14, 16, 18, 19, 20, 21];
  protected readonly legible = horaLegible;

  protected readonly nombre = signal(this.datos.perfil()?.nombre ?? '');
  protected readonly saliendo = signal(false);

  protected inicial(nombre: string): string {
    return (nombre.trim()[0] ?? '?').toUpperCase();
  }

  protected async salirDelEspacio(): Promise<void> {
    const solo = !this.datos.companero();
    const aviso = solo
      ? 'Vas a salir de tu espacio. Como estás solo, las actividades de esta cola se quedan sin dueño y las pierdes. Después podrás crear otro espacio o unirte al de tu pareja con su enlace.'
      : 'Vas a salir de este espacio y dejarás de ver la cola. Tu pareja se queda con ella. Después podrás crear otro espacio o unirte a uno con un enlace de invitación.';
    if (!confirm(`${aviso}\n\n¿Salir del espacio?`)) return;
    this.saliendo.set(true);
    try {
      await this.datos.salirDelEspacio();
      try {
        localStorage.removeItem(CLAVE_CODIGO);
      } catch {
        /* no importa */
      }
      await this.router.navigateByUrl('/bienvenida');
    } catch (e) {
      this.ui.error(e, 'No se pudo salir del espacio.');
    } finally {
      this.saliendo.set(false);
    }
  }

  protected horasActuales(): number[] {
    return this.datos.espacio()?.horasRecordatorio ?? [];
  }

  protected async guardarNombre(): Promise<void> {
    const n = this.nombre().trim();
    if (!n || n === this.datos.perfil()?.nombre) return;
    try {
      await this.datos.cambiarPerfil({ nombre: n });
    } catch (e) {
      this.ui.error(e);
    }
  }

  protected async cambiarColor(c: ColorTema): Promise<void> {
    try {
      await this.datos.cambiarPerfil({ color: c });
    } catch (e) {
      this.ui.error(e);
    }
  }

  protected async alternarHora(h: number): Promise<void> {
    const actuales = this.horasActuales();
    const nuevas = actuales.includes(h) ? actuales.filter((x) => x !== h) : [...actuales, h];
    try {
      await this.datos.cambiarHoras(nuevas);
    } catch (e) {
      this.ui.error(e);
    }
  }

  protected async invitar(): Promise<void> {
    const id = this.datos.espacio()?.id;
    if (!id) return;
    const url = `${location.origin}/unirse/${id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Sofi y Juan', text: 'Únete a nuestra cola', url });
      } else {
        await navigator.clipboard.writeText(url);
        this.ui.mostrar('Enlace copiado', 'Pégalo en un chat para tu pareja.');
      }
    } catch (e) {
      if ((e as Error).name !== 'AbortError') this.ui.error(e);
    }
  }

  protected async salir(): Promise<void> {
    await this.auth.salir();
    await this.router.navigateByUrl('/entrar');
  }
}
