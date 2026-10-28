import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { imagenesApi } from '../services/api.js';

// El backend acepta imágenes de hasta 600 KB: se achican y comprimen antes de subirlas.
const MAXIMO_BYTES = 600 * 1024;
const pruebas = [
  { ancho: 1280, calidad: 0.6 },
  { ancho: 1024, calidad: 0.45 },
  { ancho: 800, calidad: 0.35 },
];
const bytesDeBase64 = (base64) => Math.floor((base64.length * 3) / 4);

// anchoOriginal: ancho de la foto elegida; solo se achica (una imagen chica no se agranda).
async function comprimir(uri, anchoOriginal) {
  for (const { ancho, calidad } of pruebas) {
    const contexto = ImageManipulator.manipulate(uri);
    if (!anchoOriginal || anchoOriginal > ancho) contexto.resize({ width: ancho });
    const imagen = await contexto.renderAsync();
    const { base64 } = await imagen.saveAsync({ compress: calidad, format: SaveFormat.JPEG, base64: true });
    if (base64 && bytesDeBase64(base64) <= MAXIMO_BYTES) return `data:image/jpeg;base64,${base64}`;
  }
  throw new Error('La imagen es demasiado pesada. Probá con otra.');
}

// Saca una foto con la cámara u elige una de la galería. origen: 'camara' | 'galeria'.
// Devuelve un data URL listo para subir, o null si el técnico canceló.
export async function elegirImagen(origen) {
  const permiso = origen === 'camara'
    ? await ImagePicker.requestCameraPermissionsAsync()
    : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permiso.granted) {
    throw new Error(origen === 'camara'
      ? 'Habilitá el permiso de cámara para sacar la foto.'
      : 'Habilitá el permiso de fotos para elegir una imagen.');
  }
  const abrir = origen === 'camara' ? ImagePicker.launchCameraAsync : ImagePicker.launchImageLibraryAsync;
  const resultado = await abrir({ mediaTypes: ['images'], quality: 1 });
  if (resultado.canceled || !resultado.assets?.length) return null;
  return comprimir(resultado.assets[0].uri, resultado.assets[0].width);
}

// Sube las imágenes (data URLs) y devuelve sus ids, para guardarlos en el campo "imagenes".
export async function subirImagenes(dataUrls) {
  const subidas = await imagenesApi.subir(dataUrls);
  return subidas.map((imagen) => imagen.id);
}
