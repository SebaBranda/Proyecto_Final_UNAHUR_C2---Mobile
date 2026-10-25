import { StyleSheet, View } from 'react-native';
import TarjetaSesion from '../../components/TarjetaSesion.js';
import { colores } from '../../theme/colores.js';

// Mis asignaciones (GET /reclamos): por ahora solo el saludo con los datos del login.
export default function MisAsignaciones() {
  return (
    <View style={estilos.contenedor}>
      <TarjetaSesion />
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: colores.fondo, padding: 16 },
});
