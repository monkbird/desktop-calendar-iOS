import { toDateId } from '@marceloterreiro/flash-calendar';
import { FlashList } from '@shopify/flash-list';
import { BlurView } from 'expo-blur';
import { ChevronLeft } from 'lucide-react-native';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Todo } from '../../types';
import { formatDateKey } from '../../utils';
import { CalendarCell } from './CalendarCell';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const SCREEN_WIDTH = Dimensions.get('window').width;

interface MonthViewProps {
  initialDate: Date;
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  onDoubleSelect?: (date: Date) => void;
  onBackToYear: (date?: Date) => void;
  onWeekCountChange?: (weeks: number) => void;
  todos: Todo[];
}


// 固定头部组件
const MonthHeader = ({ date, onBackToYear }: { date: Date, onBackToYear: (d?: Date) => void }) => {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const monthChinese = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二'][month - 1];

    return (
        <View 
            pointerEvents="box-none" 
            style={{ 
                position: 'absolute', 
                top: 0, 
                left: 0, 
                right: 0, 
                zIndex: 10,
            }}
        >
            <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
            <View style={{ paddingHorizontal: 16 }}>
                {/* 顶部导航栏 - 与右侧工具栏对齐 (top: 56) */}
                <View style={{ marginTop: 56, flexDirection: 'row', alignItems: 'center', marginBottom: 24 }}>
                    <TouchableOpacity 
                        onPress={() => onBackToYear(date)}
                        style={{ 
                            flexDirection: 'row', 
                            alignItems: 'center', 
                            backgroundColor: '#25262b', 
                            paddingHorizontal: 16, // 增加宽度
                            paddingVertical: 8,    // 增加高度以匹配右侧 (8 vs 6)
                            borderRadius: 9999,
                            borderWidth: 1,        // 增加边框以完全匹配右侧样式
                            borderColor: 'rgba(255,255,255,0.1)'
                        }}
                    >
                        <ChevronLeft size={20} color="white" /> 
                        <Text style={{ color: 'white', fontWeight: '500', marginLeft: 4, fontSize: 15 }}>{year}年</Text>
                    </TouchableOpacity>
                </View>

                <Text style={{ fontSize: 36, fontWeight: 'bold', color: 'white', marginBottom: 16, marginLeft: 8 }}>
                    {monthChinese}月
                </Text>

                {/* 星期表头 */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' }}>
                    {['一', '二', '三', '四', '五', '六', '日'].map((d, i) => (
                        <Text key={d} style={{ 
                            fontSize: 15, // 增大字体 (12 -> 15)
                            fontWeight: '500', 
                            textAlign: 'center', 
                            width: '13%', 
                            color: i >= 5 ? '#f87171' : 'rgba(255,255,255,0.5)' 
                        }}>{d}</Text>
                    ))}
                </View>
            </View>
        </View>
    );
};

// 单个月份组件 (只负责渲染网格)
const SingleMonth = React.memo(({ date, selectedDate, onDateSelect, onDoubleSelect, todosMap }: { 
    date: Date; 
    selectedDate: Date; 
    onDateSelect: (d: Date) => void;
    onDoubleSelect?: (d: Date) => void;
    todosMap: Record<string, Todo[]>;
}) => {
  // 手动计算月份日历数据，移除 flash-calendar 依赖
  const calendarData = useMemo(() => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    // Monday start: 0->6, 1->0 ...
    const startDayOfWeek = (firstDay.getDay() + 6) % 7; 

    const weeks = [];
    let currentWeek = [];

    // Prev month filler (dates)
    // We need correct dates for previous month to handle selection across months if needed
    // But for now, let's just use placeholders or calculate correctly
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = 0; i < startDayOfWeek; i++) {
        const d = new Date(year, month - 1, prevMonthLastDay - startDayOfWeek + 1 + i);
        currentWeek.push({
            date: d,
            isDifferentMonth: true,
            isToday: false, // simplified
            id: toDateId(d)
        });
    }

    const today = new Date();
    const todayId = toDateId(today);

    for (let day = 1; day <= daysInMonth; day++) {
        const d = new Date(year, month, day);
        const id = toDateId(d);
        currentWeek.push({
            date: d,
            isDifferentMonth: false,
            isToday: id === todayId,
            id: id
        });
        if (currentWeek.length === 7) {
            weeks.push(currentWeek);
            currentWeek = [];
        }
    }

    // Next month filler
    if (currentWeek.length > 0) {
        let nextMonthDay = 1;
        while (currentWeek.length < 7) {
            const d = new Date(year, month + 1, nextMonthDay);
            currentWeek.push({
                date: d,
                isDifferentMonth: true,
                isToday: false,
                id: toDateId(d)
            });
            nextMonthDay++;
        }
        weeks.push(currentWeek);
    }
    
    // Ensure we have enough rows? 
    // Actually, usually calendars display 5 or 6 rows. 
    // Flash calendar usually outputs full weeks.
    
    return weeks;
  }, [date]);

  const selectedDateId = toDateId(selectedDate);

  return (
    <View 
        style={{ 
            height: SCREEN_HEIGHT, 
            width: SCREEN_WIDTH,
            paddingTop: 200, // 再次减小头部预留空间 (220 -> 200)
            paddingHorizontal: 16,
            paddingBottom: 16
        }}
    >
        {/* 日期网格 */}
        <View>
            {calendarData.map((week, wIdx) => (
                <View key={wIdx} style={{ width: '100%', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                    {week.map((day) => {
                        const dateKey = formatDateKey(day.date);
                        const dayTodos = todosMap[dateKey] || [];
                        return (
                            <View key={day.id} style={{ width: '13%' }}>
                                <CalendarCell
                                    date={day.date}
                                    isDifferentMonth={day.isDifferentMonth}
                                    isToday={day.isToday}
                                    isSelected={day.id === selectedDateId}
                                    onSelect={onDateSelect}
                                    onDoubleSelect={onDoubleSelect}
                                    todos={dayTodos}
                                />
                            </View>
                        );
                    })}
                </View>
            ))}
        </View>
    </View>
  );
});

export default function MonthView({ initialDate, selectedDate, onDateSelect, onDoubleSelect, onBackToYear, onWeekCountChange, todos }: MonthViewProps) {
    // 追踪当前可见月份
    const [currentViewDate, setCurrentViewDate] = useState(initialDate);
    // 渐进式加载控制：先渲染占位图，再加载列表
    const [shouldRenderList, setShouldRenderList] = useState(false);
    const [isListVisible, setIsListVisible] = useState(false);

    // 延迟渲染列表以确保转场动画流畅启动
    useEffect(() => {
        const timer = setTimeout(() => {
            setShouldRenderList(true);
        }, 100); // 100ms延迟，让转场动画先跑起来
        return () => clearTimeout(timer);
    }, []);

    // 计算当前月份的行数
    useEffect(() => {
        if (!onWeekCountChange) return;
        
        const year = currentViewDate.getFullYear();
        const month = currentViewDate.getMonth();
        const firstDayOfMonth = new Date(year, month, 1);
        const lastDayOfMonth = new Date(year, month + 1, 0);
        const daysInMonth = lastDayOfMonth.getDate();
        
        // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
        // We want Monday = 0, ..., Sunday = 6
        const firstDayOfWeek = (firstDayOfMonth.getDay() + 6) % 7;
        
        const usedInFirstRow = 7 - firstDayOfWeek;
        const remainingDays = daysInMonth - usedInFirstRow;
        const remainingRows = Math.ceil(remainingDays / 7);
        const totalRows = 1 + remainingRows;
        
        onWeekCountChange(totalRows);
    }, [currentViewDate, onWeekCountChange]);

    const listRef = useRef<any>(null);
    const [baseDate, setBaseDate] = useState(initialDate);

    // 生成前后 60 个月 (5年) 以覆盖大部分跳转
    const months = useMemo(() => {
        const result = [];
        for (let i = -60; i <= 60; i++) {
            const d = new Date(baseDate.getFullYear(), baseDate.getMonth() + i, 1);
            result.push(d);
        }
        return result;
    }, [baseDate]);

    // 初始定位到中间
    const initialIndex = 60;
    
    // Track current scroll offset for custom animation
    const listOpacity = useSharedValue(1);
    
    const animatedListStyle = useAnimatedStyle(() => ({
        opacity: listOpacity.value
    }));

    // Helper to scroll via JS ref
    const scrollToIndex = (index: number) => {
        listRef.current?.scrollToIndex({ index, animated: false });
    };

    // 监听 initialDate 变化以实现动画跳转
    useEffect(() => {
        const diff = (initialDate.getFullYear() - baseDate.getFullYear()) * 12 + (initialDate.getMonth() - baseDate.getMonth());
        const targetIndex = 60 + diff; // 60 是中间索引

        if (targetIndex >= 0 && targetIndex < months.length) {
            // 如果列表尚未显示（初始化中），则不执行转场动画，直接依赖 initialScrollIndex 或布局回调
            if (!isListVisible) return;

            // 检查目标月份是否已经是当前显示的月份
            const currentMonthId = currentViewDate.getFullYear() * 12 + currentViewDate.getMonth();
            const targetMonthId = initialDate.getFullYear() * 12 + initialDate.getMonth();

            // 只有当月份确实发生变化时才执行 "淡出 -> 跳转 -> 淡入" 动画
            if (currentMonthId !== targetMonthId) {
                listOpacity.value = withTiming(0, { duration: 250 }, (finished) => {
                    if (finished) {
                        runOnJS(scrollToIndex)(targetIndex);
                        listOpacity.value = withTiming(1, { duration: 250 });
                    }
                });
            }
        } else {
            // 超出范围则重置 baseDate (无动画)
            setBaseDate(initialDate);
        }
    }, [initialDate, baseDate, months, isListVisible]);

    const todosMap = useMemo(() => {
        const map: Record<string, Todo[]> = {};
        todos.forEach(t => {
            if (!map[t.targetDate]) map[t.targetDate] = [];
            map[t.targetDate].push(t);
        });
        return map;
    }, [todos]);

    const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
        if (viewableItems && viewableItems.length > 0) {
            // 取第一个可见项作为当前月份
            const item = viewableItems[0].item;
            setCurrentViewDate(item);
        }
    }).current;

    return (
        <View style={{ flex: 1 }}>
            <MonthHeader date={currentViewDate} onBackToYear={onBackToYear} />
            
            {/* 占位组件：立即渲染，保证动画零延迟启动 */}
            {!isListVisible && (
                <View style={[StyleSheet.absoluteFill, { zIndex: 1 }]}>
                    <SingleMonth 
                        date={initialDate} 
                        selectedDate={selectedDate} 
                        onDateSelect={onDateSelect} 
                        onDoubleSelect={onDoubleSelect}
                        todosMap={todosMap}
                    />
                </View>
            )}
            
            {/* 交互列表：延迟加载，准备好后渐显 */}
            {shouldRenderList && (
                <Animated.View style={[{ flex: 1, opacity: isListVisible ? 1 : 0 }, animatedListStyle]}>
                    <FlashList
                        ref={listRef}
                        data={months}
                        extraData={selectedDate}
                        renderItem={({ item }) => (
                            <SingleMonth 
                                date={item} 
                                selectedDate={selectedDate} 
                                onDateSelect={onDateSelect} 
                                onDoubleSelect={onDoubleSelect}
                                todosMap={todosMap}
                            />
                        )}
                        // @ts-ignore
                        estimatedItemSize={SCREEN_HEIGHT}
                        initialScrollIndex={initialIndex}
                        pagingEnabled
                        showsVerticalScrollIndicator={false}
                        onViewableItemsChanged={onViewableItemsChanged}
                        viewabilityConfig={{
                            itemVisiblePercentThreshold: 50
                        }}
                        scrollEventThrottle={16}
                        onLayout={() => {
                            // 列表布局完成后，稍微等待以确保 initialScrollIndex 生效，然后显示
                            requestAnimationFrame(() => {
                                setTimeout(() => setIsListVisible(true), 50);
                            });
                        }}
                    />
                </Animated.View>
            )}
        </View>
    );
}
