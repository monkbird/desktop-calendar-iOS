import {
  toDateId,
  useCalendar,
  type CalendarActiveDateRange
} from '@marceloterreiro/flash-calendar';
import clsx from 'clsx';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, RotateCcw, Rows } from 'lucide-react-native';
import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, Modal, Text, TouchableOpacity, View } from 'react-native';
import { Todo } from '../../types';
import { formatDateKey } from '../../utils';
import { CalendarCell } from './CalendarCell';

interface CalendarWidgetProps {
  todos: Todo[];
  selectedDate: Date;
  onDateSelect: (d: Date) => void;
}

// 动态生成年份列表 (当前年份 前后 10 年)
const generateYears = (centerYear: number) => {
  return Array.from({ length: 20 }, (_, i) => centerYear - 10 + i);
};

export default function CalendarWidget({ todos, selectedDate, onDateSelect }: CalendarWidgetProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showYearPicker, setShowYearPicker] = useState(false);
  
  // 1. 新增：视图模式切换 (月视图/周视图)
  const [calendarFormat, setCalendarFormat] = useState<'month' | 'week'>('month');

  // 2. 性能优化：缓存 Todos Map
  const todosMap = useMemo(() => {
    const map: Record<string, Todo[]> = {};
    todos.forEach(t => {
      if (!map[t.targetDate]) map[t.targetDate] = [];
      map[t.targetDate].push(t);
    });
    return map;
  }, [todos]);

  // 3. 性能优化：缓存选中范围对象，避免重复创建导致重渲染
  const selectedDateId = useMemo(() => toDateId(selectedDate), [selectedDate]);

  const activeDateRanges = useMemo<CalendarActiveDateRange[]>(() => [{
    startId: selectedDateId,
    endId: selectedDateId,
  }], [selectedDateId]);

  const { weeksList } = useCalendar({
    calendarMonthId: toDateId(currentDate),
    calendarFirstDayOfWeek: 'sunday',
    calendarActiveDateRanges: activeDateRanges
  });

  // 导航逻辑
  const handleNavigate = useCallback((direction: -1 | 1) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newDate = new Date(currentDate);
    
    if (calendarFormat === 'month') {
      newDate.setMonth(newDate.getMonth() + direction);
    } else {
      newDate.setDate(newDate.getDate() + (direction * 7));
    }
    setCurrentDate(newDate);
  }, [currentDate, calendarFormat]);

  const handleGoToday = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const now = new Date();
    setCurrentDate(now);
    onDateSelect(now);
    // 强制滚动到今天 (如果 FlashCalendar 支持 scrollToDate，可在此调用)
  }, [onDateSelect]);

  const toggleFormat = useCallback(() => {
    Haptics.selectionAsync();
    setCalendarFormat(prev => prev === 'month' ? 'week' : 'month');
  }, []);

  return (
    <View className="flex-1 w-full">
      {/* --- Header Area --- */}
      <View className="flex-row justify-between items-center px-4 py-3 border-b border-white/5 bg-white/5">
        
        {/* 左侧：年月显示 (点击切换年份) */}
        <TouchableOpacity
          onPress={() => {
            Haptics.selectionAsync();
            setShowYearPicker(true);
          }}
          className="flex-row items-baseline gap-1 active:opacity-70"
        >
          <Text className="text-xl font-bold text-white tracking-tight">
            {currentDate.getFullYear()}年
          </Text>
          <Text className="text-lg font-medium text-emerald-400">
            {currentDate.getMonth() + 1}月
          </Text>
          <ChevronRight size={14} className="text-white/30 ml-1 rotate-90" />
        </TouchableOpacity>

        {/* 右侧：工具栏 */}
        <View className="flex-row gap-2 items-center">
          {/* 视图切换按钮 (月/周) */}
          <TouchableOpacity
            onPress={toggleFormat}
            className="w-8 h-8 items-center justify-center rounded-full bg-white/10"
          >
            {calendarFormat === 'month' ? (
              <Rows size={16} color="#cbd5e1" /> // 代表切到周视图的图标
            ) : (
              <CalendarIcon size={16} color="#cbd5e1" /> // 代表切到月视图
            )}
          </TouchableOpacity>

          {/* 回到今天 */}
          <TouchableOpacity
            onPress={handleGoToday}
            className="w-8 h-8 items-center justify-center rounded-full bg-white/10"
          >
            <RotateCcw size={16} color="#34d399" />
          </TouchableOpacity>

          {/* 翻页按钮组 */}
          <View className="flex-row bg-white/10 rounded-lg overflow-hidden ml-1">
            <TouchableOpacity
              onPress={() => handleNavigate(-1)}
              className="p-1.5 px-3 border-r border-white/10 active:bg-white/20"
            >
              <ChevronLeft size={20} color="#cbd5e1" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleNavigate(1)}
              className="p-1.5 px-3 active:bg-white/20"
            >
              <ChevronRight size={20} color="#cbd5e1" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* --- Calendar Body --- */}
      <View className="flex-1 px-1 pt-2">
        {/* 星期表头 */}
        <View className="flex-row justify-around mb-2 px-1">
          {['日', '一', '二', '三', '四', '五', '六'].map((d, i) => (
            <Text
              key={d}
              className={clsx(
                "text-[10px] w-[14%] text-center font-medium",
                (i === 0 || i === 6) ? "text-emerald-500/70" : "text-white/40"
              )}
            >
              {d}
            </Text>
          ))}
        </View>

        {weeksList.map((week, rowIndex) => (
          <View key={rowIndex} className="flex-row">
            {week.map((day) => {
              const dateObj = day.date;
              const dateKey = formatDateKey(dateObj);
              const dayTodos = todosMap[dateKey] || [];

              return (
                <CalendarCell
                  key={day.id}
                  date={dateObj}
                  isDifferentMonth={day.isDifferentMonth}
                  isToday={day.isToday}
                  isSelected={day.id === selectedDateId}
                  onSelect={(d) => {
                    setCurrentDate(d);
                    onDateSelect(d);
                  }}
                  todos={dayTodos}
                />
              );
            })}
          </View>
        ))}
      </View>

      {/* --- Year Picker Modal (优化版) --- */}
      <Modal visible={showYearPicker} transparent animationType="fade" onRequestClose={() => setShowYearPicker(false)}>
        <BlurView intensity={30} tint="dark" className="flex-1 justify-end">
          <TouchableOpacity
            className="absolute inset-0"
            activeOpacity={1}
            onPress={() => setShowYearPicker(false)}
          />
          
          <View className="bg-[#25262b] rounded-t-3xl border-t border-white/10 h-[60%] overflow-hidden shadow-2xl">
            <View className="p-4 border-b border-white/5 flex-row justify-between items-center bg-white/5">
              <Text className="text-white text-lg font-bold">选择年份</Text>
              <TouchableOpacity onPress={() => setShowYearPicker(false)} className="bg-white/10 px-3 py-1 rounded-full">
                <Text className="text-xs text-white">关闭</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={generateYears(new Date().getFullYear())}
              keyExtractor={(item) => item.toString()}
              numColumns={4}
              contentContainerStyle={{ padding: 16, gap: 12 }}
              columnWrapperStyle={{ gap: 12 }}
              renderItem={({ item: year }) => {
                const isSelected = year === currentDate.getFullYear();
                return (
                  <TouchableOpacity
                    onPress={() => {
                      Haptics.selectionAsync();
                      setCurrentDate(new Date(year, currentDate.getMonth(), 1));
                      setShowYearPicker(false);
                    }}
                    className={clsx(
                      "flex-1 aspect-square items-center justify-center rounded-xl border",
                      isSelected
                        ? "bg-emerald-500/20 border-emerald-500"
                        : "bg-white/5 border-transparent"
                    )}
                  >
                    <Text className={clsx("text-lg font-semibold", isSelected ? "text-emerald-400" : "text-white")}>
                      {year}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </BlurView>
      </Modal>
    </View>
  );
}
