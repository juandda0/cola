import { Injectable, signal } from '@angular/core';
import {
  GoogleAuthProvider,
  User,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut,
} from 'firebase/auth';
import { auth } from './firebase';

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly usuario = signal<User | null>(null);
  readonly listo = signal(false);

  private readonly primeraRespuesta = new Promise<void>((resolver) => {
    onAuthStateChanged(auth, (u) => {
      this.usuario.set(u);
      this.listo.set(true);
      resolver(); // solo la primera llamada tiene efecto
    });
  });

  /** Espera a que Firebase sepa si hay una sesión guardada y devuelve la sesión actual. */
  async esperarSesion(): Promise<User | null> {
    await this.primeraRespuesta;
    return this.usuario();
  }

  async entrarConGoogle(): Promise<void> {
    const proveedor = new GoogleAuthProvider();
    proveedor.setCustomParameters({ prompt: 'select_account' });
    try {
      await signInWithPopup(auth, proveedor);
    } catch (e) {
      const codigo = (e as { code?: string }).code;
      if (codigo === 'auth/popup-blocked' || codigo === 'auth/operation-not-supported-in-this-environment') {
        await signInWithRedirect(auth, proveedor);
        return;
      }
      if (codigo === 'auth/popup-closed-by-user' || codigo === 'auth/cancelled-popup-request') return;
      throw e;
    }
  }

  salir(): Promise<void> {
    return signOut(auth);
  }
}
