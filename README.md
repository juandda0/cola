# Sofi y Juan (la cola)

Una cola de actividades para dos: **la primera que se agrega es la que toca hacer**, y no se
pasa a la siguiente hasta marcarla como hecha. Primero móvil (PWA), estilo minimalista tipo Notion.
Color de acento: **rosado** para Sofi, **amarillo** para Juan (cada quien ve la app en su color).

- **Front:** Angular 22 (standalone + signals), sin librerías de UI.
- **Backend:** Firebase — Auth (Google), Firestore, Hosting, Cloud Functions, Cloud Messaging.
- **Proyecto Firebase:** `cola-juan-sofi` → https://cola-juan-sofi.web.app

## Cómo funciona

| Pieza | Dónde |
|---|---|
| Sesión, perfil, cola en tiempo real | `src/app/core/` (`auth`, `datos`, `push`) |
| Pantallas: Cola, Hechas, Ajustes, Bienvenida | `src/app/paginas/` |
| Avisos push (service worker) | `public/firebase-messaging-sw.js` |
| Reglas e índices | `firestore.rules`, `firestore.indexes.json` |
| Avisos al agregar/completar + recordatorios | `functions/src/index.ts` |

Datos: `usuarios/{uid}` (nombre, color, espacio) · `espacios/{código}` (miembros, horas de
recordatorio) · `espacios/{código}/actividades/{id}` (la cola). El **id del espacio es el código
de invitación** (12 caracteres al azar): quien no lo conoce no puede leerlo ni unirse, y el
espacio admite exactamente 2 personas.

Notificaciones: se envían al agregar una actividad, al completarla y como **recordatorio cada
hora configurada** (por defecto 10 a. m. y 7 p. m., hora de Bogotá; se cambian en Ajustes).

## Desarrollo

```bash
npm install
npm start                      # http://localhost:4200
```

Para probar sin tocar datos reales, con emuladores (Java requerido):

```bash
npx firebase-tools emulators:start --only auth,firestore --project cola-juan-sofi
# en la consola del navegador, una vez:  localStorage.setItem('cola.emulador','1'); location.reload()
# atajo de pruebas (solo emulador):       await __entrarDePrueba('juan@prueba.com', 'Juan')
```

## Despliegue

```bash
npm run build
npx firebase-tools deploy --only hosting,firestore   # app + reglas
npx firebase-tools deploy --only functions            # requiere plan Blaze
```

## Pendiente de configurar a mano

1. **Activar Google** en Authentication → Sign-in method (una sola vez, en la consola de Firebase).
2. **Plan Blaze** del proyecto, para desplegar las Cloud Functions (avisos y recordatorios).
3. En iPhone, las notificaciones solo funcionan con la app instalada («Agregar a pantalla de inicio»).
