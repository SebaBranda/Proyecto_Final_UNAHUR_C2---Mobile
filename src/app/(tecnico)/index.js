import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import TarjetaSesion from '../../components/TarjetaSesion.js';
import { ModalReclamo } from '../../components/DetalleReclamo.js';
import { ChipEstado, EstadoPantalla } from '../../components/ui.js';
import { reclamosApi } from '../../services/api.js';
import { formatearFecha } from '../../utils/formato.js';
import { colores } from '../../theme/colores.js';

const ESTADOS = ['Todos', 'Asignado', 'En progreso', 'Finalizado', 'Bloqueado'];
const POR_PAGINA = 20;

// Mis asignaciones: sus reclamos filtrados por estado, de a 20 (se cargan más al llegar al final).
// Al tocar uno se abre el detalle; si está en progreso, se puede finalizar desde ahí.
export default function MisAsignaciones() {
  const [estado, establecerEstado] = useState('Todos');
  const [reclamos, establecerReclamos] = useState([]);
  const [paginacion, establecerPaginacion] = useState(null);
  const [totales, establecerTotales] = useState({});
  const [cargando, establecerCargando] = useState(true);
  const [cargandoMas, establecerCargandoMas] = useState(false);
  const [actualizando, establecerActualizando] = useState(false);
  const [error, establecerError] = useState('');
  const [elegido, establecerElegido] = useState(null);
  // Solo vale la respuesta del último pedido (si se cambia de filtro rápido).
  const ultimoPedido = useRef(0);

  const cargar = useCallback(async (pagina = 1, modo = 'inicial') => {
    const pedido = ++ultimoPedido.current;
    if (modo === 'mas') establecerCargandoMas(true);
    if (modo === 'actualizar') establecerActualizando(true);
    try {
      const respuesta = await reclamosApi.pagina({ estado, pagina, limite: POR_PAGINA });
      if (pedido !== ultimoPedido.current) return;
      establecerReclamos((actuales) => (pagina === 1 ? respuesta.datos : [...actuales, ...respuesta.datos]));
      establecerPaginacion(respuesta.paginacion);
      establecerTotales(respuesta.totalesPorEstado || {});
      establecerError('');
    } catch (causa) {
      if (pedido !== ultimoPedido.current) return;
      establecerError(causa.response?.data?.mensaje || 'No se pudieron cargar tus asignaciones. Intentá nuevamente.');
    } finally {
      if (pedido === ultimoPedido.current) {
        establecerCargando(false);
        establecerCargandoMas(false);
        establecerActualizando(false);
      }
    }
  }, [estado]);

  // Se recarga al entrar a la pestaña y al cambiar el filtro.
  useFocusEffect(useCallback(() => {
    cargar(1);
  }, [cargar]));

  const cambiarEstado = (nuevo) => {
    if (nuevo === estado) return;
    establecerCargando(true);
    establecerReclamos([]);
    establecerEstado(nuevo);
  };

  const cargarMas = () => {
    if (cargando || cargandoMas || !paginacion?.tieneSiguiente) return;
    cargar(paginacion.pagina + 1, 'mas');
  };

  const total = Object.values(totales).reduce((suma, cantidad) => suma + cantidad, 0);

  return (
    <View style={estilos.contenedor}>
      <FlatList
        data={cargando || error ? [] : reclamos}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => <TarjetaReclamo reclamo={item} alTocar={() => establecerElegido(item)} />}
        contentContainerStyle={estilos.lista}
        refreshing={actualizando}
        onRefresh={() => cargar(1, 'actualizar')}
        onEndReached={cargarMas}
        onEndReachedThreshold={0.4}
        ListHeaderComponent={(
          <View style={{ gap: 12 }}>
            <TarjetaSesion />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={estilos.filtros}>
              {ESTADOS.map((opcion) => {
                const elegida = opcion === estado;
                const cantidad = opcion === 'Todos' ? total : totales[opcion] || 0;
                return (
                  <Pressable key={opcion} onPress={() => cambiarEstado(opcion)} accessibilityRole="button"
                    accessibilityState={{ selected: elegida }} style={[estilos.filtro, elegida && estilos.filtroElegido]}>
                    <Text style={[estilos.textoFiltro, elegida && estilos.textoFiltroElegido]}>{opcion} · {cantidad}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        )}
        ListEmptyComponent={(
          <EstadoPantalla
            cargando={cargando}
            error={error}
            vacio={cargando ? '' : `No tenés reclamos${estado === 'Todos' ? '' : ` en estado "${estado}"`}.`}
            alReintentar={() => { establecerCargando(true); cargar(1); }}
          />
        )}
        ListFooterComponent={cargandoMas ? <ActivityIndicator color={colores.primario} style={{ margin: 12 }} /> : null}
      />
      <ModalReclamo
        reclamo={elegido}
        cerrar={() => establecerElegido(null)}
        alFinalizar={() => { establecerElegido(null); cargar(1); }}
      />
    </View>
  );
}

function TarjetaReclamo({ reclamo, alTocar }) {
  return (
    <Pressable onPress={alTocar} accessibilityRole="button" style={({ pressed }) => [estilos.tarjeta, pressed && { opacity: 0.7 }]}>
      <View style={estilos.encabezado}>
        <View style={{ flex: 1 }}>
          <Text style={estilos.tipo}>{reclamo.tipo || 'Reclamo de servicio'}</Text>
          <Text style={estilos.secundario}>#{reclamo.id} · {reclamo.cliente?.nombre || 'Sin cliente'}</Text>
        </View>
        <ChipEstado estado={reclamo.estado} />
      </View>
      {reclamo.cliente?.direccion ? (
        <View style={estilos.fila}>
          <Ionicons name="location-outline" size={15} color={colores.textoSecundario} />
          <Text style={estilos.secundario} numberOfLines={1}>{reclamo.cliente.direccion}</Text>
        </View>
      ) : null}
      <View style={estilos.fila}>
        <Ionicons name="calendar-outline" size={15} color={colores.textoSecundario} />
        <Text style={estilos.secundario}>{formatearFecha(reclamo.fechaProgramada)}</Text>
        {reclamo.prioridad && reclamo.prioridad !== 'Normal' ? (
          <Text style={[estilos.prioridad, reclamo.prioridad === 'Urgente' && { color: colores.error }]}>· {reclamo.prioridad}</Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: colores.fondo },
  lista: { padding: 16, gap: 12, flexGrow: 1 },
  filtros: { gap: 8 },
  filtro: { borderWidth: 1, borderColor: colores.borde, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: colores.superficie },
  filtroElegido: { backgroundColor: colores.primario, borderColor: colores.primario },
  textoFiltro: { color: colores.texto, fontWeight: '600' },
  textoFiltroElegido: { color: '#fff' },
  tarjeta: { backgroundColor: colores.superficie, borderRadius: 12, borderWidth: 1, borderColor: colores.borde, padding: 14, gap: 6 },
  encabezado: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  tipo: { color: colores.texto, fontWeight: '800', fontSize: 16 },
  secundario: { color: colores.textoSecundario, fontSize: 13, flexShrink: 1 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  prioridad: { color: colores.advertencia, fontSize: 13, fontWeight: '700' },
});
