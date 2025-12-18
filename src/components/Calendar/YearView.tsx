import { Solar } from 'lunar-typescript';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Dimensions, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const SCREEN_WIDTH = Dimensions.get('window').width;
const MONTH_WIDTH = (SCREEN_WIDTH - 32) / 3; // 3 columns, padding 16

import { Todo } from '../../types';

interface YearViewProps {
  initialYear: number;
  onMonthSelect: (date: Date) => void;
  currentDate: Date; // 用于高亮今天
  todos?: Todo[];
}

import { useSafeAreaInsets } from 'react-native-safe-area-context';

// 辅助组件：小月份网格 (优化版，移除 heavy hooks)
const SmallMonthGrid = React.memo(({ year, month, onSelect, isCurrentMonth }: { year: number; month: number; onSelect: () => void, isCurrentMonth: boolean }) => {
  // 手动计算简单的日历数据
  const calendarData = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    // getDay() 0=Sunday, 1=Monday...
    // We want Monday start: 0->6, 1->0, 2->1 ...
    // (day + 6) % 7
    const startDayOfWeek = (firstDay.getDay() + 6) % 7; 

    const weeks = [];
    let currentWeek = [];
    
    // 填充第一周前的空白
    for (let i = 0; i < startDayOfWeek; i++) {
      currentWeek.push(null);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      currentWeek.push(day);
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }

    // 填充最后一周的空白
    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push(null);
      }
      weeks.push(currentWeek);
    }

    return weeks;
  }, [year, month]);

  const today = new Date();
  const isThisMonth = today.getFullYear() === year && today.getMonth() === month;
  const todayDate = isThisMonth ? today.getDate() : -1;

  return (
    <TouchableOpacity 
      onPress={onSelect}
      style={{ width: MONTH_WIDTH, marginBottom: 24 }}
    >
      <Text style={{ 
          color: isCurrentMonth ? '#ef4444' : 'white', 
          fontWeight: 'bold', 
          fontSize: 18, 
          marginBottom: 8, 
          marginLeft: 4 
      }}>
        {month + 1}月
      </Text>
      <View>
        {/* 星期头 - 从周一开始 */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
            {['一','二','三','四','五','六','日'].map((d, idx) => {
                // 周六(5)和周日(6)标红
                const isWeekend = idx >= 5;
                return (
                    <Text key={d} style={{ 
                        fontSize: 8, 
                        color: isWeekend ? '#ef4444' : 'rgba(255,255,255,0.3)', 
                        textAlign: 'center', 
                        width: '13%' 
                    }}>
                        {d}
                    </Text>
                );
            })}
        </View>

        {calendarData.map((week, wIdx) => (
          <View key={wIdx} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
            {week.map((day, dIdx) => {
              if (day === null) {
                return <View key={dIdx} style={{ width: '13%' }} />;
              }
              
              const isToday = day === todayDate;
              
              return (
                <View key={dIdx} style={{ 
                    width: '13%', 
                    aspectRatio: 1, 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    borderRadius: 9999, 
                    backgroundColor: isToday ? '#ef4444' : 'transparent' 
                }}>
                  <Text style={{ 
                      fontSize: 9, 
                      fontWeight: '500', 
                      color: isToday ? 'white' : 'rgba(255,255,255,0.7)' 
                  }}>
                    {day}
                  </Text>
                </View>
              );
            })}
          </View>
        ))}
      </View>
    </TouchableOpacity>
  );
});

// 年份项组件
const YearItem = React.memo(({ year, onMonthSelect, currentDate, todos = [] }: { year: number; onMonthSelect: (d: Date) => void; currentDate: Date; todos?: Todo[] }) => {
  const insets = useSafeAreaInsets();
  const lunarYear = useMemo(() => {
    const solar = Solar.fromDate(new Date(year, 0, 1));
    const lunar = solar.getLunar();
    return `${lunar.getYearInGanZhi()}${lunar.getYearShengXiao()}年`;
  }, [year]);

  // 计算本年度完成的待办数
  const completedCount = useMemo(() => {
    return todos.filter(todo => {
      // todo.targetDate is "YYYY-MM-DD"
      const [y] = todo.targetDate.split('-');
      return parseInt(y) === year && todo.completed;
    }).length;
  }, [todos, year]);

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  return (
    <View 
        style={{ 
            paddingHorizontal: 16, 
            paddingBottom: 32, 
            height: '100%', 
            minHeight: Dimensions.get('window').height,
            paddingTop: insets.top + 20 
        }}
    >
      {/* 年份 Header */}
      <View style={{ 
          flexDirection: 'row', 
          justifyContent: 'space-between', 
          alignItems: 'flex-end', 
          marginBottom: 32, 
          borderBottomWidth: 1, 
          borderBottomColor: 'rgba(255,255,255,0.1)', 
          paddingBottom: 16 
      }}>
        <Text style={{ fontSize: 48, fontWeight: 'bold', color: '#ef4444', letterSpacing: -2 }}>
          {year}年
        </Text>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginBottom: 4 }}>{lunarYear}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10 }}>本年度完成待办数：</Text>
            <Text style={{ color: '#4ade80', fontSize: 12, fontWeight: 'bold' }}>{completedCount}</Text>
          </View>
        </View>
      </View>

      {/* 月份网格 (3列) */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
        {Array.from({ length: 12 }).map((_, idx) => (
          <SmallMonthGrid 
            key={idx} 
            year={year} 
            month={idx} 
            onSelect={() => onMonthSelect(new Date(year, idx, 1))}
            isCurrentMonth={year === currentYear && idx === currentMonth}
          />
        ))}
      </View>
    </View>
  );
});

export default function YearView({ initialYear, onMonthSelect, currentDate, todos }: YearViewProps) {
  // 生成前后 50 年
  const years = useMemo(() => {
    return Array.from({ length: 100 }, (_, i) => initialYear - 50 + i);
  }, [initialYear]);

  // 渲染控制状态
  const [shouldRenderList, setShouldRenderList] = useState(false);
  const [isListVisible, setIsListVisible] = useState(false);
  const listRef = useRef<FlatList>(null);

  // 延迟渲染列表以确保转场动画流畅启动
  useEffect(() => {
    const timer = setTimeout(() => {
        setShouldRenderList(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // 初始滚动位置
  const getItemLayout = (_: any, index: number) => ({
    length: Dimensions.get('window').height, // 假设每屏高度
    offset: Dimensions.get('window').height * index,
    index,
  });

  return (
    <View style={{ flex: 1 }}>
        {/* 占位组件：立即渲染，保证动画零延迟启动 */}
        {!isListVisible && (
            <View style={[StyleSheet.absoluteFill, { zIndex: 1 }]}>
                <View style={{ height: Dimensions.get('window').height }}>
                    <YearItem 
                        year={initialYear} 
                        onMonthSelect={onMonthSelect} 
                        currentDate={currentDate} 
                        todos={todos} 
                    />
                </View>
            </View>
        )}

        {/* 交互列表：延迟加载 */}
        {shouldRenderList && (
            <View style={{ flex: 1, opacity: isListVisible ? 1 : 0 }}>
                <FlatList
                    ref={listRef}
                    data={years}
                    keyExtractor={(item) => item.toString()}
                    renderItem={({ item }) => (
                        <View style={{ height: Dimensions.get('window').height }}>
                            <YearItem year={item} onMonthSelect={onMonthSelect} currentDate={currentDate} todos={todos} />
                        </View>
                    )}
                    initialScrollIndex={50} // 对应 initialYear
                    getItemLayout={getItemLayout}
                    pagingEnabled
                    showsVerticalScrollIndicator={false}
                    windowSize={3}
                    initialNumToRender={1}
                    maxToRenderPerBatch={1}
                    removeClippedSubviews={true}
                    onLayout={() => {
                        // 列表布局完成后，稍微等待以确保 initialScrollIndex 生效
                        requestAnimationFrame(() => {
                            setTimeout(() => setIsListVisible(true), 50);
                        });
                    }}
                />
            </View>
        )}
    </View>
  );
}
