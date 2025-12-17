import React, { useEffect, useState } from 'react';
import { Text, TextStyle } from 'react-native';
import { runOnJS, useDerivedValue, useSharedValue, withTiming } from 'react-native-reanimated';

interface AnimatedNumberProps {
  value: number;
  style?: TextStyle;
}

export const AnimatedNumber = ({ value, style }: AnimatedNumberProps) => {
  const [displayValue, setDisplayValue] = useState(value);
  const animatedValue = useSharedValue(value);

  useEffect(() => {
    animatedValue.value = withTiming(value, { duration: 500 }, (finished) => {
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
