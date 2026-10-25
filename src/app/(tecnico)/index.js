import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import TarjetaSesion from '../../components/TarjetaSesion.js';
import { reclamosApi } from '../../services/api.js';
import { colores } from '../../theme/colores.js';

export default function MisAsignaciones() {
  const [reclamos, establecerReclamos] = useState([]);
  const [cargando, establecerCargando] = useState(true);
  const [actualizando, establecerActualizando] = useState(false);
  const [error, establecerError] = useState('');

  const cargarReclamos = useCallback(async (esActualizacion = false, mostrarCarga = true) => {
    if (esActualizacion) establecerActualizando(true);
    else if (mostrarCarga) establecerCargando(true);
    if (mostrarCarga) establecerError('');

    try {
      establecerReclamos(await reclamosApi.listar());
    } catch (causa) {
      establecerError(
        causa.response?.data?.mensaje
          || 'No se pudieron cargar tus asignaciones. Intentá nuevamente.',
      );
    } finally {
      establecerCargando(false);
      establecerActualizando(false);
    }
  }, []);

  useEffect(() => {
    Promise.resolve().then(() => cargarReclamos(false, false));
  }, [cargarReclamos]);

  const renderReclamo = ({ item }) => (
    <View style={estilos.tarjetaReclamo}>
      <View style={estilos.encabezadoReclamo}>
        <Text style={estilos.idReclamo}>Reclamo #{item.id}</Text>
        <Text style={estilos.estado}>{item.estado || 'Sin estado'}</Text>
      </View>
      <Text style={estilos.tipo}>{item.tipo || 'Reclamo de servicio'}</Text>
      {item.descripcion ? <Text style={estilos.descripcion}>{item.descripcion}</Text> : null}
      <Text style={estilos.cliente}>
        Cliente: {item.cliente?.nombre || 'Sin cliente'}
      </Text>
      {item.ubicacion ? <Text style={estilos.detalle}>Ubicación: {item.ubicacion}</Text> : null}
      {item.fechaProgramada ? (
        <Text style={estilos.detalle}>
          Programado: {new Date(item.fechaProgramada).toLocaleDateString('es-AR')}
        </Text>
      ) : null}
    </View>
  );

  const contenidoLista = () => {
    if (cargando) {
      return (
        <View style={estilos.estadoPantalla}>
          <ActivityIndicator size="large" color={colores.primario} />
          <Text style={estilos.textoEstado}>Cargando tus asignaciones...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={estilos.estadoPantalla}>
          <Text style={estilos.textoError}>{error}</Text>
          <Pressable style={estilos.boton} onPress={() => cargarReclamos()}>
            <Text style={estilos.textoBoton}>Reintentar</Text>
          </Pressable>
        </View>
      );
    }

    return (
      <FlatList
        style={estilos.listaContenedor}
        data={reclamos}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderReclamo}
        contentContainerStyle={reclamos.length ? estilos.lista : estilos.listaVacia}
        refreshing={actualizando}
        onRefresh={() => cargarReclamos(true)}
        ListEmptyComponent={<Text style={estilos.textoEstado}>No tenés reclamos asignados.</Text>}
        showsVerticalScrollIndicator={false}
      />
    );
  };

  return (
    <View style={estilos.contenedor}>
      <TarjetaSesion />
      {contenidoLista()}
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: colores.fondo, padding: 16, gap: 16 },
  listaContenedor: { flex: 1 },
  lista: { gap: 12, paddingBottom: 16 },
  listaVacia: { flexGrow: 1, justifyContent: 'center', alignItems: 'center' },
  estadoPantalla: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  textoEstado: { color: colores.textoSecundario, fontSize: 15, textAlign: 'center' },
  textoError: { color: colores.error, fontSize: 15, textAlign: 'center' },
  boton: { backgroundColor: colores.primario, borderRadius: 10, paddingHorizontal: 18, paddingVertical: 11 },
  textoBoton: { color: '#fff', fontWeight: '700' },
  tarjetaReclamo: {
    backgroundColor: colores.superficie,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colores.borde,
    padding: 14,
    gap: 6,
  },
  encabezadoReclamo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  idReclamo: { color: colores.texto, fontWeight: '800', fontSize: 16 },
  estado: { color: colores.primarioOscuro, fontSize: 12, fontWeight: '700' },
  tipo: { color: colores.texto, fontSize: 15, fontWeight: '700' },
  descripcion: { color: colores.textoSecundario, fontSize: 14 },
  cliente: { color: colores.texto, fontSize: 14, marginTop: 4 },
  detalle: { color: colores.textoSecundario, fontSize: 13 },
});
