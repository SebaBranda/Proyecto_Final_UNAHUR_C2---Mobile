import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSesion } from '../context/SesionContext.js';
import { colores } from '../theme/colores.js';

export default function Login() {
  const { iniciarSesion } = useSesion();
  const [usuario, establecerUsuario] = useState('');
  const [contrasena, establecerContrasena] = useState('');
  const [error, establecerError] = useState('');
  const [ingresando, establecerIngresando] = useState(false);

  // Si el login sale bien, las rutas protegidas del layout raíz llevan a las pantallas del técnico.
  const ingresar = async () => {
    if (!usuario.trim() || !contrasena) {
      establecerError('Completá el usuario y la contraseña.');
      return;
    }
    establecerError('');
    establecerIngresando(true);
    try {
      await iniciarSesion(usuario, contrasena);
    } catch (causa) {
      establecerError(causa.message);
      establecerIngresando(false);
    }
  };

  return (
    <KeyboardAvoidingView style={estilos.contenedor} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={estilos.tarjeta}>
        <Image source={require('../../assets/logo.png')} style={estilos.logo} resizeMode="contain" />
        <Text style={estilos.titulo}>GalacticApp</Text>
        <Text style={estilos.subtitulo}>Ingresá con tu usuario de técnico</Text>

        <TextInput
          style={estilos.campo}
          placeholder="Usuario"
          autoCapitalize="none"
          autoCorrect={false}
          value={usuario}
          onChangeText={establecerUsuario}
          editable={!ingresando}
          accessibilityLabel="Usuario"
        />
        <TextInput
          style={estilos.campo}
          placeholder="Contraseña"
          secureTextEntry
          value={contrasena}
          onChangeText={establecerContrasena}
          onSubmitEditing={ingresar}
          editable={!ingresando}
          accessibilityLabel="Contraseña"
        />
        {error ? <Text style={estilos.error}>{error}</Text> : null}

        <Pressable
          style={({ pressed }) => [estilos.boton, (pressed || ingresando) && estilos.botonPresionado]}
          onPress={ingresar}
          disabled={ingresando}
          accessibilityRole="button"
        >
          {ingresando ? <ActivityIndicator color="#fff" /> : <Text style={estilos.textoBoton}>Ingresar</Text>}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const estilos = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: colores.fondo, justifyContent: 'center', padding: 24 },
  tarjeta: {
    backgroundColor: colores.superficie,
    borderRadius: 16,
    padding: 24,
    gap: 12,
    borderWidth: 1,
    borderColor: colores.borde,
  },
  logo: { width: 72, height: 72, alignSelf: 'center' },
  titulo: { fontSize: 26, fontWeight: '800', color: colores.texto, textAlign: 'center' },
  subtitulo: { fontSize: 14, color: colores.textoSecundario, textAlign: 'center', marginBottom: 8 },
  campo: {
    borderWidth: 1,
    borderColor: colores.borde,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colores.texto,
  },
  error: { color: colores.error, fontSize: 14 },
  boton: { backgroundColor: colores.primario, borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  botonPresionado: { opacity: 0.8 },
  textoBoton: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
