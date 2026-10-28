import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { imagenesApi } from '../services/api.js';
import { colores } from '../theme/colores.js';

// Muestra las imágenes guardadas de un registro (por sus ids). Al tocar una, se ve grande.
export default function GaleriaImagenes({ ids = [] }) {
  const [imagenes, establecerImagenes] = useState(null);
  const [error, establecerError] = useState('');
  const [abierta, establecerAbierta] = useState(null);
  const clave = ids.join(',');

  useEffect(() => {
    if (!clave) return undefined;
    let cancelado = false;
    imagenesApi.obtener(clave.split(','))
      .then((lista) => { if (!cancelado) establecerImagenes(lista); })
      .catch(() => { if (!cancelado) establecerError('No se pudieron cargar las imágenes.'); });
    return () => { cancelado = true; };
  }, [clave]);

  if (!clave) return null;
  if (error) return <Text style={estilos.error}>{error}</Text>;
  if (!imagenes) return <ActivityIndicator color={colores.primario} style={{ alignSelf: 'flex-start' }} />;

  return (
    <>
      <View style={estilos.grilla}>
        {imagenes.map((imagen, indice) => (
          <Pressable key={imagen.id} onPress={() => establecerAbierta(imagen.url)} accessibilityRole="imagebutton" accessibilityLabel={`Ver imagen ${indice + 1}`}>
            <Image source={{ uri: imagen.url }} style={estilos.miniatura} />
          </Pressable>
        ))}
      </View>
      <Modal visible={Boolean(abierta)} transparent animationType="fade" onRequestClose={() => establecerAbierta(null)}>
        <Pressable style={estilos.fondo} onPress={() => establecerAbierta(null)} accessibilityLabel="Cerrar imagen">
          {abierta ? <Image source={{ uri: abierta }} style={estilos.grande} resizeMode="contain" /> : null}
          <Ionicons name="close-circle" size={36} color="#fff" style={estilos.cerrar} />
        </Pressable>
      </Modal>
    </>
  );
}

const estilos = StyleSheet.create({
  grilla: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  miniatura: { width: 76, height: 76, borderRadius: 8, backgroundColor: colores.borde },
  error: { color: colores.error, fontSize: 13 },
  fondo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
  grande: { width: '100%', height: '80%' },
  cerrar: { position: 'absolute', top: 48, right: 20 },
});
