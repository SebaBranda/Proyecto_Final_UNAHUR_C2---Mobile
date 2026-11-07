import { useState } from 'react';
import { Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { clientesApi, reclamosApi } from '../services/api.js';
import { subirImagenes } from '../utils/imagenes.js';
import { formatearFecha } from '../utils/formato.js';
import { colores } from '../theme/colores.js';
import GaleriaImagenes from './GaleriaImagenes.js';
import SelectorFotos from './SelectorFotos.js';
import { Aviso, Boton, Campo, ChipEstado, Dato, Tarjeta } from './ui.js';
import { registrarEventoUbicacion } from '../services/eventoUbicacion.js';
import { useSesion } from '../context/SesionContext.js';

const MAXIMO_IMAGENES_RECLAMO = 5;

// Detalle completo de un reclamo. Si está en progreso, permite finalizarlo con un comentario
// y fotos del trabajo terminado (igual que en la web). alFinalizar se llama cuando sale bien.
export function DetalleReclamo({
  reclamo, tieneReclamoEnProgreso, alIniciar, alFinalizar,
}) {
  const cliente = reclamo.cliente || {};
  const [conexion, establecerConexion] = useState({
    pelo: cliente.pelo || '',
    caja: cliente.caja || '',
  });
  const enProgreso = reclamo.estado === 'En progreso';
  const imagenesActuales = reclamo.imagenes || [];

  return (
    <View style={{ gap: 12 }}>
      <Tarjeta>
        <View style={estilos.encabezado}>
          <View style={{ flex: 1 }}>
            <Text style={estilos.tipo}>{reclamo.tipo || 'Reclamo de servicio'}</Text>
            <Text style={estilos.numero}>Reclamo #{reclamo.id}</Text>
          </View>
          <ChipEstado estado={reclamo.estado} />
        </View>
        <View style={estilos.fila}>
          <View style={{ flex: 1 }}><Dato etiqueta="Visita programada">{formatearFecha(reclamo.fechaProgramada)}</Dato></View>
          <View style={{ flex: 1 }}><Dato etiqueta="Prioridad">{reclamo.prioridad || 'Normal'}</Dato></View>
        </View>
        {reclamo.descripcion ? <Dato etiqueta="Descripción">{reclamo.descripcion}</Dato> : null}
        {reclamo.notasCoordinador ? <Dato etiqueta="Notas del coordinador">{reclamo.notasCoordinador}</Dato> : null}
        {reclamo.motivoBloqueo ? <Dato etiqueta="Motivo del bloqueo">{reclamo.motivoBloqueo}</Dato> : null}
        {reclamo.comentarioFinalizacion ? <Dato etiqueta="Trabajo realizado">{reclamo.comentarioFinalizacion}</Dato> : null}
        {imagenesActuales.length ? (
          <View style={{ gap: 6 }}>
            <Text style={estilos.etiqueta}>Imágenes ({imagenesActuales.length})</Text>
            <GaleriaImagenes ids={imagenesActuales} />
          </View>
        ) : null}
      </Tarjeta>

      <Tarjeta>
        <Dato etiqueta="Cliente">{cliente.nombre || 'Sin cliente'}</Dato>
        {cliente.numeroCliente ? <Dato etiqueta="Número de cliente">{cliente.numeroCliente}</Dato> : null}
        {conexion.pelo ? <Dato etiqueta="Pelo">{conexion.pelo}</Dato> : null}
        {conexion.caja ? <Dato etiqueta="Caja">{conexion.caja}</Dato> : null}
        {(cliente.ubicacion || cliente.direccion) ? (
          <Enlace
            icono="location-outline"
            texto={cliente.direccion || cliente.ubicacion}
            accion="Ver en Maps"
            url={cliente.ubicacion?.startsWith('http')
              ? cliente.ubicacion
              : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cliente.ubicacion || cliente.direccion)}`}
          />
        ) : null}
        {['Asignado', 'En progreso'].includes(reclamo.estado) ? (
          <ActualizarConexion cliente={cliente} alGuardar={establecerConexion} />
        ) : null}
        {cliente.telefono ? (
          <Enlace icono="call-outline" texto={cliente.telefono} accion="Llamar" url={`tel:${cliente.telefono.replace(/[^\d+]/g, '')}`} />
        ) : null}
      </Tarjeta>

      {enProgreso ? (
        <FinalizarReclamo reclamo={reclamo} lugaresLibres={MAXIMO_IMAGENES_RECLAMO - imagenesActuales.length} alFinalizar={alFinalizar} />
      ) : reclamo.estado === 'Asignado' ? (
        <IniciarReclamo
          reclamo={reclamo}
          tieneReclamoEnProgreso={tieneReclamoEnProgreso}
          alIniciar={alIniciar}
        />
      ) : null}
    </View>
  );
}

// Comenzar es un solo toque: el control del vehículo se hace al iniciar y al finalizar la jornada.
// El backend anota el vehículo del técnico (si tiene uno) y no deja tener dos reclamos en curso.
// El cambio de estado queda como un punto del recorrido del técnico.
function IniciarReclamo({ reclamo, tieneReclamoEnProgreso, alIniciar }) {
  const { sesion } = useSesion();
  const [comenzando, establecerComenzando] = useState(false);
  const [error, establecerError] = useState('');

  const comenzar = async () => {
    establecerError('');
    establecerComenzando(true);
    try {
      await reclamosApi.iniciar(reclamo.id);
      if (sesion?.jornadaActiva?.id) await registrarEventoUbicacion(sesion.jornadaActiva.id, 'cambio_estado');
      alIniciar?.();
    } catch (causa) {
      establecerError(causa.response?.data?.mensaje || 'No se pudo comenzar el reclamo. Revisá la conexión e intentá nuevamente.');
      establecerComenzando(false);
    }
  };

  return (
    <Tarjeta>
      <Boton icono="play" onPress={comenzar} cargando={comenzando} deshabilitado={tieneReclamoEnProgreso}>
        {tieneReclamoEnProgreso ? 'Finalizá el reclamo en curso para comenzar' : 'Comenzar asignación'}
      </Boton>
      <Aviso>{error}</Aviso>
    </Tarjeta>
  );
}

function ActualizarConexion({ cliente, alGuardar }) {
  const [pelo, establecerPelo] = useState(cliente.pelo || '');
  const [caja, establecerCaja] = useState(cliente.caja || '');
  const [guardando, establecerGuardando] = useState(false);
  const [mensaje, establecerMensaje] = useState('');
  const [error, establecerError] = useState('');

  const guardar = async () => {
    establecerGuardando(true);
    establecerMensaje('');
    establecerError('');
    try {
      const respuesta = await clientesApi.actualizarConexion(cliente.id, { pelo, caja });
      alGuardar?.(respuesta.cliente || { pelo, caja });
      establecerMensaje('Datos de conexión guardados.');
    } catch (causa) {
      establecerError(causa.response?.data?.mensaje || 'No se pudieron guardar los datos de conexión.');
    } finally {
      establecerGuardando(false);
    }
  };

  return (
    <View style={estilos.conexion}>
      <Text style={estilos.etiqueta}>Datos de conexión</Text>
      <Text style={estilos.secundario}>Podés completar o corregir pelo y caja durante la visita.</Text>
      <Campo etiqueta="Pelo" value={pelo} onChangeText={establecerPelo} editable={!guardando}
        placeholder="Ej.: P-12" />
      <Campo etiqueta="Caja" value={caja} onChangeText={establecerCaja} editable={!guardando}
        placeholder="Ej.: Caja 4" />
      {error ? <Aviso>{error}</Aviso> : null}
      {mensaje ? <Aviso tipo="exito">{mensaje}</Aviso> : null}
      <Boton icono="save-outline" onPress={guardar} cargando={guardando}>Guardar conexión</Boton>
    </View>
  );
}

function Enlace({ icono, texto, accion, url }) {
  return (
    <View style={estilos.enlace}>
      <Ionicons name={icono} size={18} color={colores.primario} />
      <Text style={estilos.textoEnlace}>{texto}</Text>
      <Pressable onPress={() => Linking.openURL(url)} accessibilityRole="link" hitSlop={8}>
        <Text style={estilos.accion}>{accion}</Text>
      </Pressable>
    </View>
  );
}

function FinalizarReclamo({ reclamo, lugaresLibres, alFinalizar }) {
  const [abierto, establecerAbierto] = useState(false);
  const [comentario, establecerComentario] = useState('');
  const [fotos, establecerFotos] = useState([]);
  const [guardando, establecerGuardando] = useState(false);
  const [error, establecerError] = useState('');

  const finalizar = async () => {
    if (!comentario.trim()) {
      establecerError('Escribí un comentario sobre el trabajo realizado.');
      return;
    }
    if (!fotos.length) {
      establecerError('Agregá al menos una foto del trabajo terminado.');
      return;
    }
    establecerError('');
    establecerGuardando(true);
    try {
      const imagenes = await subirImagenes(fotos);
      const actualizado = await reclamosApi.finalizar(reclamo.id, {
        comentarioFinalizacion: comentario.trim(),
        imagenes,
      });
      alFinalizar?.(actualizado);
    } catch (causa) {
      establecerError(causa.response?.data?.mensaje || 'No se pudo finalizar el reclamo. Revisá la conexión e intentá de nuevo.');
      establecerGuardando(false);
    }
  };

  if (!abierto) {
    return <Boton variante="exito" icono="checkmark-done" onPress={() => establecerAbierto(true)}>Finalizar reclamo</Boton>;
  }
  return (
    <Tarjeta>
      <Text style={estilos.tituloFormulario}>Finalizar reclamo</Text>
      <Campo etiqueta="Trabajo realizado" placeholder="Qué se hizo y cómo quedó el servicio" multiline
        value={comentario} onChangeText={establecerComentario} editable={!guardando} />
      <Text style={estilos.etiqueta}>Fotos del trabajo terminado</Text>
      <SelectorFotos fotos={fotos} alCambiar={establecerFotos} maximo={Math.max(lugaresLibres, 1)} deshabilitado={guardando} />
      <Aviso>{error}</Aviso>
      <Boton variante="exito" icono="checkmark-done" onPress={finalizar} cargando={guardando}>Confirmar y finalizar</Boton>
      <Boton variante="secundario" onPress={() => establecerAbierto(false)} deshabilitado={guardando}>Cancelar</Boton>
    </Tarjeta>
  );
}

// El detalle en una ventana completa (desde la lista de Mis asignaciones).
export function ModalReclamo({ reclamo, tieneReclamoEnProgreso, cerrar, alIniciar, alFinalizar }) {
  return (
    <Modal visible={Boolean(reclamo)} animationType="slide" onRequestClose={cerrar}>
      <SafeAreaView style={estilos.modal} edges={['top', 'bottom']}>
        <View style={estilos.barra}>
          <Text style={estilos.tituloBarra}>Detalle del reclamo</Text>
          <Pressable onPress={cerrar} accessibilityRole="button" accessibilityLabel="Cerrar" hitSlop={10}>
            <Ionicons name="close" size={26} color={colores.texto} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
          {reclamo ? (
            <DetalleReclamo
              reclamo={reclamo}
              tieneReclamoEnProgreso={tieneReclamoEnProgreso}
              alIniciar={alIniciar}
              alFinalizar={alFinalizar}
            />
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const estilos = StyleSheet.create({
  encabezado: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  tipo: { fontSize: 18, fontWeight: '800', color: colores.texto },
  numero: { fontSize: 13, color: colores.textoSecundario },
  fila: { flexDirection: 'row', gap: 12 },
  etiqueta: { fontSize: 12, fontWeight: '700', color: colores.textoSecundario, textTransform: 'uppercase' },
  enlace: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  textoEnlace: { flex: 1, color: colores.texto, fontSize: 15 },
  accion: { color: colores.primario, fontWeight: '700' },
  tituloFormulario: { fontSize: 16, fontWeight: '800', color: colores.texto },
  conexion: { gap: 8, paddingTop: 4, borderTopWidth: 1, borderTopColor: colores.borde },
  modal: { flex: 1, backgroundColor: colores.fondo },
  barra: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colores.borde, backgroundColor: colores.superficie },
  tituloBarra: { fontSize: 17, fontWeight: '800', color: colores.texto },
});
