import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import GaleriaImagenes from '../../components/GaleriaImagenes.js';
import { Dato, EstadoPantalla, Tarjeta, Titulo } from '../../components/ui.js';
import { useSesion } from '../../context/SesionContext.js';
import { vehiculosApi } from '../../services/api.js';
import { formatearFecha, formatearHora, formatearKm } from '../../utils/formato.js';
import { colores } from '../../theme/colores.js';

// Vehículo asignado: datos, seguro, service y el último control registrado.
export default function Vehiculo() {
  const { actualizarSesion } = useSesion();
  const [vehiculo, establecerVehiculo] = useState(null);
  const [cargando, establecerCargando] = useState(true);
  const [actualizando, establecerActualizando] = useState(false);
  const [error, establecerError] = useState('');

  const cargar = useCallback(async () => {
    try {
      const asignado = await vehiculosApi.asignado();
      establecerVehiculo(asignado);
      actualizarSesion({ vehiculo: asignado });
      establecerError('');
    } catch (causa) {
      establecerError(causa.response?.data?.mensaje || 'No se pudo cargar tu vehículo.');
    } finally {
      establecerCargando(false);
      establecerActualizando(false);
    }
  }, [actualizarSesion]);

  useFocusEffect(useCallback(() => {
    cargar();
  }, [cargar]));

  if (cargando || error || !vehiculo) {
    return (
      <View style={estilos.contenedor}>
        <EstadoPantalla
          cargando={cargando}
          error={error}
          vacio={cargando ? '' : 'No tenés un vehículo asignado. Consultá con tu coordinador.'}
          alReintentar={() => { establecerCargando(true); cargar(); }}
        />
      </View>
    );
  }

  const enServicio = vehiculo.enServicio !== false;
  const seguro = vehiculo.seguro || {};
  const seguroVencido = seguro.vence && new Date(`${seguro.vence}T23:59:59`) < new Date();
  const control = vehiculo.ultimoControl || vehiculo.controles?.at(-1);

  return (
    <ScrollView
      style={estilos.contenedor}
      contentContainerStyle={estilos.contenido}
      refreshControl={<RefreshControl refreshing={actualizando} onRefresh={() => { establecerActualizando(true); cargar(); }} colors={[colores.primario]} />}
    >
      <Tarjeta>
        <Titulo icono="car-outline" subtitulo={vehiculo.patente}>{vehiculo.modelo || vehiculo.marca || 'Vehículo'}</Titulo>
        <View style={[estilos.estado, { backgroundColor: enServicio ? `${colores.exito}1A` : `${colores.error}1A` }]}>
          <View style={[estilos.punto, { backgroundColor: enServicio ? colores.exito : colores.error }]} />
          <Text style={{ color: enServicio ? colores.exito : colores.error, fontWeight: '700' }}>
            {enServicio ? 'En servicio' : 'Fuera de servicio'}
          </Text>
        </View>
        <View style={estilos.fila}>
          <View style={{ flex: 1 }}><Dato etiqueta="Kilometraje actual">{formatearKm(vehiculo.kilometraje?.actual)}</Dato></View>
          <View style={{ flex: 1 }}><Dato etiqueta="Último service">{formatearFecha(vehiculo.ultimoService)}</Dato></View>
        </View>
        {vehiculo.detalle ? <Dato etiqueta="Detalle">{vehiculo.detalle}</Dato> : null}
      </Tarjeta>

      <Tarjeta>
        <Titulo icono="shield-checkmark-outline">Seguro</Titulo>
        <Dato etiqueta="Compañía">{seguro.compania || 'Sin dato'}</Dato>
        <View style={estilos.fila}>
          <View style={{ flex: 1 }}><Dato etiqueta="Póliza">{seguro.poliza || 'Sin dato'}</Dato></View>
          <View style={{ flex: 1 }}>
            <Dato etiqueta="Vencimiento">{formatearFecha(seguro.vence)}</Dato>
            {seguroVencido ? <Text style={estilos.vencido}>Vencido</Text> : null}
          </View>
        </View>
      </Tarjeta>

      <Tarjeta>
        <Titulo icono="clipboard-outline">Último control</Titulo>
        {control ? (
          <>
            <Text style={estilos.secundario}>
              {formatearFecha(control.fechaControl)} a las {formatearHora(control.fechaControl)}
            </Text>
            <View style={estilos.fila}>
              <View style={{ flex: 1 }}><Dato etiqueta="Kilometraje">{formatearKm(control.kilometraje)}</Dato></View>
              <View style={{ flex: 1 }}><Dato etiqueta="Litros">{control.litros ?? 'Sin dato'}</Dato></View>
            </View>
            {control.estado ? <Dato etiqueta="Estado informado">{control.estado}</Dato> : null}
            {control.observaciones ? <Dato etiqueta="Observaciones">{control.observaciones}</Dato> : null}
            {control.imagenes?.length ? <GaleriaImagenes ids={control.imagenes} /> : null}
          </>
        ) : (
          <Text style={estilos.secundario}>Todavía no hay controles registrados.</Text>
        )}
      </Tarjeta>
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: colores.fondo },
  contenido: { padding: 16, gap: 12, paddingBottom: 32 },
  fila: { flexDirection: 'row', gap: 12 },
  estado: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5 },
  punto: { width: 8, height: 8, borderRadius: 4 },
  secundario: { color: colores.textoSecundario, fontSize: 14 },
  vencido: { color: colores.error, fontWeight: '700', fontSize: 13 },
});
