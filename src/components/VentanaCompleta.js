import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colores } from '../theme/colores.js';

const esIos = Platform.OS === 'ios';

// Pantalla que se abre encima de la app (detalle de un reclamo, inicio y cierre de jornada), con
// una barra con el título y un botón grande para cerrar.
// - En iPhone se abre como una hoja: se cierra deslizándola hacia abajo y no queda pegada a la
//   parte de arriba de la pantalla, así el botón de cerrar se alcanza fácil.
// - En Android ocupa toda la pantalla y se cierra también con el botón "atrás" del teléfono.
// bloqueada: mientras se guarda, no se puede cerrar.
export default function VentanaCompleta({ visible, titulo, cerrar, bloqueada = false, children }) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={esIos ? 'pageSheet' : 'fullScreen'}
      onRequestClose={bloqueada ? undefined : cerrar}
    >
      {/* La hoja de iPhone ya empieza debajo de la barra de estado: solo se deja el margen de abajo. */}
      <SafeAreaView style={estilos.ventana} edges={esIos ? ['bottom'] : ['top', 'bottom']}>
        <View style={estilos.barra}>
          <Text style={estilos.titulo} numberOfLines={1}>{titulo}</Text>
          <Pressable
            onPress={cerrar}
            disabled={bloqueada}
            accessibilityRole="button"
            accessibilityLabel="Cerrar"
            hitSlop={12}
            style={({ pressed }) => [estilos.cerrar, pressed && estilos.cerrarPresionado, bloqueada && estilos.cerrarBloqueado]}
          >
            <Ionicons name="close" size={24} color={colores.texto} />
          </Pressable>
        </View>
        {children}
      </SafeAreaView>
    </Modal>
  );
}

const estilos = StyleSheet.create({
  ventana: { flex: 1, backgroundColor: colores.fondo },
  barra: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingLeft: 16,
    paddingRight: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colores.borde,
    backgroundColor: colores.superficie,
  },
  titulo: { flex: 1, fontSize: 17, fontWeight: '800', color: colores.texto },
  // 44 x 44 es el tamaño mínimo cómodo para tocar con el dedo.
  cerrar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: colores.fondo },
  cerrarPresionado: { backgroundColor: colores.borde },
  cerrarBloqueado: { opacity: 0.4 },
});
