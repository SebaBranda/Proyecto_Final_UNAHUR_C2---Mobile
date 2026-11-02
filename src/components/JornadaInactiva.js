import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import TarjetaSesion from './TarjetaSesion.js';
import { Aviso, Boton, Tarjeta } from './ui.js';
import { useSesion } from '../context/SesionContext.js';
import { reclamosApi } from '../services/api.js';
import { colores } from '../theme/colores.js';

const plural = (cantidad, singular, varios) => `${cantidad} ${cantidad === 1 ? singular : varios}`;

// Sin jornada activa el técnico no ve sus reclamos: solo cuántos tiene pendientes (el backend no
// le devuelve datos de clientes) y el botón para iniciar la jornada, que desbloquea todo.
export default function JornadaInactiva() {
  const { iniciarJornada } = useSesion();
  const [resumen, establecerResumen] = useState(null);
  const [actualizando, establecerActualizando] = useState(false);
  const [iniciando, establecerIniciando] = useState(false);
  const [error, establecerError] = useState('');
  const pendientes = (resumen?.asignados || 0) + (resumen?.enProgreso || 0);

  const cargar = useCallback(async () => {
    try {
      establecerResumen(await reclamosApi.resumen());
    } catch {
      establecerResumen(null);
    } finally {
      establecerActualizando(false);
    }
  }, []);

  // Se recarga cada vez que se entra a la pestaña.
  useFocusEffect(useCallback(() => {
    cargar();
  }, [cargar]));

  const iniciar = async () => {
    establecerError('');
    establecerIniciando(true);
    try {
      // Al quedar activa, la pantalla se reemplaza por la lista de reclamos.
      await iniciarJornada();
    } catch (causa) {
      establecerError(causa.response?.data?.mensaje || 'No se pudo iniciar la jornada.');
      establecerIniciando(false);
    }
  };

  return (
    <ScrollView
      style={estilos.contenedor}
      contentContainerStyle={estilos.contenido}
      refreshControl={(
        <RefreshControl refreshing={actualizando} onRefresh={() => { establecerActualizando(true); cargar(); }} colors={[colores.primario]} />
      )}
    >
      <TarjetaSesion />
      <Tarjeta style={estilos.tarjeta}>
        <View style={estilos.icono}>
          <Ionicons name="lock-closed-outline" size={32} color={colores.advertencia} />
        </View>
        <Text style={estilos.titulo}>Tu jornada no está activa</Text>
        <Text style={estilos.texto}>
          {resumen && !pendientes
            ? 'No tenés reclamos pendientes. Iniciá tu jornada cuando empieces a trabajar.'
            : 'Iniciá tu jornada para ver el detalle de tus reclamos y trabajar en ellos.'}
        </Text>
        {pendientes > 0 ? (
          <View style={estilos.contadores}>
            <Contador color={colores.info} texto={plural(resumen.asignados, 'asignado', 'asignados')} />
            {resumen.enProgreso > 0 ? <Contador color={colores.secundario} texto={`${resumen.enProgreso} en curso`} /> : null}
            {resumen.urgentes > 0 ? <Contador color={colores.error} texto={plural(resumen.urgentes, 'urgente', 'urgentes')} /> : null}
          </View>
        ) : null}
        <Aviso>{error}</Aviso>
        <View style={{ alignSelf: 'stretch' }}>
          <Boton icono="play" onPress={iniciar} cargando={iniciando}>Iniciar jornada</Boton>
        </View>
      </Tarjeta>
    </ScrollView>
  );
}

function Contador({ color, texto }) {
  return (
    <View style={[estilos.contador, { borderColor: color, backgroundColor: `${color}1A` }]}>
      <Text style={[estilos.textoContador, { color }]}>{texto}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: colores.fondo },
  contenido: { padding: 16, gap: 12, flexGrow: 1, paddingBottom: 32 },
  tarjeta: { alignItems: 'center', borderTopWidth: 4, borderTopColor: colores.advertencia, paddingVertical: 24 },
  icono: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: `${colores.advertencia}1A`,
    alignItems: 'center', justifyContent: 'center',
  },
  titulo: { fontSize: 18, fontWeight: '800', color: colores.texto, textAlign: 'center' },
  texto: { fontSize: 15, color: colores.textoSecundario, textAlign: 'center' },
  contadores: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  contador: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5 },
  textoContador: { fontSize: 14, fontWeight: '700' },
});
