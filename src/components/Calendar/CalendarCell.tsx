import React, { useMemo } from 'react';
import { Text, View, Pressable } from 'react-native';
import { getDateInfo } from '../../utils';
import { Todo } from '../../types';
import clsx from 'clsx';
import * as Haptics from 'expo-haptics';

interface CalendarCellProps {
  date: Date;
  isDifferentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  onSelect: (date: Date) => void;
  todos: Todo[];
}

export const CalendarCell = React.memo(({
  date, isDifferentMonth, isToday, isSelected, onSelect, todos
}: CalendarCellProps) => {
  const { lunarText, term, festival, workStatus } = useMemo(() => getDateInfo(date), [date]);
  
  const bottomText = festival || term || lunarText;
  const isFestival = !!(festival || term);
  const hasIncomplete = todos.some(t => !t.completed);
  const hasCompleted = todos.some(t => t.completed);

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelect(date);
  };

  return (
    <Pressable
      onPress={handlePress}
      className={clsx(
        "flex-1 h-[58px] items-center justify-center m-[2px] rounded-xl border",
        isSelected ? "bg-emerald-500/20 border-emerald-500" : "border-transparent",
        !isSelected && isToday && "bg-white/10"
      )}
    >
      {workStatus && (
        <View className={clsx(
          "absolute top-1 right-1 px-1 rounded-[3px]",
          workStatus === 'work' ? "bg-red-500/20" : "bg-emerald-500/20"
        )}>
          <Text className={clsx("text-[8px] font-bold", workStatus === 'work' ? "text-red-400" : "text-emerald-400")}>
            {workStatus === 'work' ? '班' : '休'}
          </Text>
        </View>
      )}

      <Text className={clsx(
        "text-base font-medium",
        isDifferentMonth ? "text-white/20" : "text-white",
        isSelected && "text-emerald-400",
        isToday && !isSelected && "text-emerald-400"
      )}>
        {date.getDate()}
      </Text>

      <Text className={clsx(
        "text-[9px] mt-0.5",
        isDifferentMonth ? "text-white/10" : "text-slate-400",
        isFestival && !isDifferentMonth && "text-emerald-600"
      )} numberOfLines={1}>
        {bottomText}
      </Text>

      <View className="flex-row gap-0.5 mt-1 h-1">
        {hasIncomplete && <View className="w-1 h-1 rounded-full bg-emerald-400" />}
        {!hasIncomplete && hasCompleted && <View className="w-1 h-1 rounded-full bg-slate-500" />}
      </View>
    </Pressable>
  );
});
