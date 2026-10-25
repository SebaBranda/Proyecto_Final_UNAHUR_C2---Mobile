import { StyleSheet, View } from 'react-native';
import { colores } from '../../theme/colores.js';

// Servicio en curso (GET /reclamos?estado=En progreso): pantalla en blanco para completar.
export default function ServicioEnCurso() {
  return <View style={estilos.contenedor} />;
}

const estilos = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: colores.fondo, padding: 16 },
});
