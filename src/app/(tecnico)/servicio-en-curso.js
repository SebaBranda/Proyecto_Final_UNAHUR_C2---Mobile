import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { DetalleReclamo } from '../../components/DetalleReclamo.js';
import { Aviso, EstadoPantalla } from '../../components/ui.js';
import { reclamosApi } from '../../services/api.js';
import { colores } from '../../theme/colores.js';

// Servicio en curso: el reclamo en progreso, con todo su detalle y la opción de finalizarlo.
export default function ServicioEnCurso() {
  const [reclamo, establecerReclamo] = useState(null);
  const [cargando, establecerCargando] = useState(true);
  const [actualizando, establecerActualizando] = useState(false);
  const [error, establecerError] = useState('');
  const [finalizado, establecerFinalizado] = useState('');

  const cargar = useCallback(async () => {
    try {
      const [enCurso] = await reclamosApi.enCurso();
      establecerReclamo(enCurso ?? null);
      establecerError('');
    } catch (causa) {
      establecerError(causa.response?.data?.mensaje || 'No se pudo cargar el servicio en curso.');
    } finally {
      establecerCargando(false);
      establecerActualizando(false);
    }
  }, []);

  // Se recarga cada vez que se entra a la pestaña.
  useFocusEffect(useCallback(() => {
    cargar();
  }, [cargar]));

  const alFinalizar = (actualizado) => {
    establecerFinalizado(`Reclamo #${actualizado?.id ?? reclamo.id} finalizado.`);
    establecerReclamo(null);
    cargar();
  };

  if (cargando || (error && !reclamo)) {
    return (
      <View style={estilos.contenedor}>
        <EstadoPantalla cargando={cargando} error={error} alReintentar={() => { establecerCargando(true); cargar(); }} />
      </View>
    );
  }

  return (
    <ScrollView
      style={estilos.contenedor}
      contentContainerStyle={estilos.contenido}
      keyboardShouldPersistTaps="handled"
      refreshControl={(
        <RefreshControl refreshing={actualizando} onRefresh={() => { establecerActualizando(true); cargar(); }} colors={[colores.primario]} />
      )}
    >
      <Aviso tipo="exito">{finalizado}</Aviso>
      {reclamo ? (
        <DetalleReclamo key={reclamo.id} reclamo={reclamo} alFinalizar={alFinalizar} />
      ) : (
        <EstadoPantalla vacio="No tenés un servicio en curso. Cuando comiences una asignación, la vas a ver acá." />
      )}
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: colores.fondo },
  contenido: { padding: 16, gap: 12, flexGrow: 1, paddingBottom: 32 },
});
