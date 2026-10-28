import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { jornadasApi, vehiculosApi } from '../services/api.js';
import { subirImagenes } from '../utils/imagenes.js';
import { formatearKm } from '../utils/formato.js';
import { colores } from '../theme/colores.js';
import SelectorFotos from './SelectorFotos.js';
import { Aviso, Boton, Campo, Opciones } from './ui.js';

// El backend pide exactamente 4 fotos del vehículo y del tablero para cerrar la jornada.
const FOTOS_REQUERIDAS = 4;
const ESTADOS_VEHICULO = [
  { valor: 'Activo', etiqueta: 'Activo' },
  { valor: 'Fuera de servicio', etiqueta: 'Fuera de servicio' },
];
const aNumero = (texto) => Number(String(texto).replace(',', '.'));

// Control final de la jornada (igual que en la web): kilometraje, litros, estado del vehículo,
// observaciones y 4 fotos. Registra el control del vehículo y después finaliza la jornada.
// alFinalizar({ jornada, vehiculo }) se llama cuando sale bien.
export default function CierreJornada({ abierto, jornada, vehiculo, cerrar, alFinalizar }) {
  const kilometrajeMinimo = Number(vehiculo?.kilometraje?.actual) || 0;
  const [kilometraje, establecerKilometraje] = useState('');
  const [litros, establecerLitros] = useState('');
  const [estado, establecerEstado] = useState('Activo');
  const [observaciones, establecerObservaciones] = useState('');
  const [fotos, establecerFotos] = useState([]);
  const [guardando, establecerGuardando] = useState(false);
  const [error, establecerError] = useState('');

  const validar = () => {
    const km = aNumero(kilometraje);
    if (kilometraje === '' || !Number.isFinite(km)) return 'Completá el kilometraje del tablero.';
    if (km < kilometrajeMinimo) return `El kilometraje no puede ser menor a ${formatearKm(kilometrajeMinimo)}.`;
    const combustible = aNumero(litros);
    if (litros === '' || !Number.isFinite(combustible) || combustible < 0) return 'Completá los litros de nafta.';
    if (fotos.length !== FOTOS_REQUERIDAS) return `Agregá las ${FOTOS_REQUERIDAS} fotos del vehículo y del tablero.`;
    return '';
  };

  const confirmar = async () => {
    const problema = vehiculo ? validar() : '';
    establecerError(problema);
    if (problema) return;
    establecerGuardando(true);
    try {
      // Sin vehículo asignado no hay control del vehículo: se cierra la jornada directamente.
      if (!vehiculo) {
        const finalizada = await jornadasApi.finalizar(jornada.id, observaciones.trim() ? { observaciones: observaciones.trim() } : {});
        alFinalizar({ jornada: finalizada, vehiculo: null });
        return;
      }
      const imagenes = await subirImagenes(fotos);
      const control = {
        kilometraje: aNumero(kilometraje),
        litros: aNumero(litros),
        estado,
        imagenes,
        ...(observaciones.trim() ? { observaciones: observaciones.trim() } : {}),
      };
      const vehiculoActualizado = await vehiculosApi.registrarControl(vehiculo.id, control);
      const finalizada = await jornadasApi.finalizar(jornada.id, control);
      alFinalizar({ jornada: finalizada, vehiculo: vehiculoActualizado });
    } catch (causa) {
      establecerError(causa.response?.data?.mensaje || 'No se pudo finalizar la jornada. Revisá la conexión e intentá de nuevo.');
      establecerGuardando(false);
    }
  };

  return (
    <Modal visible={abierto} animationType="slide" onRequestClose={guardando ? undefined : cerrar}>
      <SafeAreaView style={estilos.modal} edges={['top', 'bottom']}>
        <View style={estilos.barra}>
          <Text style={estilos.titulo}>{vehiculo ? 'Control final de jornada' : 'Finalizar jornada'}</Text>
          <Pressable onPress={cerrar} disabled={guardando} accessibilityRole="button" accessibilityLabel="Cerrar" hitSlop={10}>
            <Ionicons name="close" size={26} color={colores.texto} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={estilos.contenido} keyboardShouldPersistTaps="handled">
          {vehiculo ? (
            <>
              <Text style={estilos.ayuda}>Registrá el tablero y el estado del vehículo antes de cerrar la jornada.</Text>
              <Campo etiqueta="Kilometraje" keyboardType="numeric" value={kilometraje} onChangeText={establecerKilometraje}
                placeholder={String(kilometrajeMinimo)} ayuda={`Mínimo: ${formatearKm(kilometrajeMinimo)}`} editable={!guardando} />
              <Campo etiqueta="Litros de nafta" keyboardType="decimal-pad" value={litros} onChangeText={establecerLitros}
                placeholder="0" ayuda="Carga o lectura registrada" editable={!guardando} />
              <View style={{ gap: 6 }}>
                <Text style={estilos.etiqueta}>Estado del vehículo</Text>
                <Opciones opciones={ESTADOS_VEHICULO} valor={estado} alCambiar={establecerEstado} />
              </View>
            </>
          ) : (
            <Text style={estilos.ayuda}>No tenés un vehículo asignado, así que no hace falta el control del vehículo.</Text>
          )}
          <Campo etiqueta="Observaciones (opcional)" multiline value={observaciones} onChangeText={establecerObservaciones}
            placeholder={vehiculo ? 'Golpes, ruidos, faltantes...' : 'Algo para informar de la jornada'} editable={!guardando} />
          {vehiculo ? (
            <View style={{ gap: 6 }}>
              <Text style={estilos.etiqueta}>Fotos del vehículo y del tablero</Text>
              <SelectorFotos fotos={fotos} alCambiar={establecerFotos} maximo={FOTOS_REQUERIDAS} deshabilitado={guardando} />
            </View>
          ) : null}
          <Aviso>{error}</Aviso>
          <Boton icono="log-out-outline" onPress={confirmar} cargando={guardando}>Finalizar jornada</Boton>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const estilos = StyleSheet.create({
  modal: { flex: 1, backgroundColor: colores.fondo },
  barra: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colores.borde, backgroundColor: colores.superficie },
  titulo: { fontSize: 17, fontWeight: '800', color: colores.texto },
  contenido: { padding: 16, gap: 14, paddingBottom: 40 },
  ayuda: { color: colores.textoSecundario, fontSize: 14 },
  etiqueta: { fontSize: 12, fontWeight: '700', color: colores.textoSecundario, textTransform: 'uppercase' },
});
