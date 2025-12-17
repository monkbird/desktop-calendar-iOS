import * as Haptics from 'expo-haptics';
import React, { useMemo, useRef } from 'react';
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

  // 颜色逻辑
  const dayTextColor = useMemo(() => {
    if (isToday) return '#ffffff'; // 今天白字(红底)
    if (isSelected) return '#000000'; // 选中黑字(白底)
    if (isDifferentMonth) return 'rgba(255,255,255,0.2)';
    return '#ffffff'; // 普通白字
  }, [isDifferentMonth, isToday, isSelected]);

  const bottomTextColor = useMemo(() => {
    if (isDifferentMonth) return 'rgba(255,255,255,0.1)';
    if (isToday) return '#ef4444'; // 今天红字
    if (isFestival) return '#ef4444'; // 节日红色
    return '#a1a1aa'; // 农历灰色
  }, [isDifferentMonth, isToday, isFestival]);

  const circleColor = useMemo(() => {
    if (isToday) return '#ef4444'; // 今天红圈
    if (isSelected) return '#ffffff'; // 选中白圈
    return 'transparent';
  }, [isToday, isSelected]);

  const MAX_TODO_DOTS = 5;
  const displayTodos = useMemo(() => {
    const sorted = [...todos].sort((a, b) => Number(a.completed) - Number(b.completed));
    return sorted.slice(0, MAX_TODO_DOTS);
  }, [todos]);

  const lastPress = useRef(0);
  const handlePress = () => {
    Haptics.selectionAsync();
    const now = Date.now();
    if (now - lastPress.current < 500) {
      if (onDoubleSelect) {
        onDoubleSelect(date);
      }
    } else {
      onSelect(date);
    }
    lastPress.current = now;
  };

  return (
    <Pressable
      onPress={handlePress}
      style={{
        alignItems: 'center',
        justifyContent: 'flex-start',
        paddingTop: 8,
        height: 64, // 增加高度
      }}
    >
      {/* 今天背景圈 */}
      <View
        style={{
            width: 36,
            height: 36,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 9999,
            marginBottom: 4,
            backgroundColor: circleColor
        }}
      >
          <Text
            style={{ 
                fontSize: 18, 
                fontWeight: '600', 
                color: dayTextColor 
            }}
          >
            {date.getDate()}
          </Text>
      </View>

      <Text
        style={{ 
            fontSize: 9, 
            fontWeight: '500', 
            color: bottomTextColor 
        }}
        numberOfLines={1}
      >
        {bottomText}
      </Text>

      {/* 待办点 */}
      <View style={{ flexDirection: 'row', gap: 2, marginTop: 4 }}>
        {displayTodos.map((todo, idx) => (
          <View
            key={todo.id || idx}
            style={{
                width: 4,
                height: 4,
                borderRadius: 9999,
                backgroundColor: todo.completed ? 'rgba(255,255,255,0.3)' : '#f97316' // 未完成橙色，完成灰色
            }}
          />
        ))}
      </View>

      {/* 班/休 标记 */}
      {workStatus && !isDifferentMonth && (
        <View style={{ position: 'absolute', top: 4, right: 4 }}>
            <Text style={{ fontSize: 8, color: workStatus === 'work' ? 'rgba(255,255,255,0.5)' : '#10b981' }}>
                {workStatus === 'work' ? '班' : '休'}
            </Text>
        </View>
      )}
    </Pressable>
  );
});
