import React, { useEffect, useState } from 'react';
import { Text, TextStyle } from 'react-native';
import { Easing, runOnJS, useDerivedValue, useSharedValue, withTiming } from 'react-native-reanimated';

interface AnimatedNumberProps {
  value: number;
  style?: TextStyle;
}

export const AnimatedNumber = ({ value, style }: AnimatedNumberProps) => {
  const [displayValue, setDisplayValue] = useState(value);
  const animatedValue = useSharedValue(value);

  useEffect(() => {
    // Calculate duration based on the difference
    const startValue = animatedValue.value;
    const diff = Math.abs(value - startValue);
    
    // Dynamic duration: Base 500ms + 100ms per unit of difference, capped at 2000ms
    // This ensures small changes are quick but large changes have enough time to show deceleration
    const duration = diff > 0 ? Math.min(2000, 800 + diff * 100) : 0;

    animatedValue.value = withTiming(value, { 
      duration: duration,
      // Use Cubic Ease Out for a "gradually slow down" effect
      // This means the animation starts fast and significantly decelerates towards the end
      easing: Easing.out(Easing.cubic) 
    }, (finished) => {
      if (finished) {
        runOnJS(setDisplayValue)(value);
      }
    });
  }, [value]);

  useDerivedValue(() => {
    const current = Math.round(animatedValue.value);
    runOnJS(setDisplayValue)(current);
  });

  return (
    <Text style={style}>
      {displayValue}
    </Text>
  );
};
