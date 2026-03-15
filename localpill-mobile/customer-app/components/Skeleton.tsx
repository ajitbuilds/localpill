import React, { useEffect, useState } from 'react';
import { View, StyleSheet, DimensionValue, LayoutChangeEvent } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

interface SkeletonProps {
  width?: DimensionValue;
  height?: DimensionValue;
  borderRadius?: number;
  style?: any;
}

export function Skeleton({ width = '100%', height = 20, borderRadius = 4, style }: SkeletonProps) {
  const [layoutWidth, setLayoutWidth] = useState(0);
  const animatedValue = useSharedValue(0);

  useEffect(() => {
    animatedValue.value = withRepeat(withTiming(1, { duration: 1200 }), -1, false);
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    const translateX = interpolate(
      animatedValue.value,
      [0, 1],
      [-layoutWidth, layoutWidth]
    );
    return {
      transform: [{ translateX }],
    };
  });

  return (
    <View 
      style={[{ width, height, borderRadius, overflow: 'hidden', backgroundColor: '#E1E9EE' }, style]}
      onLayout={(e: LayoutChangeEvent) => setLayoutWidth(e.nativeEvent.layout.width)}
    >
      {layoutWidth > 0 && (
        <Animated.View style={[StyleSheet.absoluteFill, animatedStyle]}>
          <LinearGradient
            colors={['transparent', 'rgba(255, 255, 255, 0.5)', 'transparent']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      )}
    </View>
  );
}

export default Skeleton;
