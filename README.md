# GalacticApp · Mobile

App móvil de GalacticApp para **técnicos**: asignaciones, servicio en curso, jornada con control del vehículo y envío de la ubicación. Usa la misma API que la web ([backend](https://github.com/SebaBranda/Proyecto_Final_UNAHUR_C2-Backend)).

## Stack

| | |
|---|---|
| Plataforma | Expo SDK 58, React Native 0.88 y React 19 |
| Navegación | Expo Router (rutas definidas por archivos) |
| HTTP | Axios |
| Lenguaje | JavaScript |

## Estructura

```
src/
  app/                       pantallas (Expo Router: cada archivo es una ruta)
    _layout.js               raíz: proveedor de sesión y rutas protegidas (Stack.Protected)
    login.js                 login (solo técnicos)
    (tecnico)/               pantallas del técnico, en pestañas
      index.js               Mis asignaciones: filtros por estado, lista paginada y detalle
      servicio-en-curso.js   reclamo en progreso y su finalización
      vehiculo.js            datos del vehículo, seguro y último control
      resumen.js             jornada: iniciar o finalizar, desempeño e historial
  components/                piezas de UI y formularios (inicio y cierre de jornada, fotos, detalle)
  context/
    SesionContext.js         usuario, jornada activa y vehículo
    useUbicacionEnJornada.js registra el recorrido mientras la jornada está activa
  services/
    apiClient.js             Axios con la URL de la API y el token
    api.js                   llamadas a la API (los mismos endpoints que la web)
    historialUbicacion.js    cola local del recorrido y su sincronización
    ubicacionSegundoPlano.js tarea que registra el recorrido con el celular bloqueado
  utils/                     compresión de imágenes, formatos de fecha y kilómetros, combustible
  theme/colores.js           colores de marca (los mismos de la web)
```

## Aspectos técnicos

- **Rutas protegidas:** sin sesión solo se ve el login. Al iniciar o cerrar sesión, Expo Router cambia de pantalla solo (`Stack.Protected`).
- **Sesión:**
  - El token se guarda solo en memoria: al cerrar la app hay que volver a ingresar.
  - Hay una única sesión por usuario: si el técnico ingresa desde la web u otro celular, esta sesión se cierra y la app vuelve al login con un aviso.
- **Recorrido:**
  - Mientras la jornada está activa se registra la posición con GPS: una posición cada 30 segundos como máximo, y solo se guarda un punto si el técnico se movió más de 75 metros. Quieto no se guarda nada, y se descartan las posiciones con más de 50 metros de error. Así la línea sigue las calles sin gastar batería de más.
  - También se guarda un punto al iniciar y al finalizar la jornada, y al iniciar un reclamo.
  - **En segundo plano:** al iniciar la jornada, la app explica para qué necesita la ubicación "Permitir todo el tiempo" y la pide. Con ese permiso, un servicio de Android (`expo-location` + `expo-task-manager`) registra el recorrido aunque el celular esté bloqueado o la app cerrada, y muestra una notificación fija mientras tanto. Las posiciones llegan en tandas cada 2 minutos para ahorrar batería. Se detiene al finalizar la jornada, al salir de la sesión o, por seguridad, a las 16 horas.
  - Sin ese permiso, o en Expo Go (que no permite tareas en segundo plano), el recorrido se registra solo con la app abierta, con los mismos criterios, y la pantalla de la jornada lo avisa. Para probar el segundo plano hay que instalar la APK.
  - Cada punto se guarda primero en una cola en `AsyncStorage`, con su jornada, y se envía al backend en tandas: con Wi-Fi enseguida, y con datos móviles como máximo cada 5 minutos (una jornada de 80 km son menos de 0,5 MB). Al finalizar la jornada se envía todo. Las coordenadas se guardan con 5 decimales (1 metro de precisión).
  - Los puntos solo se envían con la app abierta y la sesión iniciada: los que se guardan en segundo plano se envían al volver a la app. Si se cierra una jornada sin conexión, sus puntos esperan y se envían después, aunque ya haya empezado otra.
- **Fotos:** se toman con la cámara o se eligen de la galería. Antes de subirlas se comprimen a JPEG, de hasta 600 KB.
- **Pantallas que se abren encima** (detalle del reclamo, inicio y cierre de jornada): usan `VentanaCompleta`. En iPhone se abren como una hoja que se cierra deslizándola hacia abajo; en Android ocupan toda la pantalla y se cierran con el botón "atrás".
- **Permisos:** cámara y fotos (para las evidencias) y ubicación (solo con la jornada activa): mientras la app está en uso y, si el técnico lo acepta, también en segundo plano. Los textos de cada permiso están configurados en [app.json](app.json). Si la app se publicara en Google Play, la ubicación en segundo plano requiere justificar su uso en la revisión de Google.

## Configuración

Copiar [.env.example](.env.example) como `.env.local` y poner la IP de la PC donde corre el backend:

```sh
EXPO_PUBLIC_API_URL=https://159-54-146-55.sslip.io/api
```

La APK de distribución usa el backend publicado en Oracle Cloud mediante HTTPS. `.env.local` no se sube al repositorio.

Las credenciales de Oracle Object Storage/S3 no se configuran en la app móvil: las conserva el backend y las imágenes se solicitan a través de la API.

## Ejecución

Requiere Node.js 20 o superior, la app **Expo Go** en el celular, el backend levantado y el celular y la PC en la misma red Wi-Fi.

```sh
npm install
npx expo start      # escanear el QR con Expo Go
```

Para probar en el navegador: `npm run web`. En ese caso, el backend tiene que permitir el origen `http://localhost:8081` en `CORS_ORIGIN`.

**Si no conecta:**
- Abrir `https://159-54-146-55.sslip.io/api/ping` desde el navegador del celular.
- Después de cambiar `.env.local`, reiniciar Expo para que recargue las variables.

## Generar APK descargable

La configuración de [eas.json](eas.json) genera una APK release instalable fuera de Google Play:

```powershell
npx eas-cli@latest login
npx eas-cli@latest build --platform android --profile preview
```

EAS devolverá un enlace para descargar la APK. La aplicación queda identificada como `com.unahur.galacticapp.demo` y utiliza la URL de Oracle configurada en `EXPO_PUBLIC_API_URL`.

## Scripts

| Comando | Qué hace |
|---|---|
| `npx expo start` | Servidor de desarrollo (QR para Expo Go) |
| `npm run android` / `npm run ios` / `npm run web` | Abre la app en esa plataforma |
| `npm run lint` | Revisa el código con ESLint |
| `npm run typecheck` | Valida los tipos con TypeScript |
| `npx expo install <paquete>` | Agrega una dependencia con la versión compatible con el SDK |
