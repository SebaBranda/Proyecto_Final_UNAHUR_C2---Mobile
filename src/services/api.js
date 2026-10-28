import { apiClient } from './apiClient.js';

async function listarTodasLasPaginas(ruta, params = {}) {
  const datos = [];
  let pagina = 1;
  let paginas = 1;
  do {
    const respuesta = (await apiClient.get(ruta, {
      params: { ...params, pagina, limite: 50 },
    })).data;
    if (Array.isArray(respuesta)) return respuesta;
    datos.push(...(respuesta.datos || []));
    paginas = respuesta.paginacion?.paginas || 1;
    pagina += 1;
  } while (pagina <= paginas);
  return datos;
}

// Pide UNA página de un listado: { datos, paginacion }. Los filtros vacíos o "Todos" no se mandan.
const pedirPagina = async (ruta, filtros = {}) => (await apiClient.get(ruta, {
  params: Object.fromEntries(Object.entries(filtros).filter(([, valor]) => valor !== '' && valor != null && valor !== 'Todos')),
})).data;

// Mismos endpoints que usa la web. Para el técnico, el backend ya filtra y devuelve solo sus datos,
// con los datos relacionados adentro (por ejemplo, cada reclamo trae su cliente).

export const authApi = {
  // Para el técnico, la respuesta trae también su jornada activa y su vehículo.
  iniciarSesion: async (credenciales) => (await apiClient.post('/auth/login', credenciales)).data,
};

export const reclamosApi = {
  // Mis asignaciones: todos sus reclamos, cada uno con su cliente.
  listar: async () => listarTodasLasPaginas('/reclamos'),
  // Servicio en curso: solo el reclamo en progreso.
  listarEnCurso: async () => listarTodasLasPaginas('/reclamos', { estado: 'En progreso' }),
  // Una página: { datos, paginacion, totalesPorEstado }. filtros: { pagina, limite, estado }.
  pagina: (filtros) => pedirPagina('/reclamos', filtros),
};

export const vehiculosApi = {
  // Devuelve solo el vehículo asignado al técnico.
  listar: async () => listarTodasLasPaginas('/vehiculos'),
};

export const jornadasApi = {
  // Sus jornadas, cada una con los servicios finalizados en ella.
  listar: async () => listarTodasLasPaginas('/jornadas'),
  // Una página de sus jornadas (las más nuevas primero). filtros: { pagina, limite }.
  pagina: (filtros) => pedirPagina('/jornadas', filtros),
  // Contadores: { totalServicios, serviciosEnPeriodo } desde la fecha indicada (ISO).
  resumen: async (desde) => (await apiClient.get('/jornadas/resumen', { params: desde ? { desde } : {} })).data,
};
