import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import CierreJornada from '../../components/CierreJornada.js';
import { Aviso, Boton, Opciones, Tarjeta, Titulo } from '../../components/ui.js';
import { useSesion } from '../../context/SesionContext.js';
import { jornadasApi } from '../../services/api.js';
import { formatearDuracion, formatearFecha, formatearHora, formatearKm } from '../../utils/formato.js';
import { colores } from '../../theme/colores.js';

const PERIODOS = [
  { valor: 'semanal', etiqueta: 'Semana' },
  { valor: 'mensual', etiqueta: 'Mes' },
  { valor: 'anual', etiqueta: 'Año' },
  { valor: 'todos', etiqueta: 'Todo' },
];
const POR_PAGINA = 10;

// Inicio del período en la hora del celular (igual que la web): lunes, día 1 o 1 de enero.
function inicioDelPeriodo(periodo) {
  if (periodo === 'todos') return '';
  const fecha = new Date();
  fecha.setHours(0, 0, 0, 0);
  if (periodo === 'semanal') fecha.setDate(fecha.getDate() - ((fecha.getDay() + 6) % 7));
  if (periodo === 'mensual') fecha.setDate(1);
  if (periodo === 'anual') fecha.setMonth(0, 1);
  return fecha.toISOString();
}

// Kilometraje final de una jornada cerrada (los datos viejos usan otros nombres de campo).
const kilometrajeFinal = (jornada) => jornada.controlFinal?.kilometraje
  ?? jornada.controlFinal?.kilometrajeFinal ?? jornada.kilometrajeFinal;

// Jornada: iniciar y finalizar la jornada, resueltas por período y el historial de jornadas.
export default function Jornada() {
  const { sesion, actualizarSesion, errorUbicacion } = useSesion();
  const { usuario, jornadaActiva, vehiculo } = sesion;
  const [ahora, establecerAhora] = useState(() => Date.now());
  const [iniciando, establecerIniciando] = useState(false);
  const [cierreAbierto, establecerCierreAbierto] = useState(false);
  const [error, establecerError] = useState('');
  const [exito, establecerExito] = useState('');
  const [periodo, establecerPeriodo] = useState('semanal');
  const [resumen, establecerResumen] = useState(null);
  const [jornadas, establecerJornadas] = useState([]);
  const [paginacion, establecerPaginacion] = useState(null);
  const [cargandoMas, establecerCargandoMas] = useState(false);
  const [actualizando, establecerActualizando] = useState(false);
  const [errorDatos, establecerErrorDatos] = useState('');

  // El tiempo transcurrido de la jornada activa se actualiza cada 30 segundos.
  useEffect(() => {
    if (!jornadaActiva) return undefined;
    const intervalo = setInterval(() => establecerAhora(Date.now()), 30000);
    return () => clearInterval(intervalo);
  }, [jornadaActiva]);

  const cargarResumen = useCallback(async () => {
    try {
      establecerResumen(await jornadasApi.resumen(inicioDelPeriodo(periodo)));
    } catch {
      establecerErrorDatos('No se pudo cargar el resumen. Deslizá hacia abajo para reintentar.');
    }
  }, [periodo]);

  const cargarJornadas = useCallback(async (pagina = 1) => {
    try {
      const respuesta = await jornadasApi.pagina({ pagina, limite: POR_PAGINA });
      establecerJornadas((actuales) => (pagina === 1 ? respuesta.datos : [...actuales, ...respuesta.datos]));
      establecerPaginacion(respuesta.paginacion);
      // La primera página trae la jornada más nueva: si se inició o finalizó desde la web,
      // la app se pone al día.
      if (pagina === 1) {
        const activa = respuesta.datos.find((jornada) => jornada.activa);
        actualizarSesion({ jornadaActiva: activa ? { id: activa.id, inicio: activa.inicio } : null });
      }
      establecerErrorDatos('');
    } catch {
      establecerErrorDatos('No se pudieron cargar tus jornadas. Deslizá hacia abajo para reintentar.');
    }
  }, [actualizarSesion]);

  const recargar = useCallback(async () => {
    await Promise.all([cargarResumen(), cargarJornadas(1)]);
    establecerActualizando(false);
  }, [cargarResumen, cargarJornadas]);

  useFocusEffect(useCallback(() => {
    recargar();
  }, [recargar]));

  const verMas = async () => {
    establecerCargandoMas(true);
    await cargarJornadas(paginacion.pagina + 1);
    establecerCargandoMas(false);
  };

  const iniciar = async () => {
    establecerError('');
    establecerExito('');
    establecerIniciando(true);
    try {
      const jornada = await jornadasApi.iniciar(usuario.id, vehiculo ? Number(vehiculo.kilometraje?.actual) || 0 : undefined);
      actualizarSesion({ jornadaActiva: jornada });
      establecerAhora(Date.now());
      cargarJornadas(1);
    } catch (causa) {
      establecerError(causa.response?.data?.mensaje || 'No se pudo iniciar la jornada.');
    } finally {
      establecerIniciando(false);
    }
  };

  const alFinalizar = ({ jornada, vehiculo: vehiculoActualizado }) => {
    establecerCierreAbierto(false);
    actualizarSesion({ jornadaActiva: null, vehiculo: vehiculoActualizado });
    establecerExito(`Jornada finalizada: ${formatearDuracion(jornada.inicio, jornada.fin)} de trabajo.`);
    recargar();
  };

  return (
    <ScrollView
      style={estilos.contenedor}
      contentContainerStyle={estilos.contenido}
      refreshControl={<RefreshControl refreshing={actualizando} onRefresh={() => { establecerActualizando(true); recargar(); }} colors={[colores.primario]} />}
    >
      <Tarjeta>
        <Titulo icono="time-outline" subtitulo={jornadaActiva ? 'Tu jornada está activa.' : 'Iniciá tu jornada para registrar tus horas y servicios.'}>
          Jornada de trabajo
        </Titulo>
        {jornadaActiva ? (
          <>
            <View style={estilos.reloj}>
              <Text style={estilos.duracion}>{formatearDuracion(jornadaActiva.inicio, ahora)}</Text>
              <Text style={estilos.secundario}>desde las {formatearHora(jornadaActiva.inicio)}</Text>
            </View>
            <Boton icono="log-out-outline" onPress={() => { establecerExito(''); establecerCierreAbierto(true); }}>Finalizar jornada</Boton>
            {errorUbicacion ? <Aviso>{errorUbicacion}</Aviso> : (
              <Text style={estilos.secundario}>Tu ubicación se comparte con el mapa mientras la app está abierta.</Text>
            )}
          </>
        ) : (
          <Boton icono="play" onPress={iniciar} cargando={iniciando}>Iniciar jornada</Boton>
        )}
        <Aviso>{error}</Aviso>
        <Aviso tipo="exito">{exito}</Aviso>
      </Tarjeta>

      <Tarjeta>
        <Titulo icono="stats-chart-outline" subtitulo="Reclamos que finalizaste.">Desempeño</Titulo>
        <Opciones opciones={PERIODOS} valor={periodo} alCambiar={establecerPeriodo} />
        <View style={estilos.indicadores}>
          <Indicador valor={resumen?.serviciosEnPeriodo} etiqueta="En el período" color={colores.exito} />
          <Indicador valor={resumen?.totalServicios} etiqueta="En total" color={colores.primario} />
        </View>
      </Tarjeta>

      <Tarjeta>
        <Titulo icono="calendar-outline">Mis jornadas</Titulo>
        <Aviso>{errorDatos}</Aviso>
        {!paginacion && !errorDatos ? <ActivityIndicator color={colores.primario} /> : null}
        {paginacion && !jornadas.length ? <Text style={estilos.secundario}>Todavía no registraste jornadas.</Text> : null}
        {jornadas.map((jornada) => <FilaJornada key={jornada.id} jornada={jornada} ahora={ahora} />)}
        {paginacion?.tieneSiguiente ? (
          <Boton variante="secundario" onPress={verMas} cargando={cargandoMas}>Ver más</Boton>
        ) : null}
      </Tarjeta>

      {cierreAbierto ? (
        <CierreJornada abierto jornada={jornadaActiva} vehiculo={vehiculo} cerrar={() => establecerCierreAbierto(false)} alFinalizar={alFinalizar} />
      ) : null}
    </ScrollView>
  );
}

function Indicador({ valor, etiqueta, color }) {
  return (
    <View style={[estilos.indicador, { borderColor: color }]}>
      <Text style={[estilos.valorIndicador, { color }]}>{valor ?? '–'}</Text>
      <Text style={estilos.secundario}>{etiqueta}</Text>
    </View>
  );
}

function FilaJornada({ jornada, ahora }) {
  const servicios = jornada.servicios || [];
  const kmInicial = jornada.controlInicial?.kilometrajeInicial ?? jornada.kilometrajeInicial;
  const kmFinal = kilometrajeFinal(jornada);
  return (
    <View style={estilos.jornada}>
      <View style={estilos.filaJornada}>
        <Text style={estilos.fechaJornada}>{formatearFecha(jornada.inicio)}</Text>
        {jornada.activa ? <Text style={estilos.activa}>Activa</Text> : (
          <Text style={estilos.secundario}>{formatearDuracion(jornada.inicio, jornada.fin || ahora)}</Text>
        )}
      </View>
      <Text style={estilos.secundario}>
        {formatearHora(jornada.inicio)} a {jornada.activa ? 'ahora' : formatearHora(jornada.fin)}
        {' · '}{servicios.length} {servicios.length === 1 ? 'servicio' : 'servicios'}
      </Text>
      <Text style={estilos.secundario}>
        {jornada.controlFinal?.sinVehiculo
          ? 'Sin vehículo'
          : `Km: ${formatearKm(kmInicial)} → ${jornada.activa ? 'en curso' : formatearKm(kmFinal)}`}
      </Text>
      {servicios.length ? (
        <Text style={estilos.servicios} numberOfLines={2}>
          {servicios.map((servicio) => `#${servicio.id} ${servicio.tipo}`).join(' · ')}
        </Text>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: colores.fondo },
  contenido: { padding: 16, gap: 12, paddingBottom: 32 },
  reloj: { gap: 2 },
  duracion: { fontSize: 28, fontWeight: '800', color: colores.texto },
  secundario: { color: colores.textoSecundario, fontSize: 13 },
  indicadores: { flexDirection: 'row', gap: 10 },
  indicador: { flex: 1, borderWidth: 1, borderRadius: 10, padding: 12, gap: 2 },
  valorIndicador: { fontSize: 26, fontWeight: '800' },
  jornada: { borderTopWidth: 1, borderTopColor: colores.borde, paddingTop: 10, gap: 3 },
  filaJornada: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  fechaJornada: { fontSize: 15, fontWeight: '700', color: colores.texto },
  activa: { color: colores.exito, fontWeight: '700', fontSize: 13 },
  servicios: { color: colores.texto, fontSize: 13 },
});
