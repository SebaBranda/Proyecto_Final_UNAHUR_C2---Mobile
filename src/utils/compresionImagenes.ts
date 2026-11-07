import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

const MAXIMA_DIMENSION = 1200;
const CALIDAD_JPEG = 0.8;

export interface ImagenParaFormData {
  name: string;
  type: 'image/jpeg';
  uri: string;
}

interface Dimensiones {
  width: number;
  height: number;
}

let secuenciaArchivos = 0;

function obtenerDimensionesObjetivo({ width, height }: Dimensiones): Dimensiones {
  if (width <= 0 || height <= 0) {
    throw new Error('La imagen no tiene dimensiones válidas.');
  }

  const escala = Math.min(1, MAXIMA_DIMENSION / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * escala)),
    height: Math.max(1, Math.round(height * escala)),
  };
}

function crearNombreArchivo(): string {
  secuenciaArchivos += 1;
  return `imagen-${Date.now()}-${secuenciaArchivos}.jpg`;
}

/**
 * Convierte una imagen local (incluyendo HEIC y PNG) a un JPEG optimizado.
 * La salida se guarda en la caché nativa y queda lista para append() en FormData.
 */
export async function comprimirImagen(uriOriginal: string): Promise<ImagenParaFormData> {
  if (!uriOriginal.trim()) {
    throw new Error('La URI de la imagen es obligatoria.');
  }

  try {
    const imagenOriginal = await ImageManipulator.manipulate(uriOriginal).renderAsync();
    const dimensiones = obtenerDimensionesObjetivo(imagenOriginal);
    const imagenProcesada = ImageManipulator.manipulate(uriOriginal);

    imagenProcesada.resize(dimensiones);
    const imagenRenderizada = await imagenProcesada.renderAsync();
    const resultado = await imagenRenderizada.saveAsync({
      compress: CALIDAD_JPEG,
      format: SaveFormat.JPEG,
    });

    if (!resultado.uri) {
      throw new Error('El procesador no devolvió una URI de salida.');
    }

    return {
      name: crearNombreArchivo(),
      type: 'image/jpeg',
      uri: resultado.uri,
    };
  } catch (error) {
    const detalle = error instanceof Error ? ` ${error.message}` : '';
    throw new Error(`No se pudo comprimir la imagen.${detalle}`);
  }
}
