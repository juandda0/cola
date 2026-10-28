import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DatosService } from '../core/datos.service';
import { Actividad } from '../core/modelos';
import { UiService } from '../core/ui.service';
import { hace } from '../core/utilidades';
import { Icono } from '../ui/icono';

@Component({
  selector: 'app-cola',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, RouterLink, Icono],
  template: `
    <section class="pagina">
      <h1 class="titulo">Sofi y Juan</h1>
      <a class="integrantes" routerLink="/ajustes">
        @if (datos.perfil(); as yo) {
          <span class="punto" [class]="yo.color"></span>{{ yo.nombre }}
        }
        @if (datos.companero(); as c) {
          <span class="punto" [class]="c.color"></span>{{ c.nombre }}
        } @else {
          <span class="falta">Falta que se una tu pareja · Invitar</span>
        }
      </a>

      <div class="etiqueta">Ahora</div>
      @if (datos.actual(); as a) {
        <article class="tarjeta actual">
          <p class="que">{{ a.titulo }}</p>
          <p class="meta">
            @if (datos.quien(a.creadaPor); as q) {
              <span class="punto" [class]="q.color"></span>{{ q.nombre }} ·
            }
            {{ hace(a.creadaEn) }}
          </p>
          <div class="acciones">
            <button class="boton" (click)="completar(a)">
              <app-icono nombre="check" [tamano]="18" /> Ya la hicimos
            </button>
            <button class="boton suave icono" aria-label="Opciones" (click)="abrirOpciones(a)">
              <app-icono nombre="opciones" />
            </button>
          </div>
        </article>
      } @else if (datos.colaCargada()) {
        <div class="tarjeta vacio">
          <strong>Nada pendiente</strong>
          <span>Agreguen lo primero que quieran hacer juntos.</span>
        </div>
      } @else {
        <div class="tarjeta vacio"><span>Cargando…</span></div>
      }

      @if (datos.siguientes().length) {
        <div class="etiqueta">Después <span class="contador">{{ datos.siguientes().length }}</span></div>
        <ol class="lista">
          @for (s of datos.siguientes(); track s.id; let i = $index) {
            <li>
              <span class="num">{{ i + 2 }}</span>
              <span class="texto">{{ s.titulo }}</span>
              @if (datos.quien(s.creadaPor); as q) {
                <span class="punto" [class]="q.color" [attr.title]="q.nombre"></span>
              }
              <button class="mini" aria-label="Opciones" (click)="abrirOpciones(s)"><app-icono nombre="opciones" [tamano]="18" /></button>
            </li>
          }
        </ol>
        <p class="nota"><app-icono nombre="candado" [tamano]="13" /> Se hacen en orden: no se salta a la siguiente hasta terminar la actual.</p>
      }
    </section>

    <form class="redactor" (ngSubmit)="agregar()">
      <input class="campo" name="texto" [(ngModel)]="texto" maxlength="140" autocomplete="off"
        placeholder="Agregar al final de la cola…" aria-label="Nueva actividad" enterkeyhint="send" />
      <button class="boton enviar" type="submit" aria-label="Agregar" [disabled]="!texto().trim()">
        <app-icono nombre="enviar" [tamano]="20" />
      </button>
    </form>

    @if (hoja(); as h) {
      <div class="velo" (click)="cerrar()"></div>
      <div class="hoja" role="dialog" aria-label="Opciones de la actividad">
        <input class="campo" [(ngModel)]="edicion" maxlength="140" aria-label="Texto de la actividad" />
        <button class="boton ancho" [disabled]="!edicion().trim() || edicion().trim() === h.titulo" (click)="guardarEdicion(h)">Guardar cambio</button>
        <button class="boton peligro ancho" (click)="eliminar(h)">
          {{ h.id === datos.actual()?.id ? 'Quitar de la cola (saltársela)' : 'Quitar de la cola' }}
        </button>
        <button class="boton suave ancho" (click)="cerrar()">Cerrar</button>
      </div>
    }
  `,
  styles: `
    :host { display: block; }
    .integrantes { display: flex; align-items: center; gap: 6px; margin-top: 4px; color: var(--texto-2); font-size: 14px; text-decoration: none; }
    .integrantes .punto + .punto, .integrantes .punto:not(:first-child) { margin-left: 8px; }
    .falta { margin-left: 8px; color: var(--acento-texto); font-weight: 500; }
    .actual { padding: 18px 16px 16px; background: var(--acento-suave); border-color: transparent; transition: opacity 0.3s, transform 0.3s; animation: aparecer 0.25s ease-out; }
    .que { font-size: 22px; font-weight: 600; line-height: 1.3; letter-spacing: -0.01em; overflow-wrap: anywhere; }
    .meta { display: flex; align-items: center; gap: 6px; margin-top: 6px; color: var(--texto-2); font-size: 13px; }
    .acciones { display: flex; gap: 8px; margin-top: 18px; }
    .acciones .boton:first-child { flex: 1; }
    .icono { width: 44px; padding: 0; }
    .lista { list-style: none; margin: 0; padding: 0; }
    li { display: flex; align-items: center; gap: 10px; min-height: 48px; padding: 6px 4px; border-bottom: 1px solid var(--borde); color: var(--texto-2); }
    .num { width: 20px; text-align: center; color: var(--texto-3); font-size: 13px; font-variant-numeric: tabular-nums; }
    .texto { flex: 1; overflow-wrap: anywhere; color: var(--texto); }
    .mini { display: grid; place-items: center; width: 36px; height: 36px; border: 0; border-radius: 6px; background: none; color: var(--texto-3); }
    .mini:hover { background: var(--bg-hover); }
    .nota { display: flex; align-items: center; gap: 6px; margin-top: 12px; color: var(--texto-3); font-size: 12px; }
    .redactor {
      position: fixed; z-index: 9; left: 0; right: 0; bottom: calc(60px + env(safe-area-inset-bottom));
      display: flex; gap: 8px; max-width: 640px; margin: 0 auto; padding: 10px 16px;
      background: linear-gradient(to top, var(--bg) 70%, transparent);
    }
    .enviar { width: 44px; padding: 0; flex: none; }
    .velo { position: fixed; inset: 0; z-index: 20; background: rgb(0 0 0 / 0.35); }
    .hoja {
      position: fixed; z-index: 21; left: 0; right: 0; bottom: 0; display: flex; flex-direction: column; gap: 8px;
      max-width: 640px; margin: 0 auto; padding: 16px 16px calc(16px + env(safe-area-inset-bottom));
      background: var(--bg); border-radius: 16px 16px 0 0; box-shadow: var(--sombra); animation: subir 0.2s ease-out;
    }
    @keyframes aparecer { from { opacity: 0; transform: translateY(6px); } }
    @keyframes subir { from { transform: translateY(40px); opacity: 0; } }
  `,
})
export class ColaPage {
  protected readonly datos = inject(DatosService);
  private readonly ui = inject(UiService);
  protected readonly hace = hace;

  protected readonly texto = signal('');
  protected readonly hoja = signal<Actividad | null>(null);
  protected readonly edicion = signal('');

  /**
   * Firestore aplica el cambio en local al instante y lo sincroniza cuando hay red,
   * así que no se espera la respuesta del servidor: la pantalla nunca se queda bloqueada.
   */
  protected agregar(): void {
    const titulo = this.texto().trim();
    if (!titulo) return;
    this.texto.set('');
    this.datos.agregar(titulo).catch((e) => {
      this.texto.update((t) => t || titulo);
      this.ui.error(e, 'No se pudo agregar.');
    });
  }

  protected completar(a: Actividad): void {
    const sig = this.datos.siguientes()[0];
    this.datos.completar(a).catch((e) => this.ui.error(e, 'No se pudo marcar como hecha.'));
    this.ui.mostrar('¡Hecha! 🎉', sig ? `Sigue: ${sig.titulo}` : 'La cola quedó vacía.');
  }

  protected abrirOpciones(a: Actividad): void {
    this.edicion.set(a.titulo);
    this.hoja.set(a);
  }

  protected cerrar(): void {
    this.hoja.set(null);
  }

  protected async guardarEdicion(a: Actividad): Promise<void> {
    try {
      await this.datos.editar(a, this.edicion());
      this.cerrar();
    } catch (e) {
      this.ui.error(e);
    }
  }

  protected async eliminar(a: Actividad): Promise<void> {
    if (!confirm(`¿Quitar «${a.titulo}» de la cola?`)) return;
    try {
      await this.datos.eliminar(a);
      this.cerrar();
    } catch (e) {
      this.ui.error(e);
    }
  }
}
