import { StyleSheet, View } from 'react-native';
import { colores } from '../../theme/colores.js';

// Resumen de servicios (GET /jornadas): pantalla en blanco para completar.
export default function Resumen() {
  return <View style={estilos.contenedor} />;
}

const estilos = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: colores.fondo, padding: 16 },
});
