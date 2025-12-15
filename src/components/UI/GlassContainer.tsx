import clsx from 'clsx';
import { BlurView } from 'expo-blur';
import React from 'react';
import { View, ViewStyle } from 'react-native';

interface GlassContainerProps {
  children: React.ReactNode;
  intensity?: number;
  className?: string;
  style?: ViewStyle;
}

export const GlassContainer = ({ children, intensity = 40, className, style }: GlassContainerProps) => {
  return (
    <View
      className={clsx("overflow-hidden border border-white/10 rounded-2xl", className)}
      style={style}
    >
      <BlurView intensity={intensity} tint="dark" className="flex-1">
        {children}
      </BlurView>
    </View>
  );
};