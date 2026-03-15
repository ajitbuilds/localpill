import React, { useEffect, useRef } from 'react';
import { Animated, StyleProp, ViewStyle } from 'react-native';
import Svg, { Path, Circle as SvgCircle } from 'react-native-svg';
import { ICON_PATHS, IconName } from './iconPaths';

export { IconName } from './iconPaths';

interface AppIconProps {
  /** Icon name from the icon library */
  name: IconName;
  /** Icon size in pixels (default 24) */
  size?: number;
  /** Icon color (default '#000') */
  color?: string;
  /** Stroke width for line icons (default 2) */
  strokeWidth?: number;
  /** Additional style */
  style?: StyleProp<ViewStyle>;
  /** If true, icon will fade in on mount */
  animated?: boolean;
}

/**
 * LocalPill custom SVG icon component.
 * Renders clean, professional line-style icons.
 */
export function AppIcon({
  name,
  size = 24,
  color = '#000',
  strokeWidth = 2,
  style,
  animated = false,
}: AppIconProps) {
  const fadeAnim = useRef(new Animated.Value(animated ? 0 : 1)).current;

  useEffect(() => {
    if (animated) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [animated, fadeAnim]);

  const iconDef = ICON_PATHS[name];
  if (!iconDef) {
    if (__DEV__) {
      console.warn(`[AppIcon] Unknown icon name: "${name}"`);
    }
    return null;
  }

  const viewBox = iconDef.viewBox || '0 0 24 24';

  const svgContent = (
    <Svg
      width={size}
      height={size}
      viewBox={viewBox}
      fill="none"
    >
      {/* Stroke-based paths */}
      {iconDef.paths?.map((d, i) => (
        <Path
          key={`s-${i}`}
          d={d}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      ))}

      {/* Fill-based paths (dots, circles, solid shapes) */}
      {iconDef.fills?.map((d, i) => (
        <Path
          key={`f-${i}`}
          d={d}
          fill={color}
          stroke="none"
        />
      ))}

      {/* For fully filled icons like logos */}
      {iconDef.isFilled && iconDef.fills?.map((d, i) => (
        <Path
          key={`ff-${i}`}
          d={d}
          fill={color}
          stroke="none"
        />
      ))}
    </Svg>
  );

  if (animated) {
    return (
      <Animated.View style={[{ opacity: fadeAnim }, style]}>
        {svgContent}
      </Animated.View>
    );
  }

  return style ? (
    <Animated.View style={style}>
      {svgContent}
    </Animated.View>
  ) : (
    svgContent
  );
}
