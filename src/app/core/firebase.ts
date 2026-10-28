import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import {
  connectFirestoreEmulator,
  initializeFirestore,
  memoryLocalCache,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';
import { isDevMode } from '@angular/core';

// Estos valores son públicos por diseño (identifican el proyecto, no lo protegen).
// La seguridad la dan las reglas de Firestore (firestore.rules).
const base = {
  projectId: 'cola-juan-sofi',
  appId: '1:417262850556:web:4cd83fc32aec227f63e279',
  storageBucket: 'cola-juan-sofi.firebasestorage.app',
  apiKey: 'AIzaSyANpg-Q1o_jbBAPXR94fingHK5InR1GHfI',
  authDomain: 'cola-juan-sofi.firebaseapp.com',
  messagingSenderId: '417262850556',
};

// El inicio de sesión con Google solo tiene registrado el dominio *.firebaseapp.com como
// URI de redirección: no usar otro (p. ej. *.web.app) o Google responde redirect_uri_mismatch.
const host = typeof location !== 'undefined' ? location.hostname : '';

export const app = initializeApp(base);
// Solo en desarrollo: con `localStorage['cola.emulador']='1'` usa los emuladores locales.
const usaEmulador = isDevMode() && host === 'localhost' && localStorage.getItem('cola.emulador') === '1';

export const auth = getAuth(app);
export const db = initializeFirestore(app, {
  localCache: usaEmulador
    ? memoryLocalCache()
    : persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
});

if (usaEmulador) {
  connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, 'localhost', 8080);
  // Atajo de pruebas: crea una cuenta falsa en el emulador (nunca existe fuera de desarrollo).
  (window as unknown as Record<string, unknown>)['__entrarDePrueba'] = async (correo: string, nombre: string) => {
    const { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } = await import('firebase/auth');
    try {
      await signInWithEmailAndPassword(auth, correo, 'prueba123');
    } catch {
      const c = await createUserWithEmailAndPassword(auth, correo, 'prueba123');
      await updateProfile(c.user, { displayName: nombre });
    }
  };
}
