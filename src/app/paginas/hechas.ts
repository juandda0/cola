import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DatosService } from '../core/datos.service';
import { fechaCorta } from '../core/utilidades';
import { Icono } from '../ui/icono';

@Component({
  selector: 'app-hechas',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icono],
  template: `
    <section class="pagina">
      <h1 class="titulo">Hechas</h1>
      <p class="subtitulo">
        {{ datos.hechas().length ? datos.hechas().length + ' cosas que ya hicieron juntos' : 'Lo que vayan completando aparece aquí' }}
      </p>

      @if (datos.hechas().length) {
        <ul class="lista">
          @for (h of datos.hechas(); track h.id) {
            <li>
              <span class="ok"><app-icono nombre="check" [tamano]="14" /></span>
              <div>
                <p class="texto">{{ h.titulo }}</p>
                <p class="meta">
                  @if (datos.quien(h.completadaPor); as q) {
                    <span class="punto" [class]="q.color"></span>{{ q.nombre }} ·
                  }
                  {{ h.completadaEn ? fecha(h.completadaEn) : '' }}
                </p>
              </div>
            </li>
          }
        </ul>
      } @else {
        <div class="vacio"><strong>Aún no hay nada</strong><span>La primera de la cola es la que toca.</span></div>
      }
    </section>
  `,
  styles: `
    .lista { list-style: none; margin: 24px 0 0; padding: 0; }
    li { display: flex; gap: 12px; padding: 12px 4px; border-bottom: 1px solid var(--borde); }
    .ok { display: grid; place-items: center; flex: none; width: 22px; height: 22px; margin-top: 1px; border-radius: 50%; background: var(--acento); color: var(--acento-tinta); }
    .texto { overflow-wrap: anywhere; color: var(--texto-2); text-decoration: line-through; text-decoration-color: var(--texto-3); }
    .meta { display: flex; align-items: center; gap: 6px; margin-top: 2px; color: var(--texto-3); font-size: 12px; }
  `,
})
export class HechasPage {
  protected readonly datos = inject(DatosService);
  protected readonly fecha = fechaCorta;
}
