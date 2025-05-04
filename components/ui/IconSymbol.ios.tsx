import { SymbolView, SymbolViewProps, SymbolWeight } from 'expo-symbols';
import { StyleProp, ViewStyle } from 'react-native';

// Mapeo de nombres personalizados a SF Symbols válidos
const CUSTOM_MAPPING: Record<string, SymbolViewProps['name']> = {
  'book-plus.fill': 'doc.badge.plus', // Mapeamos nuestro nombre personalizado a un SF Symbol válido
};

// Extendemos el tipo de los nombres de símbolos para incluir nuestros personalizados
type CustomSymbolName = SymbolViewProps['name'] | keyof typeof CUSTOM_MAPPING;

export function IconSymbol({
  name,
  size = 24,
  color,
  style,
  weight = 'regular',
}: {
  name: CustomSymbolName;
  size?: number;
  color: string;
  style?: StyleProp<ViewStyle>;
  weight?: SymbolWeight;
}) {
  // Convertir el nombre personalizado a un SF Symbol válido si existe en el mapeo
  const sfSymbolName = (CUSTOM_MAPPING[name as keyof typeof CUSTOM_MAPPING] || name) as SymbolViewProps['name'];
  
  return (
    <SymbolView
      weight={weight}
      tintColor={color}
      resizeMode="scaleAspectFit"
      name={sfSymbolName}
      style={[
        {
          width: size,
          height: size,
        },
        style,
      ]}
    />
  );
}
