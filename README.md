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
    useUbicacionEnJornada.js registra la ubicación cada 5 minutos mientras la jornada está activa
  services/
    apiClient.js             Axios con la URL de la API y el token
    api.js                   llamadas a la API (los mismos endpoints que la web)
    historialUbicacion.js    cola local del recorrido y su sincronización
  utils/                     compresión de imágenes, formatos de fecha y kilómetros, combustible
  theme/colores.js           colores de marca (los mismos de la web)
```

## Aspectos técnicos

- **Rutas protegidas:** sin sesión solo se ve el login. Al iniciar o cerrar sesión, Expo Router cambia de pantalla solo (`Stack.Protected`).
- **Sesión:**
  - El token se guarda solo en memoria: al cerrar la app hay que volver a ingresar.
  - Hay una única sesión por usuario: si el técnico ingresa desde la web u otro celular, esta sesión se cierra y la app vuelve al login con un aviso.
- **Recorrido:**
  - Mientras la jornada está activa, cada posición se guarda en una cola en `AsyncStorage`.
  - Se registran puntos cada 5 minutos, al iniciar o finalizar la jornada y al cambiar el estado de un servicio.
  - La cola se envía completa cuando hay Wi-Fi (detectado con NetInfo), para no gastar datos móviles. Solo se borra después de que el envío salió bien.
- **Fotos:** se toman con la cámara o se eligen de la galería. Antes de subirlas se comprimen a JPEG, de hasta 600 KB.
- **Permisos:** cámara y fotos (para las evidencias) y ubicación mientras la app está en uso (solo con la jornada activa). Los textos de cada permiso están configurados en [app.json](app.json).

## Configuración

Copiar [.env.example](.env.example) como `.env.local` y poner la IP de la PC donde corre el backend:

```sh
EXPO_PUBLIC_API_URL=http://192.168.0.10:8080/api
```

En el celular, `localhost` es el propio teléfono, por eso hace falta la IP de la PC. En Windows sale con `ipconfig`. `.env.local` no se sube al repositorio.

## Ejecución

Requiere Node.js 20 o superior, la app **Expo Go** en el celular, el backend levantado y el celular y la PC en la misma red Wi-Fi.

```sh
npm install
npx expo start      # escanear el QR con Expo Go
```

Para probar en el navegador: `npm run web`. En ese caso, el backend tiene que permitir el origen `http://localhost:8081` en `CORS_ORIGIN`.

**Si no conecta:**
- Abrir `http://<IP-de-la-PC>:8080/api/ping` desde el navegador del celular. Si no responde, el problema es de red: puede ser el Firewall de Windows bloqueando el puerto 8080.
- Después de cambiar `.env.local`, recargar la app.

## Scripts

| Comando | Qué hace |
|---|---|
| `npx expo start` | Servidor de desarrollo (QR para Expo Go) |
| `npm run android` / `npm run ios` / `npm run web` | Abre la app en esa plataforma |
| `npm run lint` | Revisa el código con ESLint |
| `npm run typecheck` | Valida los tipos con TypeScript |
| `npx expo install <paquete>` | Agrega una dependencia con la versión compatible con el SDK |
