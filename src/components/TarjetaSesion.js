import { StyleSheet, Text, View } from 'react-native';
import { useSesion } from '../context/SesionContext.js';
import { colores } from '../theme/colores.js';

// Datos que llegan en el login: confirma que la app está conectada con la API.
export default function TarjetaSesion() {
  const { sesion } = useSesion();
  const { usuario, jornadaActiva, vehiculo } = sesion;
  const desde = jornadaActiva?.inicio
    ? new Date(jornadaActiva.inicio).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
    : '';

  return (
    <View style={estilos.tarjeta}>
      <Text style={estilos.saludo}>Hola, {usuario.nombre}</Text>
      <View style={estilos.fila}>
        <View style={[estilos.punto, { backgroundColor: jornadaActiva ? colores.exito : colores.borde }]} />
        <Text style={estilos.texto}>
          {jornadaActiva ? `Jornada activa desde las ${desde}` : 'Sin jornada activa'}
        </Text>
      </View>
      <Text style={estilos.texto}>
        {vehiculo ? `Vehículo: ${vehiculo.modelo || vehiculo.marca || ''} · ${vehiculo.patente}` : 'Sin vehículo asignado'}
      </Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  tarjeta: {
    backgroundColor: colores.superficie,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colores.borde,
    padding: 16,
    gap: 6,
  },
  saludo: { fontSize: 20, fontWeight: '800', color: colores.texto },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  punto: { width: 10, height: 10, borderRadius: 5 },
  texto: { fontSize: 14, color: colores.textoSecundario },
});
