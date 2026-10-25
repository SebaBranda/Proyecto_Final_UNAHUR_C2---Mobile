import { apiClient } from './apiClient.js';

// Mismos endpoints que usa la web. Para el técnico, el backend ya filtra y devuelve solo sus datos,
// con los datos relacionados adentro (por ejemplo, cada reclamo trae su cliente).

export const authApi = {
  // Para el técnico, la respuesta trae también su jornada activa y su vehículo.
  iniciarSesion: async (credenciales) => (await apiClient.post('/auth/login', credenciales)).data,
};

export const reclamosApi = {
  // Mis asignaciones: todos sus reclamos, cada uno con su cliente.
  listar: async () => (await apiClient.get('/reclamos')).data,
  // Servicio en curso: solo el reclamo en progreso.
  listarEnCurso: async () => (await apiClient.get('/reclamos', { params: { estado: 'En progreso' } })).data,
};

export const vehiculosApi = {
  // Devuelve solo el vehículo asignado al técnico.
  listar: async () => (await apiClient.get('/vehiculos')).data,
};

export const jornadasApi = {
  // Sus jornadas, cada una con los servicios finalizados en ella.
  listar: async () => (await apiClient.get('/jornadas')).data,
};
