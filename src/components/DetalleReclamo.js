import { useState } from 'react';
import { Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { reclamosApi } from '../services/api.js';
import { subirImagenes } from '../utils/imagenes.js';
import { formatearFecha } from '../utils/formato.js';
import { colores } from '../theme/colores.js';
import GaleriaImagenes from './GaleriaImagenes.js';
import SelectorFotos from './SelectorFotos.js';
import { Aviso, Boton, Campo, ChipEstado, Dato, Opciones, Tarjeta } from './ui.js';

const MAXIMO_IMAGENES_RECLAMO = 5;
const IMAGENES_CONTROL_INICIAL = 4;

// Detalle completo de un reclamo. Si está en progreso, permite finalizarlo con un comentario
// y fotos del trabajo terminado (igual que en la web). alFinalizar se llama cuando sale bien.
export function DetalleReclamo({
  reclamo, vehiculo, tieneReclamoEnProgreso, alIniciar, alFinalizar,
}) {
  const cliente = reclamo.cliente || {};
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
        {cliente.direccion ? (
          <Enlace icono="location-outline" texto={cliente.direccion} accion="Ver en Maps"
            url={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cliente.direccion)}`} />
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
          vehiculo={vehiculo}
          tieneReclamoEnProgreso={tieneReclamoEnProgreso}
          alIniciar={alIniciar}
        />
      ) : null}
    </View>
  );
}

function IniciarReclamo({ reclamo, vehiculo, tieneReclamoEnProgreso, alIniciar }) {
  const [abierto, establecerAbierto] = useState(false);
  const [kilometraje, establecerKilometraje] = useState('');
  const [litros, establecerLitros] = useState('');
  const [estadoVehiculo, establecerEstadoVehiculo] = useState('Activo');
  const [fotos, establecerFotos] = useState([]);
  const [guardando, establecerGuardando] = useState(false);
  const [error, establecerError] = useState('');
  const kilometrajeMinimo = Number(vehiculo?.kilometraje?.actual) || 0;
  const bloqueado = tieneReclamoEnProgreso || !vehiculo;

  const iniciar = async () => {
    const km = Number(kilometraje);
    const combustible = Number(litros);
    if (!kilometraje || km < kilometrajeMinimo) {
      establecerError(`El kilometraje debe ser igual o mayor a ${kilometrajeMinimo} km.`);
      return;
    }
    if (litros === '' || combustible < 0) {
      establecerError('Completá los litros registrados.');
      return;
    }
    if (fotos.length !== IMAGENES_CONTROL_INICIAL) {
      establecerError(`Adjuntá exactamente ${IMAGENES_CONTROL_INICIAL} imágenes del vehículo.`);
      return;
    }
    establecerError('');
    establecerGuardando(true);
    try {
      const imagenes = await subirImagenes(fotos);
      await reclamosApi.iniciar(reclamo.id, vehiculo.id, {
        kilometraje: km,
        litros: combustible,
        estado: estadoVehiculo,
        imagenes,
      });
      alIniciar?.();
    } catch (causa) {
      establecerError(causa.response?.data?.mensaje || 'No se pudo iniciar el reclamo. Revisá la conexión e intentá nuevamente.');
      establecerGuardando(false);
    }
  };

  if (!abierto) {
    return (
      <Tarjeta>
        <Boton
          icono="play"
          onPress={() => establecerAbierto(true)}
          deshabilitado={bloqueado}
        >
          {tieneReclamoEnProgreso ? 'Finalizá el reclamo en curso para comenzar' : 'Comenzar asignación'}
        </Boton>
        {!vehiculo ? <Aviso>No tenés un vehículo asignado para iniciar el reclamo.</Aviso> : null}
      </Tarjeta>
    );
  }

  return (
    <Tarjeta>
      <Text style={estilos.tituloFormulario}>Control inicial del servicio</Text>
      <Text style={estilos.secundario}>Registrá el tablero completo antes de continuar.</Text>
      <View style={estilos.fila}>
        <View style={{ flex: 1 }}>
          <Campo etiqueta="Kilometraje" keyboardType="numeric" value={kilometraje} onChangeText={establecerKilometraje}
            placeholder={`Mínimo: ${kilometrajeMinimo} km`} editable={!guardando} />
        </View>
        <View style={{ flex: 1 }}>
          <Campo etiqueta="Litros de nafta" keyboardType="decimal-pad" value={litros} onChangeText={establecerLitros}
            placeholder="Carga o lectura" editable={!guardando} />
        </View>
      </View>
      <Text style={estilos.etiqueta}>Estado del vehículo</Text>
      <Opciones
        opciones={[
          { valor: 'Activo', etiqueta: 'Activo' },
          { valor: 'Fuera de servicio', etiqueta: 'Fuera de servicio' },
        ]}
        valor={estadoVehiculo}
        alCambiar={establecerEstadoVehiculo}
      />
      <Text style={estilos.etiqueta}>Imágenes del vehículo y del tablero</Text>
      <SelectorFotos fotos={fotos} alCambiar={establecerFotos} maximo={IMAGENES_CONTROL_INICIAL} deshabilitado={guardando} />
      <Aviso>{error}</Aviso>
      <Boton icono="play" onPress={iniciar} cargando={guardando}>Guardar control y comenzar</Boton>
      <Boton variante="secundario" onPress={() => establecerAbierto(false)} deshabilitado={guardando}>Cancelar</Boton>
    </Tarjeta>
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
export function ModalReclamo({ reclamo, vehiculo, tieneReclamoEnProgreso, cerrar, alIniciar, alFinalizar }) {
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
              vehiculo={vehiculo}
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
  modal: { flex: 1, backgroundColor: colores.fondo },
  barra: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colores.borde, backgroundColor: colores.superficie },
  tituloBarra: { fontSize: 17, fontWeight: '800', color: colores.texto },
});
