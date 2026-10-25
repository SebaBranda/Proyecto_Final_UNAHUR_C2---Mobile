import { StyleSheet, View } from 'react-native';
import { colores } from '../../theme/colores.js';

// Vehículo (GET /vehiculos): pantalla en blanco para completar.
export default function Vehiculo() {
  return <View style={estilos.contenedor} />;
}

const estilos = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: colores.fondo, padding: 16 },
});
