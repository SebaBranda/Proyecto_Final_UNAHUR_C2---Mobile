# GalacticApp Mobile

App móvil de GalacticApp para **técnicos**, hecha con [Expo](https://docs.expo.dev/) (SDK 58) y React Native en JavaScript.
Usa la misma API que la web ([backend](https://github.com/SebaBranda/Proyecto_Final_UNAHUR_C2-Backend)).

Estado actual: **esqueleto**. El login funciona contra la API real y las pantallas del técnico están creadas, pero todavía sin contenido.

## Requisitos

- Node.js 20 o superior.
- En el celular, la app **Expo Go** (Play Store / App Store).
- El backend de GalacticApp levantado (stack Docker, ver más abajo).
- El celular y la PC conectados **a la misma red Wi-Fi**.

## Cómo levantarla

1. Instalar dependencias:
   ```sh
   npm install
   ```
2. Configurar la URL de la API: copiar `.env.example` como `.env.local` y poner la IP de tu PC.
   ```sh
   EXPO_PUBLIC_API_URL=http://192.168.0.10:8080/api
   ```
   En Windows, la IP sale del comando `ipconfig` ("Dirección IPv4" del adaptador Wi-Fi).
   `.env.local` no se sube al repositorio, porque la IP es distinta en cada máquina.
3. Levantar el backend (desde la carpeta que tiene el `docker-compose.yml` de GalacticApp):
   ```sh
   docker compose up -d
   ```
4. Iniciar la app:
   ```sh
   npx expo start
   ```
5. Escanear el código QR con Expo Go (Android) o con la cámara (iPhone).
6. Ingresar con un técnico, por ejemplo `tecnico` / `tecnico` (datos demo).

Para probarla en el navegador de la PC: `npm run web`. En ese caso el backend tiene que permitir el origen
de la app en la variable `CORS_ORIGIN` (por ejemplo `http://localhost:8081`). En el celular no hace falta.

### Si no conecta

- Revisá que `EXPO_PUBLIC_API_URL` tenga la IP de la PC (no `localhost`) y termine en `/api`.
- Desde el navegador del celular, abrí `http://<IP-de-la-PC>:8080/api/ping`: si no responde, el problema es la red.
- El Firewall de Windows puede bloquear el puerto 8080: permitilo para redes privadas.
- Después de cambiar `.env.local`, recargá la app (sacudí el celular → Reload).

## Estructura

```
src/
  app/                    pantallas (Expo Router: cada archivo es una ruta)
    _layout.js            raíz: sesión y rutas protegidas
    login.js              login (solo técnicos)
    (tecnico)/            pantallas del técnico, en pestañas
      _layout.js          pestañas y botón "Salir"
      index.js            Mis asignaciones: filtros por estado, lista paginada y detalle → GET /reclamos
      servicio-en-curso.js En curso: detalle del reclamo en progreso y finalizarlo → PATCH /reclamos/:id/estado
      vehiculo.js         Vehículo: datos, seguro y último control → GET /vehiculos
      resumen.js          Jornada: iniciar/finalizar, desempeño e historial → /jornadas
  components/
    ui.js                 piezas visuales comunes (tarjetas, botones, campos, estados)
    DetalleReclamo.js     detalle de un reclamo y formulario para finalizarlo
    CierreJornada.js      control final de la jornada (kilometraje, litros, estado y 4 fotos)
    SelectorFotos.js      fotos con cámara o galería
    GaleriaImagenes.js    imágenes guardadas de un registro
  context/
    SesionContext.js      sesión del técnico: usuario, jornada activa y vehículo
    useUbicacionEnJornada.js con la jornada activa, manda la ubicación cada 5 minutos
  services/
    apiClient.js          axios con la URL de la API y el token
    api.js                llamadas a la API (mismos endpoints que la web)
  utils/
    imagenes.js           elegir fotos y comprimirlas (máx. 600 KB) antes de subirlas
    formato.js            fechas, horas, duraciones y kilómetros
  theme/colores.js        colores de marca (los mismos de la web)
```

**Permisos del celular:** cámara y fotos (para adjuntar imágenes al finalizar un reclamo o la jornada) y ubicación (solo con la jornada activa y la app abierta, para el mapa del admin). Se piden la primera vez que se usan.

**Rutas protegidas:** sin sesión solo se puede ver el login; con sesión, las pantallas del técnico.
Al iniciar o cerrar sesión, Expo Router cambia de pantalla solo (`Stack.Protected` en `src/app/_layout.js`).

**Sesión:** el token vive solo en memoria; al cerrar la app hay que volver a ingresar. Hay una sola sesión por usuario: si el técnico ingresa desde la web u otro celular, esta sesión se cierra y la app vuelve al login con el aviso.
Para mantenerla abierta se puede guardar el token con `expo-secure-store`.

## Comandos

| Comando | Qué hace |
|---|---|
| `npx expo start` | Inicia el servidor de desarrollo (QR para Expo Go) |
| `npm run web` | Abre la app en el navegador |
| `npm run lint` | Revisa el código con ESLint |
| `npx expo install <paquete>` | Agrega una dependencia con la versión compatible con el SDK (usar en lugar de `npm install <paquete>`) |
| `npx expo-doctor` | Diagnostica problemas de dependencias y configuración |

## Próximos pasos

- Programar las pantallas con los datos de la API (los endpoints ya están en `src/services/api.js`).
- Fotos de los servicios y de la jornada: `expo-image-picker` (cámara y galería).
- Ubicación del técnico durante la jornada: `expo-location`. En el celular usa el GPS nativo, sin necesidad de HTTPS.
- Mantener la sesión abierta: `expo-secure-store`.
