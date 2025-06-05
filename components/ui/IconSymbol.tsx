// This file is a fallback for using MaterialIcons on Android and web.

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolWeight } from 'expo-symbols';
import React from 'react';
import { OpaqueColorValue, StyleProp, TextStyle } from 'react-native';

// Add your SFSymbol to MaterialIcons mappings here.
const MAPPING = {
  // See MaterialIcons here: https://icons.expo.fyi
  // See SF Symbols in the SF Symbols app on Mac.  'house.fill': 'home',
  'paperplane.fill': 'send',
  'chevron.left.forwardslash.chevron.right': 'code',
  'chevron.right': 'chevron-right',
  'person.fill': 'person',
  'book.fill': 'book',
  //'plus.circle.fill': 'add-circle',
  'book-plus.fill': 'post-add',
  'doc.text.fill': 'article',
  'checklist.fill': 'checklist',
  'bell.fill': 'notifications',
  'bell.badge.fill': 'notifications-active',
  'gear.fill': 'settings',
} as const;

// Tipo personalizado que incluye tanto los nombres de SF Symbols como nuestros nombres personalizados
export type IconSymbolName = keyof typeof MAPPING | import('expo-symbols').SymbolViewProps['name'];

/**
 * An icon component that uses native SFSymbols on iOS, and MaterialIcons on Android and web. This ensures a consistent look across platforms, and optimal resource usage.
 *
 * Icon `name`s are based on SFSymbols and require manual mapping to MaterialIcons.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  // Solo usar el mapeo si el nombre está en nuestro objeto MAPPING
  const iconName = (name in MAPPING) 
    ? MAPPING[name as keyof typeof MAPPING] 
    : 'help-outline'; // Icono de fallback si no encontramos el nombre

  return <MaterialIcons color={color} size={size} name={iconName} style={style} />;
}
