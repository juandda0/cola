import { Injectable, inject, signal } from '@angular/core';
import { deleteDoc, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { AuthService } from './auth.service';
import { app, db } from './firebase';
import { UiService } from './ui.service';

export type EstadoPush = 'cargando' | 'no-soportado' | 'bloqueado' | 'apagado' | 'activo';

const SW = '/firebase-messaging-sw.js';

@Injectable({ providedIn: 'root' })
export class PushService {
  private readonly auth = inject(AuthService);
  private readonly ui = inject(UiService);

  readonly estado = signal<EstadoPush>('cargando');
  private escuchando = false;

  /** iPhone/iPad solo permiten notificaciones si la app está instalada en la pantalla de inicio. */
  readonly necesitaInstalar =
    /iPad|iPhone|iPod/.test(navigator.userAgent) &&
    !window.matchMedia('(display-mode: standalone)').matches;

  /** Revisa el estado y, si ya hay permiso, mantiene el token del dispositivo al día. */
  async iniciar(): Promise<void> {
    this.escucharAvisosEnPantalla();
    if (!(await this.soportado())) {
      this.estado.set('no-soportado');
      return;
    }
    if (Notification.permission === 'denied') {
      this.estado.set('bloqueado');
      return;
    }
    if (Notification.permission === 'granted') {
      try {
        await this.registrarToken();
        this.estado.set('activo');
      } catch (e) {
        console.error(e);
        this.estado.set('apagado');
      }
      return;
    }
    this.estado.set('apagado');
  }

  async activar(): Promise<void> {
    if (!(await this.soportado())) {
      this.estado.set('no-soportado');
      return;
    }
    const permiso = await Notification.requestPermission();
    if (permiso !== 'granted') {
      this.estado.set(permiso === 'denied' ? 'bloqueado' : 'apagado');
      return;
    }
    try {
      await this.registrarToken();
      this.estado.set('activo');
      this.ui.mostrar('Notificaciones activadas');
    } catch (e) {
      this.ui.error(e, 'No se pudieron activar las notificaciones.');
    }
  }

  async desactivar(): Promise<void> {
    try {
      const { deleteToken, getMessaging, getToken } = await this.mensajeria();
      const mensajes = getMessaging(app);
      const reg = await navigator.serviceWorker.getRegistration(SW);
      if (reg) {
        const token = await getToken(mensajes, { serviceWorkerRegistration: reg });
        await deleteDoc(doc(db, 'usuarios', this.uid, 'tokens', token));
      }
      await deleteToken(mensajes);
    } catch (e) {
      console.error(e);
    }
    this.estado.set('apagado');
  }

  private get uid(): string {
    const u = this.auth.usuario();
    if (!u) throw new Error('Sin sesión');
    return u.uid;
  }

  /** El SDK de mensajería se carga solo cuando hace falta (pesa bastante). */
  private mensajeria() {
    return import('firebase/messaging');
  }

  private async soportado(): Promise<boolean> {
    if (!('serviceWorker' in navigator) || !('Notification' in window)) return false;
    return (await this.mensajeria()).isSupported();
  }

  private async registrarToken(): Promise<void> {
    const reg = await navigator.serviceWorker.register(SW);
    await navigator.serviceWorker.ready;
    const { getMessaging, getToken } = await this.mensajeria();
    const token = await getToken(getMessaging(app), { serviceWorkerRegistration: reg });
    if (!token) throw new Error('Sin token');
    await setDoc(
      doc(db, 'usuarios', this.uid, 'tokens', token),
      { actualizadoEn: serverTimestamp(), plataforma: navigator.userAgent.slice(0, 120) },
      { merge: true },
    );
  }

  /** Con la app abierta el service worker nos pasa el aviso y lo mostramos adentro. */
  private escucharAvisosEnPantalla(): void {
    if (this.escuchando || !('serviceWorker' in navigator)) return;
    this.escuchando = true;
    navigator.serviceWorker.addEventListener('message', (e: MessageEvent) => {
      if (e.data?.tipo === 'push') this.ui.mostrar(e.data.titulo, e.data.cuerpo);
    });
  }
}
