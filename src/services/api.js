import { apiClient } from './apiClient.js';

// Pide UNA página de un listado: { datos, paginacion }. Los filtros vacíos o "Todos" no se mandan.
const pedirPagina = async (ruta, filtros = {}) => (await apiClient.get(ruta, {
  params: Object.fromEntries(Object.entries(filtros).filter(([, valor]) => valor !== '' && valor != null && valor !== 'Todos')),
})).data;

// Mismos endpoints que usa la web. Para el técnico, el backend ya filtra y devuelve solo sus datos,
// con los datos relacionados adentro (por ejemplo, cada reclamo trae su cliente).

export const authApi = {
  // Para el técnico, la respuesta trae también su jornada activa y su vehículo.
  iniciarSesion: async (credenciales) => (await apiClient.post('/auth/login', credenciales)).data,
  // Cierra la sesión en el backend: el token deja de servir en todos lados.
  cerrarSesion: async () => (await apiClient.post('/auth/logout')).data,
};

export const reclamosApi = {
  // Una página de sus reclamos (del más nuevo al más viejo), cada uno con su cliente.
  // filtros: { pagina, limite, estado }. Trae también totalesPorEstado: { 'Asignado': 2, ... }.
  pagina: (filtros) => pedirPagina('/reclamos', filtros),
  // Servicio en curso: el reclamo en progreso (como mucho uno).
  enCurso: async () => (await pedirPagina('/reclamos', { estado: 'En progreso', limite: 5 })).datos || [],
  // Finaliza el reclamo con un comentario y los ids de las imágenes del trabajo (ya subidas).
  // jornadaId (la jornada activa) hace que el servicio cuente en esa jornada y en el desempeño.
  finalizar: async (reclamoId, { comentarioFinalizacion, imagenes, jornadaId }) => (
    await apiClient.patch(`/reclamos/${reclamoId}/estado`, {
      estado: 'Finalizado',
      comentarioFinalizacion,
      imagenes,
      finalizadoEn: new Date().toISOString(),
      jornadaId: jornadaId ?? null,
    })
  ).data,
};

export const vehiculosApi = {
  // Devuelve solo el vehículo asignado al técnico (o null si no tiene).
  asignado: async () => (await pedirPagina('/vehiculos', { limite: 1 })).datos?.[0] ?? null,
  // Control del vehículo (kilometraje, litros, estado, imágenes): actualiza el kilometraje actual.
  registrarControl: async (vehiculoId, control) => (
    await apiClient.patch(`/vehiculos/${vehiculoId}/control`, control)
  ).data,
};

export const jornadasApi = {
  // Una página de sus jornadas (las más nuevas primero), cada una con sus servicios finalizados.
  pagina: (filtros) => pedirPagina('/jornadas', filtros),
  // Contadores: { totalServicios, serviciosEnPeriodo } desde la fecha indicada (ISO).
  resumen: async (desde) => (await apiClient.get('/jornadas/resumen', { params: desde ? { desde } : {} })).data,
  // El backend pone la hora de inicio; si ya hay una jornada activa responde 409.
  // Sin vehículo asignado, kilometrajeInicial va undefined (no se manda).
  iniciar: async (tecnicoId, kilometrajeInicial) => (
    await apiClient.post('/jornadas', { tecnicoId, kilometrajeInicial })
  ).data,
  // controlFinal: { kilometraje, litros, estado, observaciones, imagenes } (exactamente 4 imágenes).
  // Sin vehículo asignado alcanza con { observaciones } (opcional): no hay control del vehículo.
  finalizar: async (jornadaId, controlFinal) => (
    await apiClient.patch(`/jornadas/${jornadaId}/finalizar`, controlFinal)
  ).data,
};

export const ubicacionesApi = {
  actualizar: async (tecnicoId, latitud, longitud) => (
    await apiClient.patch(`/ubicaciones-tecnicos/${tecnicoId}`, { latitud, longitud })
  ).data,
};

// Imágenes: se suben con subir() y los registros guardan solo sus ids en un campo "imagenes".
export const imagenesApi = {
  // Recibe data URLs (base64, máx. 600 KB cada una y 6 por pedido) y devuelve [{ id }].
  subir: async (imagenes) => (await apiClient.post('/imagenes', { imagenes })).data,
  // Devuelve [{ id, url, creadoEn }]: url es un data URL que se muestra directo en un <Image>.
  obtener: async (ids) => (await apiClient.get('/imagenes', { params: { ids: ids.join(',') } })).data,
};
