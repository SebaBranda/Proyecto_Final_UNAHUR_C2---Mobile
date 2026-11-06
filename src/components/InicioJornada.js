import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSesion } from '../context/SesionContext.js';
import { subirImagenes } from '../utils/imagenes.js';
import { aNumero, formatearKm } from '../utils/formato.js';
import { colores } from '../theme/colores.js';
import SelectorFotos from './SelectorFotos.js';
import { Aviso, Boton, Campo, Opciones } from './ui.js';

// El backend pide exactamente 4 fotos del vehículo y del tablero para iniciar la jornada.
const FOTOS_REQUERIDAS = 4;
const ESTADOS_VEHICULO = [
  { valor: 'Activo', etiqueta: 'Activo' },
  { valor: 'Fuera de servicio', etiqueta: 'Fuera de servicio' },
];

// Control inicial de la jornada (solo si el técnico tiene vehículo): kilometraje, litros, estado y
// 4 fotos. Es el único control del día además del final: los reclamos se comienzan con un toque.
// El backend lo registra en la jornada y en el vehículo. alIniciar() se llama cuando sale bien.
export default function InicioJornada({ abierto, vehiculo, cerrar, alIniciar }) {
  const { iniciarJornada } = useSesion();
  const kilometrajeMinimo = Number(vehiculo?.kilometraje?.actual) || 0;
  const [kilometraje, establecerKilometraje] = useState('');
  const [litros, establecerLitros] = useState('');
  const [estado, establecerEstado] = useState('Activo');
  const [fotos, establecerFotos] = useState([]);
  const [guardando, establecerGuardando] = useState(false);
  const [error, establecerError] = useState('');

  const validar = () => {
    const km = aNumero(kilometraje);
    if (!Number.isFinite(km)) return 'Completá el kilometraje del tablero con un número.';
    if (km < kilometrajeMinimo) return `El kilometraje no puede ser menor a ${formatearKm(kilometrajeMinimo)}.`;
    const combustible = aNumero(litros);
    if (!Number.isFinite(combustible) || combustible < 0) return 'Completá los litros de nafta con un número.';
    if (fotos.length !== FOTOS_REQUERIDAS) return `Agregá las ${FOTOS_REQUERIDAS} fotos del vehículo y del tablero.`;
    return '';
  };

  const confirmar = async () => {
    const problema = validar();
    establecerError(problema);
    if (problema) return;
    establecerGuardando(true);
    try {
      const imagenes = await subirImagenes(fotos);
      await iniciarJornada({
        kilometraje: aNumero(kilometraje), litros: aNumero(litros), estado, imagenes,
      });
      alIniciar?.();
    } catch (causa) {
      establecerError(causa.response?.data?.mensaje || 'No se pudo iniciar la jornada. Revisá la conexión e intentá de nuevo.');
      establecerGuardando(false);
    }
  };

  return (
    <Modal visible={abierto} animationType="slide" onRequestClose={guardando ? undefined : cerrar}>
      <SafeAreaView style={estilos.modal} edges={['top', 'bottom']}>
        <View style={estilos.barra}>
          <Text style={estilos.titulo}>Control inicial de jornada</Text>
          <Pressable onPress={cerrar} disabled={guardando} accessibilityRole="button" accessibilityLabel="Cerrar" hitSlop={10}>
            <Ionicons name="close" size={26} color={colores.texto} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={estilos.contenido} keyboardShouldPersistTaps="handled">
          <Text style={estilos.ayuda}>
            Registrá el tablero y el estado del vehículo para empezar el día. Después, cada reclamo se comienza con un toque.
          </Text>
          <Campo etiqueta="Kilometraje" keyboardType="numeric" value={kilometraje} onChangeText={establecerKilometraje}
            placeholder={String(kilometrajeMinimo)} ayuda={`Mínimo: ${formatearKm(kilometrajeMinimo)}`} editable={!guardando} />
          <Campo etiqueta="Litros de nafta" keyboardType="decimal-pad" value={litros} onChangeText={establecerLitros}
            placeholder="0" ayuda="Lectura del tablero o carga del día" editable={!guardando} />
          <View style={{ gap: 6 }}>
            <Text style={estilos.etiqueta}>Estado del vehículo</Text>
            <Opciones opciones={ESTADOS_VEHICULO} valor={estado} alCambiar={establecerEstado} />
          </View>
          <View style={{ gap: 6 }}>
            <Text style={estilos.etiqueta}>Fotos del vehículo y del tablero</Text>
            <SelectorFotos fotos={fotos} alCambiar={establecerFotos} maximo={FOTOS_REQUERIDAS} deshabilitado={guardando} />
          </View>
          <Aviso>{error}</Aviso>
          <Boton icono="play" onPress={confirmar} cargando={guardando}>Iniciar jornada</Boton>
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
