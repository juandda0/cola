import { Injectable, Injector, computed, effect, inject, signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { filter, firstValueFrom } from 'rxjs';
import {
  DocumentData,
  QueryDocumentSnapshot,
  addDoc,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  arrayRemove,
} from 'firebase/firestore';
import { AuthService } from './auth.service';
import { db } from './firebase';
import { Actividad, ColorTema, Espacio, Perfil } from './modelos';
import { UiService } from './ui.service';
import { codigoAleatorio } from './utilidades';

const HORAS_POR_DEFECTO = [10, 19];

function aPerfil(uid: string, d: DocumentData): Perfil {
  return {
    uid,
    nombre: d['nombre'] ?? '',
    color: d['color'] === 'rosa' ? 'rosa' : 'amarillo',
    espacioId: d['espacioId'] ?? null,
  };
}

function aActividad(snap: QueryDocumentSnapshot): Actividad {
  const d = snap.data({ serverTimestamps: 'estimate' });
  return {
    id: snap.id,
    titulo: d['titulo'],
    creadaPor: d['creadaPor'],
    creadaEn: d['creadaEn']?.toDate() ?? new Date(),
    estado: d['estado'],
    completadaPor: d['completadaPor'],
    completadaEn: d['completadaEn']?.toDate(),
  };
}

/**
 * Estado compartido de la app: perfil, pareja, espacio y la cola.
 * Todo llega en tiempo real desde Firestore.
 */
@Injectable({ providedIn: 'root' })
export class DatosService {
  private readonly auth = inject(AuthService);
  private readonly injector = inject(Injector);
  private readonly ui = inject(UiService);
  private miembrosPrevios: number | undefined;
  private saliendo = false;

  /** undefined = cargando · null = la persona aún no tiene perfil */
  readonly perfil = signal<Perfil | null | undefined>(undefined);
  readonly companero = signal<Perfil | null>(null);
  readonly espacio = signal<Espacio | null>(null);
  readonly pendientes = signal<Actividad[]>([]);
  readonly hechas = signal<Actividad[]>([]);
  readonly colaCargada = signal(false);

  private readonly espacioId = computed(() => this.perfil()?.espacioId ?? null);
  private readonly otroUid = computed(() => {
    const yo = this.perfil()?.uid;
    return this.espacio()?.miembros.find((m) => m !== yo) ?? null;
  });

  /** La actividad que toca hacer ahora: la primera que se agregó. */
  readonly actual = computed(() => this.pendientes()[0] ?? null);
  readonly siguientes = computed(() => this.pendientes().slice(1));

  constructor() {
    // Perfil de la persona con sesión.
    effect((limpiar) => {
      const u = this.auth.usuario();
      if (!u) {
        this.perfil.set(undefined);
        return;
      }
      limpiar(
        onSnapshot(
          doc(db, 'usuarios', u.uid),
          (s) => this.perfil.set(s.exists() ? aPerfil(u.uid, s.data()) : null),
          () => this.perfil.set(null),
        ),
      );
    });

    // Espacio compartido y su cola.
    effect((limpiar) => {
      const id = this.espacioId();
      this.colaCargada.set(false);
      this.miembrosPrevios = undefined;
      if (!id) {
        this.espacio.set(null);
        this.pendientes.set([]);
        this.hechas.set([]);
        return;
      }
      const actividades = collection(db, 'espacios', id, 'actividades');
      const bajas = [
        onSnapshot(
          doc(db, 'espacios', id),
          (s) => {
            const miembros: string[] = s.get('miembros') ?? [];
            this.avisarCambioDeMiembros(miembros.length);
            this.espacio.set(
              s.exists()
                ? { id, miembros, horasRecordatorio: s.get('horasRecordatorio') ?? HORAS_POR_DEFECTO }
                : null,
            );
          },
          () => undefined, // al salir del espacio ya no hay permiso para leerlo
        ),
        onSnapshot(query(actividades, where('estado', '==', 'pendiente'), orderBy('creadaEn', 'asc')), (s) => {
          this.pendientes.set(s.docs.map(aActividad));
          this.colaCargada.set(true);
        }, () => undefined),
        onSnapshot(
          query(actividades, where('estado', '==', 'completada'), orderBy('completadaEn', 'desc'), limit(60)),
          (s) => this.hechas.set(s.docs.map(aActividad)),
          () => undefined,
        ),
      ];
      limpiar(() => bajas.forEach((baja) => baja()));
    });

    // Perfil de la pareja.
    effect((limpiar) => {
      const otro = this.otroUid();
      if (!otro) {
        this.companero.set(null);
        return;
      }
      limpiar(
        onSnapshot(
          doc(db, 'usuarios', otro),
          (s) => this.companero.set(s.exists() ? aPerfil(otro, s.data()) : null),
          () => this.companero.set(null),
        ),
      );
    });

    // Cada persona tiene su color: si la que se unió después eligió el mismo, cambia al otro.
    effect(() => {
      const yo = this.perfil();
      const otro = this.companero();
      const esp = this.espacio();
      if (yo && otro && esp && esp.miembros[1] === yo.uid && yo.color === otro.color) {
        void this.cambiarPerfil({ color: otro.color === 'rosa' ? 'amarillo' : 'rosa' });
      }
    });
  }

  /** Avisa en pantalla cuando alguien se une al espacio o sale de él (mientras la app está abierta). */
  private avisarCambioDeMiembros(ahora: number): void {
    const antes = this.miembrosPrevios;
    this.miembrosPrevios = ahora;
    if (antes === undefined || this.saliendo) return;
    if (ahora > antes) this.ui.mostrar('Tu pareja se unió 🎉', 'Ya pueden armar la cola juntos.');
    else if (ahora < antes) this.ui.mostrar('Tu pareja salió del espacio');
  }

  /** Espera a que se sepa si la persona ya tiene perfil. */
  async esperarPerfil(): Promise<Perfil | null> {
    const p = await firstValueFrom(
      toObservable(this.perfil, { injector: this.injector }).pipe(filter((x) => x !== undefined)),
    );
    return p ?? null;
  }

  /** Datos para mostrar a quien hizo algo. */
  quien(uid: string | undefined): { nombre: string; color: ColorTema } | null {
    if (!uid) return null;
    const yo = this.perfil();
    if (yo?.uid === uid) return { nombre: yo.nombre, color: yo.color };
    const otro = this.companero();
    if (otro?.uid === uid) return { nombre: otro.nombre, color: otro.color };
    return null;
  }

  private get uid(): string {
    const u = this.auth.usuario();
    if (!u) throw new Error('Sin sesión');
    return u.uid;
  }

  private get espacioActual(): string {
    const id = this.espacioId();
    if (!id) throw new Error('Sin espacio');
    return id;
  }

  // ── Perfil y espacio ────────────────────────────────────────────────

  guardarPerfil(nombre: string, color: ColorTema): Promise<void> {
    return setDoc(doc(db, 'usuarios', this.uid), { nombre: nombre.trim(), color }, { merge: true });
  }

  cambiarPerfil(cambios: { nombre?: string; color?: ColorTema }): Promise<void> {
    return setDoc(doc(db, 'usuarios', this.uid), cambios, { merge: true });
  }

  async crearEspacio(): Promise<string> {
    const id = codigoAleatorio();
    await setDoc(doc(db, 'espacios', id), {
      miembros: [this.uid],
      horasRecordatorio: HORAS_POR_DEFECTO,
      creadoEn: serverTimestamp(),
    });
    await setDoc(doc(db, 'usuarios', this.uid), { espacioId: id }, { merge: true });
    return id;
  }

  async unirse(codigo: string): Promise<void> {
    const id = codigo.trim().toLowerCase();
    await updateDoc(doc(db, 'espacios', id), { miembros: arrayUnion(this.uid) });
    await setDoc(doc(db, 'usuarios', this.uid), { espacioId: id }, { merge: true });
  }

  /**
   * Sale del espacio: se quita de los miembros y queda sin espacio, para poder crear uno
   * nuevo o unirse a otro con un código. Las dos escrituras van juntas (atómicas).
   */
  async salirDelEspacio(): Promise<void> {
    const id = this.espacioActual;
    const lote = writeBatch(db);
    lote.update(doc(db, 'espacios', id), { miembros: arrayRemove(this.uid) });
    lote.set(doc(db, 'usuarios', this.uid), { espacioId: null }, { merge: true });
    this.saliendo = true;
    try {
      await lote.commit();
    } finally {
      this.saliendo = false;
    }
  }

  cambiarHoras(horas: number[]): Promise<void> {
    return updateDoc(doc(db, 'espacios', this.espacioActual), {
      horasRecordatorio: [...horas].sort((a, b) => a - b),
    });
  }

  // ── La cola ─────────────────────────────────────────────────────────

  agregar(titulo: string): Promise<unknown> {
    return addDoc(collection(db, 'espacios', this.espacioActual, 'actividades'), {
      titulo: titulo.trim(),
      creadaPor: this.uid,
      creadaEn: serverTimestamp(),
      estado: 'pendiente',
    });
  }

  /** Solo se puede completar la actividad actual: nunca saltarse la cola. */
  completar(actividad: Actividad): Promise<void> {
    if (this.actual()?.id !== actividad.id) return Promise.reject(new Error('Esa actividad aún no es su turno'));
    return updateDoc(doc(db, 'espacios', this.espacioActual, 'actividades', actividad.id), {
      estado: 'completada',
      completadaPor: this.uid,
      completadaEn: serverTimestamp(),
    });
  }

  editar(actividad: Actividad, titulo: string): Promise<void> {
    return updateDoc(doc(db, 'espacios', this.espacioActual, 'actividades', actividad.id), {
      titulo: titulo.trim(),
    });
  }

  eliminar(actividad: Actividad): Promise<void> {
    return deleteDoc(doc(db, 'espacios', this.espacioActual, 'actividades', actividad.id));
  }
}
