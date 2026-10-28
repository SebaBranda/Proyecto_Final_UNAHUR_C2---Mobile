import axios from 'axios';

// URL de la API, definida en .env.local (ver .env.example y README).
// En el celular "localhost" es el propio teléfono: hay que usar la IP de la PC donde corre el backend.
export const URL_API = process.env.EXPO_PUBLIC_API_URL;

// El token de la sesión vive solo en memoria: al cerrar la app hay que volver a ingresar.
let tokenActual = null;
export const establecerToken = (token) => {
  tokenActual = token;
};

export const apiClient = axios.create({
  baseURL: URL_API,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config) => {
  if (tokenActual) config.headers.Authorization = `Bearer ${tokenActual}`;
  return config;
});

// Función que avisa a la app que la sesión se cerró (la registra SesionContext).
let alPerderSesion = null;
export const alCerrarseLaSesion = (funcion) => {
  alPerderSesion = funcion;
};

// Un 401 con sesión abierta significa que el token venció o que la sesión se cerró porque se
// ingresó con el mismo usuario desde otro lugar (una sola sesión por usuario): vuelve al login.
apiClient.interceptors.response.use(
  (respuesta) => respuesta,
  (error) => {
    const url = error.config?.url || '';
    const esLoginOLogout = url.startsWith('/auth/login') || url.startsWith('/auth/logout');
    if (error.response?.status === 401 && !esLoginOLogout && tokenActual) {
      tokenActual = null;
      const datos = error.response.data || {};
      alPerderSesion?.(datos.codigo === 'SESION_REEMPLAZADA' ? datos.mensaje : 'Tu sesión venció. Ingresá de nuevo.');
    }
    return Promise.reject(error);
  },
);
