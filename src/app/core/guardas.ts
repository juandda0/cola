import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { DatosService } from './datos.service';

// Ojo: `inject()` solo funciona antes del primer `await`, por eso se inyecta todo al inicio.

/** Sesión + perfil + espacio de pareja listos; si falta algo, lleva al paso que toca. */
export const requiereEspacio: CanActivateFn = async () => {
  const router = inject(Router);
  const auth = inject(AuthService);
  const datos = inject(DatosService);

  if (!(await auth.esperarSesion())) return router.createUrlTree(['/entrar']);
  const perfil = await datos.esperarPerfil();
  return perfil?.nombre && perfil.espacioId ? true : router.createUrlTree(['/bienvenida']);
};

/** Pantalla de inicio de sesión: si ya hay sesión, sigue adelante. */
export const soloVisitantes: CanActivateFn = async () => {
  const router = inject(Router);
  const auth = inject(AuthService);

  return (await auth.esperarSesion()) ? router.createUrlTree(['/']) : true;
};

/** Bienvenida: solo para quien aún no completó su perfil/espacio. */
export const soloSinEspacio: CanActivateFn = async () => {
  const router = inject(Router);
  const auth = inject(AuthService);
  const datos = inject(DatosService);

  if (!(await auth.esperarSesion())) return router.createUrlTree(['/entrar']);
  const perfil = await datos.esperarPerfil();
  return perfil?.nombre && perfil.espacioId ? router.createUrlTree(['/']) : true;
};
