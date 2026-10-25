import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SesionProvider, useSesion } from '../context/SesionContext.js';

// Rutas protegidas: sin sesión solo se puede ver el login; con sesión, las pantallas del técnico.
// Al iniciar o cerrar sesión, Expo Router lleva solo a la pantalla que corresponde.
function Navegacion() {
  const { sesion } = useSesion();
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={Boolean(sesion)}>
        <Stack.Screen name="(tecnico)" />
      </Stack.Protected>
      <Stack.Protected guard={!sesion}>
        <Stack.Screen name="login" />
      </Stack.Protected>
    </Stack>
  );
}

export default function LayoutRaiz() {
  return (
    <SesionProvider>
      <StatusBar style="dark" />
      <Navegacion />
    </SesionProvider>
  );
}
