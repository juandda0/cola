import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

export const CLAVE_CODIGO = 'cola.codigo';

/** Enlace de invitación: guarda el código y sigue el flujo normal (entrar → bienvenida). */
@Component({ selector: 'app-unirse', template: '' })
export class UnirsePage {
  constructor() {
    const codigo = inject(ActivatedRoute).snapshot.paramMap.get('codigo') ?? '';
    try {
      localStorage.setItem(CLAVE_CODIGO, codigo);
    } catch {
      /* sin almacenamiento: el código se puede escribir a mano */
    }
    void inject(Router).navigateByUrl('/', { replaceUrl: true });
  }
}
