import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { elegirImagen } from '../utils/imagenes.js';
import { colores } from '../theme/colores.js';
import { Aviso, Boton } from './ui.js';

// Fotos para adjuntar: se sacan con la cámara o se eligen de la galería, ya comprimidas.
// fotos: data URLs elegidas. maximo: cuántas se pueden agregar.
export default function SelectorFotos({ fotos, alCambiar, maximo, deshabilitado = false }) {
  const [procesando, establecerProcesando] = useState(false);
  const [error, establecerError] = useState('');
  const completo = fotos.length >= maximo;

  const agregar = async (origen) => {
    establecerError('');
    establecerProcesando(true);
    try {
      const foto = await elegirImagen(origen);
      if (foto) alCambiar([...fotos, foto]);
    } catch (causa) {
      establecerError(causa.message || 'No se pudo cargar la foto.');
    } finally {
      establecerProcesando(false);
    }
  };

  return (
    <View style={{ gap: 10 }}>
      <View style={estilos.grilla}>
        {fotos.map((foto, indice) => (
          <View key={`${indice}-${foto.length}`} style={estilos.miniatura}>
            <Image source={{ uri: foto }} style={estilos.imagen} />
            {!deshabilitado ? (
              <Pressable
                style={estilos.quitar}
                onPress={() => alCambiar(fotos.filter((_, i) => i !== indice))}
                accessibilityRole="button"
                accessibilityLabel={`Quitar foto ${indice + 1}`}
                hitSlop={8}
              >
                <Ionicons name="close" size={16} color="#fff" />
              </Pressable>
            ) : null}
          </View>
        ))}
        {procesando ? (
          <View style={[estilos.miniatura, estilos.cargando]}>
            <ActivityIndicator color={colores.primario} />
          </View>
        ) : null}
      </View>
      <Text style={estilos.contador}>{fotos.length} de {maximo} fotos</Text>
      {!completo && !deshabilitado ? (
        <View style={estilos.botones}>
          <View style={{ flex: 1 }}>
            <Boton variante="secundario" icono="camera-outline" onPress={() => agregar('camara')} deshabilitado={procesando}>Cámara</Boton>
          </View>
          <View style={{ flex: 1 }}>
            <Boton variante="secundario" icono="images-outline" onPress={() => agregar('galeria')} deshabilitado={procesando}>Galería</Boton>
          </View>
        </View>
      ) : null}
      <Aviso>{error}</Aviso>
    </View>
  );
}

const estilos = StyleSheet.create({
  grilla: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  miniatura: { width: 76, height: 76, borderRadius: 8, overflow: 'hidden', backgroundColor: colores.borde },
  imagen: { width: '100%', height: '100%' },
  cargando: { justifyContent: 'center', alignItems: 'center' },
  quitar: { position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 12, padding: 2 },
  contador: { fontSize: 13, color: colores.textoSecundario },
  botones: { flexDirection: 'row', gap: 8 },
});
