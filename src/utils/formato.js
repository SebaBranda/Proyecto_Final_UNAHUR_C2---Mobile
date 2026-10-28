// Formatos de fecha y hora para mostrar (hora de Argentina, la del celular).

export const formatearFecha = (valor) => (valor
  ? new Date(valor.length === 10 ? `${valor}T12:00:00` : valor).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  : 'Sin fecha');

export const formatearHora = (valor) => (valor
  ? new Date(valor).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
  : '--:--');

// Duración entre dos momentos: "3 h 25 min". Sin fin, hasta ahora.
export function formatearDuracion(inicio, fin = Date.now()) {
  const minutos = Math.max(0, Math.floor((new Date(fin) - new Date(inicio)) / 60000));
  const horas = Math.floor(minutos / 60);
  return horas ? `${horas} h ${minutos % 60} min` : `${minutos} min`;
}

export const formatearKm = (valor) => (Number.isFinite(Number(valor)) && valor !== null && valor !== ''
  ? `${Number(valor).toLocaleString('es-AR')} km`
  : 'Sin dato');
