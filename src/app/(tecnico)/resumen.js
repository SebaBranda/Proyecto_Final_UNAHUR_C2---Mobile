import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import CierreJornada from '../../components/CierreJornada.js';
import InicioJornada from '../../components/InicioJornada.js';
import { Aviso, Boton, Opciones, Tarjeta, Titulo } from '../../components/ui.js';
import { useSesion } from '../../context/SesionContext.js';
import { jornadasApi, reclamosApi } from '../../services/api.js';
import { formatearDuracion, formatearFecha, formatearHora, formatearKm } from '../../utils/formato.js';
import { colores } from '../../theme/colores.js';

// Períodos del Desempeño (igual que la web).
const PERIODOS = [
  { valor: 'hoy', etiqueta: 'Hoy' },
  { valor: 'semana', etiqueta: 'Semana' },
  { valor: 'mes', etiqueta: 'Mes' },
  { valor: 'anio', etiqueta: 'Año' },
];
const POR_PAGINA = 10;

// Inicio del período en la hora del celular: hoy a las 00:00, el lunes, el día 1 o el 1 de enero.
function inicioDelPeriodo(periodo) {
  const fecha = new Date();
  fecha.setHours(0, 0, 0, 0);
  if (periodo === 'semana') fecha.setDate(fecha.getDate() - ((fecha.getDay() + 6) % 7));
  if (periodo === 'mes') fecha.setDate(1);
  if (periodo === 'anio') fecha.setMonth(0, 1);
  return fecha.toISOString();
}

// Mientras se escribe la fecha agrega las barras: "05112026" → "05/11/2026".
function conBarras(texto) {
  const numeros = texto.replace(/\D/g, '').slice(0, 8);
  if (numeros.length > 4) return `${numeros.slice(0, 2)}/${numeros.slice(2, 4)}/${numeros.slice(4)}`;
  if (numeros.length > 2) return `${numeros.slice(0, 2)}/${numeros.slice(2)}`;
  return numeros;
}

// "DD/MM/AAAA" → fecha a las 00:00 en la hora del celular, o null si no es una fecha real.
function leerFecha(texto) {
  const partes = texto.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!partes) return null;
  const [, dia, mes, anio] = partes.map(Number);
  const fecha = new Date(anio, mes - 1, dia);
  return fecha.getDate() === dia && fecha.getMonth() === mes - 1 ? fecha : null;
}

// Filtro de "Jornadas trabajadas". Devuelve { desde, hasta } en ISO (inicio y fin del día en la
// hora del celular), { pendiente } mientras se está escribiendo, o { error }.
function filtroDeJornadas(desdeTexto, hastaTexto) {
  if ([desdeTexto, hastaTexto].some((texto) => texto && texto.length < 10)) return { pendiente: true };
  const desde = desdeTexto ? leerFecha(desdeTexto) : null;
  const hasta = hastaTexto ? leerFecha(hastaTexto) : null;
  if (desdeTexto && !desde) return { error: 'La fecha "desde" no existe. Usá el formato DD/MM/AAAA.' };
  if (hastaTexto && !hasta) return { error: 'La fecha "hasta" no existe. Usá el formato DD/MM/AAAA.' };
  if (desde && hasta && desde > hasta) return { error: '"Desde" tiene que ser anterior o igual a "hasta".' };
  if (hasta) hasta.setHours(23, 59, 59, 999);
  return { desde: desde ? desde.toISOString() : '', hasta: hasta ? hasta.toISOString() : '' };
}

const formatearHoras = (horas) => `${Number(horas || 0).toLocaleString('es-AR', { maximumFractionDigits: 1 })} h`;

// Kilometraje final de una jornada cerrada (los datos viejos usan otros nombres de campo).
const kilometrajeFinal = (jornada) => jornada.controlFinal?.kilometraje
  ?? jornada.controlFinal?.kilometrajeFinal ?? jornada.kilometrajeFinal;

// Jornada: iniciar y finalizar la jornada, el desempeño por período y las jornadas trabajadas.
export default function Jornada() {
  const {
    sesion, actualizarSesion, iniciarJornada, errorUbicacion,
  } = useSesion();
  const { jornadaActiva, vehiculo } = sesion;
  const [ahora, establecerAhora] = useState(() => Date.now());
  const [iniciando, establecerIniciando] = useState(false);
  const [cierreAbierto, establecerCierreAbierto] = useState(false);
  const [inicioAbierto, establecerInicioAbierto] = useState(false);
  const [error, establecerError] = useState('');
  const [exito, establecerExito] = useState('');
  const [periodo, establecerPeriodo] = useState('hoy');
  const [resumen, establecerResumen] = useState(null);
  const [errorResumen, establecerErrorResumen] = useState('');
  const [desdeTexto, establecerDesdeTexto] = useState('');
  const [hastaTexto, establecerHastaTexto] = useState('');
  const [jornadas, establecerJornadas] = useState([]);
  const [paginacion, establecerPaginacion] = useState(null);
  const [cargandoMas, establecerCargandoMas] = useState(false);
  const [actualizando, establecerActualizando] = useState(false);
  const [errorJornadas, establecerErrorJornadas] = useState('');
  // Reclamos en curso: si finaliza la jornada, quedan para la próxima.
  const [reclamosEnCurso, establecerReclamosEnCurso] = useState(0);
  const filtro = filtroDeJornadas(desdeTexto, hastaTexto);
  const filtroValido = !filtro.pendiente && !filtro.error;
  const hayFiltro = Boolean(desdeTexto || hastaTexto);

  // El tiempo transcurrido de la jornada activa se actualiza cada 30 segundos.
  useEffect(() => {
    if (!jornadaActiva) return undefined;
    const intervalo = setInterval(() => establecerAhora(Date.now()), 30000);
    return () => clearInterval(intervalo);
  }, [jornadaActiva]);

  // Desempeño: horas trabajadas y reclamos finalizados desde el inicio del período elegido.
  const cargarResumen = useCallback(async () => {
    try {
      establecerResumen(await jornadasApi.resumen(inicioDelPeriodo(periodo)));
      establecerErrorResumen('');
    } catch {
      establecerErrorResumen('No se pudo cargar el desempeño. Deslizá hacia abajo para reintentar.');
    }
  }, [periodo]);

  // Jornadas trabajadas, con el filtro de fechas (si está completo y es válido).
  const cargarJornadas = useCallback(async (pagina = 1) => {
    if (!filtroValido) return;
    try {
      const respuesta = await jornadasApi.pagina({
        pagina, limite: POR_PAGINA, desde: filtro.desde, hasta: filtro.hasta,
      });
      establecerJornadas((actuales) => (pagina === 1 ? respuesta.datos : [...actuales, ...respuesta.datos]));
      establecerPaginacion(respuesta.paginacion);
      // Sin filtro, la primera página trae la jornada más nueva: si se inició o finalizó desde la
      // web, la app se pone al día. Con filtro no, porque la jornada activa puede quedar afuera
      // del rango y la app creería que no hay ninguna.
      if (pagina === 1 && !filtro.desde && !filtro.hasta) {
        const activa = respuesta.datos.find((jornada) => jornada.activa);
        actualizarSesion({ jornadaActiva: activa ? { id: activa.id, inicio: activa.inicio } : null });
      }
      establecerErrorJornadas('');
    } catch {
      establecerErrorJornadas('No se pudieron cargar tus jornadas. Deslizá hacia abajo para reintentar.');
    }
  }, [actualizarSesion, filtroValido, filtro.desde, filtro.hasta]);

  const cargarReclamosEnCurso = useCallback(async () => {
    try {
      establecerReclamosEnCurso((await reclamosApi.resumen()).enProgreso || 0);
    } catch {
      establecerReclamosEnCurso(0);
    }
  }, []);

  const recargar = useCallback(async () => {
    await Promise.all([cargarResumen(), cargarJornadas(1), cargarReclamosEnCurso()]);
    establecerActualizando(false);
  }, [cargarResumen, cargarJornadas, cargarReclamosEnCurso]);

  useFocusEffect(useCallback(() => {
    recargar();
  }, [recargar]));

  const verMas = async () => {
    establecerCargandoMas(true);
    await cargarJornadas(paginacion.pagina + 1);
    establecerCargandoMas(false);
  };

  // Con vehículo, la jornada empieza con el control del vehículo (ver InicioJornada).
  const iniciar = async () => {
    establecerError('');
    establecerExito('');
    if (vehiculo) {
      establecerInicioAbierto(true);
      return;
    }
    establecerIniciando(true);
    try {
      await iniciarJornada();
      establecerAhora(Date.now());
      recargar();
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

  const quitarFiltro = () => {
    establecerDesdeTexto('');
    establecerHastaTexto('');
  };

  return (
    <ScrollView
      style={estilos.contenedor}
      contentContainerStyle={estilos.contenido}
      keyboardShouldPersistTaps="handled"
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
            {reclamosEnCurso > 0 ? (
              <Aviso tipo="info">Tenés un reclamo en curso. Si finalizás la jornada, lo vas a poder continuar en la próxima.</Aviso>
            ) : null}
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
        <Titulo icono="stats-chart-outline" subtitulo="Horas trabajadas y reclamos que finalizaste en el período.">Desempeño</Titulo>
        <Opciones opciones={PERIODOS} valor={periodo} alCambiar={establecerPeriodo} />
        <View style={estilos.indicadores}>
          <Indicador valor={resumen ? formatearHoras(resumen.horasTrabajadas) : null} etiqueta="Horas trabajadas" color={colores.exito} />
          <Indicador valor={resumen?.serviciosEnPeriodo} etiqueta="Reclamos finalizados" color={colores.primario} />
        </View>
        <Aviso>{errorResumen}</Aviso>
      </Tarjeta>

      <Tarjeta>
        <Titulo icono="calendar-outline" subtitulo="Filtrá por fecha para ver jornadas anteriores.">Jornadas trabajadas</Titulo>
        <View style={estilos.fechas}>
          <CampoFecha etiqueta="Desde" valor={desdeTexto} alCambiar={(texto) => establecerDesdeTexto(conBarras(texto))} />
          <CampoFecha etiqueta="Hasta" valor={hastaTexto} alCambiar={(texto) => establecerHastaTexto(conBarras(texto))} />
        </View>
        {filtro.error ? <Aviso>{filtro.error}</Aviso> : null}
        {hayFiltro ? <Boton variante="secundario" icono="close" onPress={quitarFiltro}>Quitar filtro</Boton> : null}
        <Aviso>{errorJornadas}</Aviso>
        {!paginacion && !errorJornadas ? <ActivityIndicator color={colores.primario} /> : null}
        {paginacion && !jornadas.length ? (
          <Text style={estilos.secundario}>{hayFiltro ? 'No hay jornadas entre esas fechas.' : 'Todavía no registraste jornadas.'}</Text>
        ) : null}
        {jornadas.map((jornada) => <FilaJornada key={jornada.id} jornada={jornada} ahora={ahora} />)}
        {paginacion?.tieneSiguiente ? (
          <Boton variante="secundario" onPress={verMas} cargando={cargandoMas}>Ver más</Boton>
        ) : null}
      </Tarjeta>

      {inicioAbierto ? (
        <InicioJornada
          abierto
          vehiculo={vehiculo}
          cerrar={() => establecerInicioAbierto(false)}
          alIniciar={() => { establecerInicioAbierto(false); establecerAhora(Date.now()); recargar(); }}
        />
      ) : null}
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

function CampoFecha({ etiqueta, valor, alCambiar }) {
  return (
    <View style={estilos.campoFecha}>
      <Text style={estilos.etiquetaFecha}>{etiqueta}</Text>
      <TextInput
        value={valor}
        onChangeText={alCambiar}
        placeholder="DD/MM/AAAA"
        placeholderTextColor={colores.textoSecundario}
        keyboardType="number-pad"
        maxLength={10}
        style={estilos.entradaFecha}
        accessibilityLabel={etiqueta}
      />
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
        {jornada.controlFinal?.sinVehiculo || kmInicial == null
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
  fechas: { flexDirection: 'row', gap: 10 },
  campoFecha: { flex: 1, gap: 4 },
  etiquetaFecha: { color: colores.textoSecundario, fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  entradaFecha: { borderWidth: 1, borderColor: colores.borde, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, color: colores.texto, backgroundColor: colores.superficie },
  jornada: { borderTopWidth: 1, borderTopColor: colores.borde, paddingTop: 10, gap: 3 },
  filaJornada: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  fechaJornada: { fontSize: 15, fontWeight: '700', color: colores.texto },
  activa: { color: colores.exito, fontWeight: '700', fontSize: 13 },
  servicios: { color: colores.texto, fontSize: 13 },
});
