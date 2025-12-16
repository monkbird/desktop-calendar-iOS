import clsx from 'clsx';
import * as Haptics from 'expo-haptics';
import React, { useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Todo } from '../../types';
import { getDateInfo } from '../../utils';

interface CalendarCellProps {
  date: Date;
  isDifferentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  onSelect: (date: Date) => void;
  onDoubleSelect?: (date: Date) => void;
  todos: Todo[];
}

export const CalendarCell = React.memo(({
  date, isDifferentMonth, isToday, isSelected, onSelect, onDoubleSelect, todos
}: CalendarCellProps) => {
  const { lunarText, term, festival, workStatus } = useMemo(() => getDateInfo(date), [date]);

  const bottomText = festival || term || lunarText;
  const isFestival = !!(festival || term);

  const dateColor = useMemo(() => {
    if (isDifferentMonth) {
      return 'rgba(148,163,184,0.3)';
    }
    if (isSelected || isToday) {
      return '#34d399';
    }
    return '#ffffff';
  }, [isDifferentMonth, isSelected, isToday]);

  const lunarColor = useMemo(() => {
    if (isFestival) {
      if (isDifferentMonth) {
        return 'rgba(34,197,94,0.7)';
      }
      return '#22c55e';
    }
    return dateColor;
  }, [isFestival, isDifferentMonth, dateColor]);

  const MAX_TODO_DOTS = 5;
  const displayTodos = useMemo(() => {
    const sorted = [...todos].sort((a, b) => Number(a.completed) - Number(b.completed));
    return sorted.slice(0, MAX_TODO_DOTS);
  }, [todos]);

  const lastPress = React.useRef(0);

  const handlePress = () => {
    const now = Date.now();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    if (now - lastPress.current < 300) {
      onDoubleSelect?.(date);
      lastPress.current = 0;
    } else {
      lastPress.current = now;
      onSelect(date);
    }
  };

  const containerStyle = {
    flex: 1,
    height: 58,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    margin: 2,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: isSelected
      ? 'rgba(34,197,94,0.2)'
      : isToday
      ? 'rgba(34,197,94,0.08)'
      : 'transparent',
    borderColor: isSelected
      ? '#22c55e'
      : isToday
      ? 'rgba(34,197,94,0.7)'
      : 'transparent',
  };

  return (
    <Pressable
      onPress={handlePress}
      className={clsx(
        "flex-1 items-center justify-center",
        isSelected && "shadow-lg shadow-emerald-500/30"
      )}
      style={containerStyle}
    >
      {workStatus && (
        <View
          className={clsx(
            "absolute top-1 right-1 px-1 rounded-[3px]",
            workStatus === 'work' ? "bg-red-500/20" : "bg-emerald-500/20"
          )}
          style={{ opacity: isDifferentMonth ? 0.4 : 1 }}
        >
          <Text className={clsx("text-[8px] font-bold", workStatus === 'work' ? "text-red-400" : "text-emerald-400")}>
            {workStatus === 'work' ? '班' : '休'}
          </Text>
        </View>
      )}

      <Text
        className={clsx(
          "text-base font-medium",
          isDifferentMonth ? "text-white/20" : "text-white",
          (isSelected || isToday) && !isDifferentMonth && "text-emerald-400"
        )}
        style={{ color: dateColor }}
      >
        {date.getDate()}
      </Text>

      <Text
        className={clsx(
          "text-[9px] mt-0.5",
          isDifferentMonth ? "text-white/10" : "text-slate-400"
        )}
        style={{ color: lunarColor }}
        numberOfLines={1}
      >
        {bottomText}
      </Text>

      <View
        className="mt-1.5"
        style={{
          height: 8,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {displayTodos.map(todo => (
          <View
            key={todo.id}
            style={{
              width: 4,
              height: 4,
              borderRadius: 999,
              backgroundColor: isDifferentMonth
                ? todo.completed
                  ? 'rgba(100,116,139,0.4)'
                  : 'rgba(34,197,94,0.4)'
                : todo.completed
                ? '#64748b'
                : '#22c55e',
              marginHorizontal: 1,
            }}
          />
        ))}
      </View>
    </Pressable>
  );
});
