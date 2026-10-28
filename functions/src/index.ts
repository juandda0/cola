import { initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';

initializeApp();
const db = getFirestore();

const REGION = 'us-central1';
const ZONA = 'America/Bogota';
const DIA_MS = 24 * 60 * 60 * 1000;

interface Aviso {
  titulo: string;
  cuerpo: string;
}

/** Envía un aviso push a todos los dispositivos de las personas indicadas. */
async function avisar(uids: string[], aviso: Aviso): Promise<void> {
  for (const uid of uids) {
    const tokensSnap = await db.collection(`usuarios/${uid}/tokens`).get();
    const tokens = tokensSnap.docs.map((d) => d.id);
    if (!tokens.length) continue;

    const res = await getMessaging().sendEachForMulticast({
      tokens,
      data: { titulo: aviso.titulo, cuerpo: aviso.cuerpo, url: '/' },
      webpush: { headers: { Urgency: 'high', TTL: '86400' } },
    });

    // Limpia dispositivos que ya no existen.
    const borrar: Promise<unknown>[] = [];
    res.responses.forEach((r, i) => {
      const code = r.error?.code;
      if (
        code === 'messaging/registration-token-not-registered' ||
        code === 'messaging/invalid-registration-token'
      ) {
        borrar.push(tokensSnap.docs[i].ref.delete());
      }
    });
    await Promise.all(borrar);
  }
}

async function nombreDe(uid: string): Promise<string> {
  const snap = await db.doc(`usuarios/${uid}`).get();
  return (snap.get('nombre') as string | undefined) ?? 'Tu pareja';
}

async function miembrosDe(espacioId: string): Promise<string[]> {
  const snap = await db.doc(`espacios/${espacioId}`).get();
  return (snap.get('miembros') as string[] | undefined) ?? [];
}

function primeraPendiente(espacioId: string) {
  return db
    .collection(`espacios/${espacioId}/actividades`)
    .where('estado', '==', 'pendiente')
    .orderBy('creadaEn', 'asc')
    .limit(1)
    .get();
}

/** Alguien agregó una actividad: avisa a la otra persona. */
export const alAgregarActividad = onDocumentCreated(
  { document: 'espacios/{espacioId}/actividades/{actividadId}', region: REGION },
  async (event) => {
    const data = event.data?.data();
    if (!data) return;
    const { espacioId } = event.params;
    const autor = data['creadaPor'] as string;

    const otros = (await miembrosDe(espacioId)).filter((u) => u !== autor);
    if (!otros.length) return;

    const nombre = await nombreDe(autor);
    const pendientes = await db
      .collection(`espacios/${espacioId}/actividades`)
      .where('estado', '==', 'pendiente')
      .count()
      .get();
    const enCola = pendientes.data().count;

    await avisar(otros, {
      titulo: `${nombre} agregó a la cola`,
      cuerpo:
        enCola <= 1
          ? `Ahora toca: ${data['titulo']}`
          : `${data['titulo']} · ${enCola} en la cola`,
    });
  },
);

/** Alguien completó la actividad: avisa a la otra persona y dice cuál sigue. */
export const alCompletarActividad = onDocumentUpdated(
  { document: 'espacios/{espacioId}/actividades/{actividadId}', region: REGION },
  async (event) => {
    const antes = event.data?.before.data();
    const despues = event.data?.after.data();
    if (!antes || !despues) return;
    if (antes['estado'] !== 'pendiente' || despues['estado'] !== 'completada') return;

    const { espacioId } = event.params;
    const quien = (despues['completadaPor'] as string | undefined) ?? '';
    const otros = (await miembrosDe(espacioId)).filter((u) => u !== quien);
    if (!otros.length) return;

    const nombre = quien ? await nombreDe(quien) : 'Tu pareja';
    const siguiente = await primeraPendiente(espacioId);
    const cuerpo = siguiente.empty
      ? 'La cola quedó vacía. ¡Agreguen algo nuevo!'
      : `Sigue: ${siguiente.docs[0].get('titulo')}`;

    await avisar(otros, { titulo: `${nombre} completó «${despues['titulo']}» 🎉`, cuerpo });
  },
);

/**
 * Cada hora revisa los espacios; si la hora actual (Bogotá) está en sus
 * horas de recordatorio y hay una actividad pendiente, avisa a los dos.
 */
export const recordatorios = onSchedule(
  { schedule: '0 * * * *', timeZone: ZONA, region: REGION },
  async () => {
    const horaActual = Number(
      new Intl.DateTimeFormat('en-US', { hour: 'numeric', hour12: false, timeZone: ZONA }).format(
        new Date(),
      ),
    ) % 24;

    const espacios = await db.collection('espacios').get();
    for (const espacio of espacios.docs) {
      const horas = (espacio.get('horasRecordatorio') as number[] | undefined) ?? [];
      if (!horas.includes(horaActual)) continue;

      const miembros = (espacio.get('miembros') as string[] | undefined) ?? [];
      const actual = await primeraPendiente(espacio.id);
      if (actual.empty || !miembros.length) continue;

      const creadaEn = (actual.docs[0].get('creadaEn') as Timestamp).toMillis();
      const dias = Math.floor((Date.now() - creadaEn) / DIA_MS);
      const cuerpo =
        dias <= 0
          ? 'La agregaron hoy. ¿La hacemos?'
          : dias === 1
            ? 'Lleva 1 día esperando.'
            : `Lleva ${dias} días esperando.`;

      await avisar(miembros, { titulo: `Pendiente: ${actual.docs[0].get('titulo')}`, cuerpo });
      await espacio.ref.update({ ultimoRecordatorio: FieldValue.serverTimestamp() });
    }
  },
);

/** Alguien se unió al espacio o salió de él: avisa a quien se queda. */
export const alCambiarMiembros = onDocumentUpdated(
  { document: 'espacios/{espacioId}', region: REGION },
  async (event) => {
    const antes = (event.data?.before.get('miembros') as string[] | undefined) ?? [];
    const despues = (event.data?.after.get('miembros') as string[] | undefined) ?? [];

    for (const uid of despues.filter((u) => !antes.includes(u))) {
      await avisar(
        despues.filter((u) => u !== uid),
        { titulo: `${await nombreDe(uid)} se unió 🎉`, cuerpo: 'Ya pueden armar la cola juntos.' },
      );
    }
    for (const uid of antes.filter((u) => !despues.includes(u))) {
      await avisar(despues, {
        titulo: `${await nombreDe(uid)} salió del espacio`,
        cuerpo: 'Ya no verá la cola.',
      });
    }
  },
);
