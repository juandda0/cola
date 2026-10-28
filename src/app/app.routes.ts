import { Routes } from '@angular/router';
import { requiereEspacio, soloSinEspacio, soloVisitantes } from './core/guardas';

export const routes: Routes = [
  {
    path: 'entrar',
    canActivate: [soloVisitantes],
    loadComponent: () => import('./paginas/entrar').then((m) => m.EntrarPage),
  },
  {
    path: 'unirse/:codigo',
    loadComponent: () => import('./paginas/unirse').then((m) => m.UnirsePage),
  },
  {
    path: 'bienvenida',
    canActivate: [soloSinEspacio],
    loadComponent: () => import('./paginas/bienvenida').then((m) => m.BienvenidaPage),
  },
  {
    path: '',
    canActivate: [requiereEspacio],
    loadComponent: () => import('./ui/marco').then((m) => m.MarcoComponent),
    children: [
      { path: '', pathMatch: 'full', loadComponent: () => import('./paginas/cola').then((m) => m.ColaPage) },
      { path: 'hechas', loadComponent: () => import('./paginas/hechas').then((m) => m.HechasPage) },
      { path: 'ajustes', loadComponent: () => import('./paginas/ajustes').then((m) => m.AjustesPage) },
    ],
  },
  { path: '**', redirectTo: '' },
];
