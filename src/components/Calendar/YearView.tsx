import { toDateId, useCalendar } from '@marceloterreiro/flash-calendar';
import { Solar } from 'lunar-typescript';
import React, { useMemo } from 'react';
import { Dimensions, FlatList, Text, TouchableOpacity, View } from 'react-native';

const SCREEN_WIDTH = Dimensions.get('window').width;
const MONTH_WIDTH = (SCREEN_WIDTH - 32) / 3; // 3 columns, padding 16

interface YearViewProps {
  initialYear: number;
  onMonthSelect: (date: Date) => void;
  currentDate: Date; // 用于高亮今天
}

import { useSafeAreaInsets } from 'react-native-safe-area-context';

// 辅助组件：小月份网格
const SmallMonthGrid = ({ year, month, onSelect, isCurrentMonth }: { year: number; month: number; onSelect: () => void, isCurrentMonth: boolean }) => {
  const date = useMemo(() => new Date(year, month, 1), [year, month]);
  
  // 使用 flash-calendar 的 hook 获取当月数据
  const { weeksList } = useCalendar({
    calendarMonthId: toDateId(date),
    calendarFirstDayOfWeek: 'sunday',
  });

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
        {/* 星期头 - 可选，图2似乎没有显示星期头，只有数字 */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
            {['日','一','二','三','四','五','六'].map(d => (
                <Text key={d} style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)', textAlign: 'center', width: '13%' }}>{d}</Text>
            ))}
        </View>

        {weeksList.map((week, wIdx) => (
          <View key={wIdx} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
            {week.map((day, dIdx) => {
              const isToday = day.isToday;
              // 只显示当月的日期
              if (day.isDifferentMonth) {
                return <View key={dIdx} style={{ width: '13%' }} />;
              }
              
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
                    {day.date.getDate()}
                  </Text>
                </View>
              );
            })}
          </View>
        ))}
      </View>
    </TouchableOpacity>
  );
};

// 年份项组件
const YearItem = ({ year, onMonthSelect, currentDate }: { year: number; onMonthSelect: (d: Date) => void; currentDate: Date }) => {
  const insets = useSafeAreaInsets();
  const lunarYear = useMemo(() => {
    const solar = Solar.fromDate(new Date(year, 0, 1));
    const lunar = solar.getLunar();
    return `${lunar.getYearInGanZhi()}${lunar.getYearShengXiao()}年`;
  }, [year]);

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
          <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10 }}>农历初一</Text>
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
};

export default function YearView({ initialYear, onMonthSelect, currentDate }: YearViewProps) {
  // 生成前后 50 年
  const years = useMemo(() => {
    return Array.from({ length: 100 }, (_, i) => initialYear - 50 + i);
  }, [initialYear]);

  // 初始滚动位置
  const getItemLayout = (_: any, index: number) => ({
    length: Dimensions.get('window').height, // 假设每屏高度
    offset: Dimensions.get('window').height * index,
    index,
  });

  return (
    <FlatList
      data={years}
      keyExtractor={(item) => item.toString()}
      renderItem={({ item }) => (
        <View style={{ height: Dimensions.get('window').height }}>
            <YearItem year={item} onMonthSelect={onMonthSelect} currentDate={currentDate} />
        </View>
      )}
      initialScrollIndex={50} // 对应 initialYear
      getItemLayout={getItemLayout}
      pagingEnabled
      showsVerticalScrollIndicator={false}
      windowSize={3}
    />
  );
}
