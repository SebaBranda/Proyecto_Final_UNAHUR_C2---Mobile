import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colores } from '../theme/colores.js';

// Piezas visuales comunes a todas las pantallas del técnico.

export function Tarjeta({ children, style }) {
  return <View style={[estilos.tarjeta, style]}>{children}</View>;
}

export function Titulo({ icono, children, subtitulo }) {
  return (
    <View style={estilos.titulo}>
      {icono ? <Ionicons name={icono} size={26} color={colores.primario} /> : null}
      <View style={{ flex: 1 }}>
        <Text style={estilos.textoTitulo}>{children}</Text>
        {subtitulo ? <Text style={estilos.subtitulo}>{subtitulo}</Text> : null}
      </View>
    </View>
  );
}

// variante: 'primario' | 'secundario' | 'exito'
export function Boton({ children, onPress, icono, variante = 'primario', cargando = false, deshabilitado = false }) {
  const contorno = variante === 'secundario';
  const fondo = variante === 'exito' ? colores.exito : colores.primario;
  const colorTexto = contorno ? colores.primarioOscuro : '#fff';
  return (
    <Pressable
      onPress={onPress}
      disabled={deshabilitado || cargando}
      accessibilityRole="button"
      style={({ pressed }) => [
        estilos.boton,
        contorno ? estilos.botonContorno : { backgroundColor: fondo },
        (pressed || deshabilitado || cargando) && { opacity: 0.6 },
      ]}
    >
      {cargando ? <ActivityIndicator color={colorTexto} /> : (
        <>
          {icono ? <Ionicons name={icono} size={18} color={colorTexto} /> : null}
          <Text style={[estilos.textoBoton, { color: colorTexto }]}>{children}</Text>
        </>
      )}
    </Pressable>
  );
}

// Mismos colores de estado que la web (admin, coordinador y técnico).
const coloresEstado = {
  Abierto: colores.advertencia,
  Asignado: colores.info,
  'En progreso': colores.secundario,
  Finalizado: colores.exito,
  Bloqueado: colores.error,
};

export function ChipEstado({ estado }) {
  const color = coloresEstado[estado] || colores.primarioOscuro;
  return (
    <View style={[estilos.chip, { borderColor: color, backgroundColor: `${color}1A` }]}>
      <Text style={[estilos.textoChip, { color }]}>{estado || 'Sin estado'}</Text>
    </View>
  );
}

// Fila "Etiqueta: valor" de un detalle.
export function Dato({ etiqueta, children }) {
  return (
    <View style={estilos.dato}>
      <Text style={estilos.etiqueta}>{etiqueta}</Text>
      <Text style={estilos.valor}>{children}</Text>
    </View>
  );
}

export function Campo({ etiqueta, ayuda, ...props }) {
  return (
    <View style={{ gap: 4 }}>
      <Text style={estilos.etiqueta}>{etiqueta}</Text>
      <TextInput style={[estilos.campo, props.multiline && estilos.campoMultilinea]} placeholderTextColor={colores.textoSecundario} accessibilityLabel={etiqueta} {...props} />
      {ayuda ? <Text style={estilos.ayuda}>{ayuda}</Text> : null}
    </View>
  );
}

// Opciones de las que se elige una (por ejemplo, el estado del vehículo).
export function Opciones({ opciones, valor, alCambiar }) {
  return (
    <View style={estilos.opciones}>
      {opciones.map((opcion) => {
        const elegida = opcion.valor === valor;
        return (
          <Pressable
            key={opcion.valor}
            onPress={() => alCambiar(opcion.valor)}
            accessibilityRole="button"
            accessibilityState={{ selected: elegida }}
            style={[estilos.opcion, elegida && estilos.opcionElegida]}
          >
            <Text style={[estilos.textoOpcion, elegida && estilos.textoOpcionElegida]}>{opcion.etiqueta}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Aviso({ tipo = 'error', children }) {
  if (!children) return null;
  const color = { error: colores.error, exito: colores.exito, info: colores.primarioOscuro }[tipo];
  return (
    <View style={[estilos.aviso, { borderColor: color, backgroundColor: `${color}12` }]}>
      <Text style={{ color, fontSize: 14 }}>{children}</Text>
    </View>
  );
}

// Pantalla de carga, error (con reintentar) o vacía.
export function EstadoPantalla({ cargando, error, vacio, alReintentar }) {
  return (
    <View style={estilos.estadoPantalla}>
      {cargando ? <ActivityIndicator size="large" color={colores.primario} /> : null}
      {error ? <Text style={estilos.textoError}>{error}</Text> : null}
      {vacio && !error ? <Text style={estilos.textoVacio}>{vacio}</Text> : null}
      {error && alReintentar ? <Boton onPress={alReintentar} icono="refresh">Reintentar</Boton> : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  tarjeta: { backgroundColor: colores.superficie, borderRadius: 12, borderWidth: 1, borderColor: colores.borde, padding: 16, gap: 10 },
  titulo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  textoTitulo: { fontSize: 18, fontWeight: '800', color: colores.texto },
  subtitulo: { fontSize: 13, color: colores.textoSecundario },
  boton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 10, paddingVertical: 13, paddingHorizontal: 16 },
  botonContorno: { borderWidth: 1, borderColor: colores.primario, backgroundColor: colores.superficie },
  textoBoton: { fontSize: 15, fontWeight: '700' },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3, alignSelf: 'flex-start' },
  textoChip: { fontSize: 12, fontWeight: '700' },
  dato: { gap: 2 },
  etiqueta: { fontSize: 12, fontWeight: '700', color: colores.textoSecundario, textTransform: 'uppercase' },
  valor: { fontSize: 15, color: colores.texto },
  campo: { borderWidth: 1, borderColor: colores.borde, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, color: colores.texto, backgroundColor: colores.superficie },
  campoMultilinea: { minHeight: 90, textAlignVertical: 'top' },
  ayuda: { fontSize: 12, color: colores.textoSecundario },
  opciones: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  opcion: { borderWidth: 1, borderColor: colores.borde, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: colores.superficie },
  opcionElegida: { borderColor: colores.primario, backgroundColor: colores.primario },
  textoOpcion: { color: colores.texto, fontWeight: '600' },
  textoOpcionElegida: { color: '#fff' },
  aviso: { borderWidth: 1, borderRadius: 10, padding: 12 },
  estadoPantalla: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 24 },
  textoError: { color: colores.error, fontSize: 15, textAlign: 'center' },
  textoVacio: { color: colores.textoSecundario, fontSize: 15, textAlign: 'center' },
});
