import React from 'react';
import { Text, TextProps } from 'react-native';
import clsx from 'clsx';

interface ThemedTextProps extends TextProps {
  variant?: 'h1' | 'h2' | 'body' | 'caption' | 'label';
  color?: string;
}

export const ThemedText = ({ className, variant = 'body', color, style, ...props }: ThemedTextProps) => {
  const styles = {
    h1: "text-2xl font-bold text-white",
    h2: "text-lg font-semibold text-white",
    body: "text-base text-slate-200",
    caption: "text-xs text-slate-400",
    label: "text-[10px] font-medium text-slate-500 uppercase tracking-wider",
  };

  return (
    <Text
      className={clsx(styles[variant], className)}
      style={[color ? { color } : undefined, style]}
      {...props}
    />
  );
};
