import axios from 'axios';

// URL de la API, definida en .env.local (ver .env.example y README).
// En el celular "localhost" es el propio teléfono: hay que usar la IP de la PC donde corre el backend.
export const URL_API = process.env.EXPO_PUBLIC_API_URL;

// El token de la sesión vive solo en memoria: al cerrar la app hay que volver a ingresar.
// venceEn: momento (en milisegundos) en que vence, según los segundos que informa el backend.
let tokenActual = null;
let venceEn = 0;
export const establecerToken = (token, segundosDeVida = 3600) => {
  tokenActual = token;
  venceEn = token ? Date.now() + segundosDeVida * 1000 : 0;
};

export const apiClient = axios.create({
  baseURL: URL_API,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// El token dura 1 hora: si le quedan menos de 15 minutos, se renueva antes del próximo pedido
// (igual que en la web). Así la sesión no se corta mientras el técnico trabaja.
const RENOVAR_ANTES_DE_MS = 15 * 60 * 1000;
let renovacionEnCurso = null;
function renovarSiHaceFalta() {
  if (venceEn - Date.now() > RENOVAR_ANTES_DE_MS) return Promise.resolve();
  if (!renovacionEnCurso) {
    const tokenAnterior = tokenActual;
    // axios directo (no apiClient) para no volver a pasar por este interceptor.
    renovacionEnCurso = axios.get(`${URL_API}/auth/sesion`, {
      headers: { Authorization: `Bearer ${tokenAnterior}` },
      timeout: 10000,
    })
      .then(({ data }) => {
        // Si mientras tanto se salió de la sesión, no se vuelve a guardar un token.
        if (tokenActual === tokenAnterior) establecerToken(data.token, data.expiresIn);
      })
      .catch(() => undefined)
      .finally(() => { renovacionEnCurso = null; });
  }
  return renovacionEnCurso;
}

apiClient.interceptors.request.use(async (config) => {
  if (tokenActual && !config.url?.startsWith('/auth/')) await renovarSiHaceFalta();
  if (tokenActual) config.headers.Authorization = `Bearer ${tokenActual}`;
  return config;
});

// Función que avisa a la app que la sesión se cerró (la registra SesionContext).
let alPerderSesion = null;
export const alCerrarseLaSesion = (funcion) => {
  alPerderSesion = funcion;
};

// Función que avisa a la app que el técnico ya no tiene la jornada activa (la registra SesionContext).
let alPerderJornada = null;
export const alQuedarSinJornada = (funcion) => {
  alPerderJornada = funcion;
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
    // Sin jornada activa el backend no deja ver ni trabajar los reclamos: la app muestra la
    // pantalla para iniciarla (por ejemplo, si la jornada se finalizó desde la web).
    if (error.response?.status === 403 && error.response.data?.codigo === 'JORNADA_INACTIVA') {
      alPerderJornada?.();
    }
    return Promise.reject(error);
  },
);
