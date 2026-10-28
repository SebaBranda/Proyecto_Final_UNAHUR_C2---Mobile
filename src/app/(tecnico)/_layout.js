import { Pressable, Text } from 'react-native';
import { Tabs } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSesion } from '../../context/SesionContext.js';
import { colores } from '../../theme/colores.js';

// Pestañas del técnico: las mismas secciones que su menú en la web.
const pestanas = [
  { name: 'index', title: 'Mis asignaciones', icono: 'clipboard-outline' },
  { name: 'servicio-en-curso', title: 'En curso', icono: 'construct-outline' },
  { name: 'vehiculo', title: 'Vehículo', icono: 'car-outline' },
  { name: 'resumen', title: 'Jornada', icono: 'time-outline' },
];

export default function LayoutTecnico() {
  const { cerrarSesion } = useSesion();

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colores.primario },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '800' },
        tabBarActiveTintColor: colores.primarioOscuro,
        headerRight: () => (
          <Pressable onPress={cerrarSesion} style={{ marginRight: 16 }} accessibilityRole="button">
            <Text style={{ color: '#fff', fontWeight: '700' }}>Salir</Text>
          </Pressable>
        ),
      }}
    >
      {pestanas.map(({ name, title, icono }) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title,
            tabBarIcon: ({ color, size }) => <Ionicons name={icono} size={size} color={color} />,
          }}
        />
      ))}
    </Tabs>
  );
}
