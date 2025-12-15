import React from 'react';
import { TouchableOpacity, TouchableOpacityProps } from 'react-native';
import * as Haptics from 'expo-haptics';
import clsx from 'clsx';

interface IconButtonProps extends TouchableOpacityProps {
  active?: boolean;
  variant?: 'ghost' | 'glass' | 'solid';
}

export const IconButton = ({
  children,
  onPress,
  active = false,
  variant = 'ghost',
  className,
  ...props
}: IconButtonProps) => {
  
  const handlePress = (e: any) => {
    Haptics.selectionAsync();
    onPress?.(e);
  };

  const baseStyles = "items-center justify-center rounded-lg p-2";
  
  const variants = {
    ghost: "bg-transparent active:bg-white/10",
    glass: "bg-white/5 border border-white/10 active:bg-white/10",
    solid: "bg-emerald-500 active:bg-emerald-600",
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      className={clsx(
        baseStyles,
        variants[variant],
        active && "bg-emerald-500/20 border-emerald-500/50",
        className
      )}
      {...props}
    >
      {children}
    </TouchableOpacity>
  );
};
