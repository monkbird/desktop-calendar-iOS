import { BlurView } from 'expo-blur';
import { ChevronDown } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import { Dimensions, ImageBackground, StatusBar, TouchableOpacity, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import CalendarWidget from '../src/components/Calendar/CalendarWidget';
import AgendaList from '../src/components/Todo/AgendaList';
import { useTodos } from '../src/hooks/useTodos';
import { formatDateKey } from '../src/utils';

const SCREEN_HEIGHT = Dimensions.get('window').height;
// 估算的顶部高度 (Header + Week row approx offset)
const SHEET_TOP_OFFSET = 120; 
// 底部可见高度 (日历下方区域) - 假设日历占上半部分，这里留出约 45% 的高度给待办列表
const SHEET_PEEK_HEIGHT = SCREEN_HEIGHT * 0.45;
const SHEET_PEEK_Y = SCREEN_HEIGHT - SHEET_PEEK_HEIGHT;

export default function HomeScreen() {
  const { todos, addTodo, toggleTodo, deleteTodo } = useTodos();
  const [selectedDate, setSelectedDate] = useState(new Date());
  // isTodoExpanded 控制是否展开到顶部，默认 false 为底部 peek 模式
  const [isTodoExpanded, setIsTodoExpanded] = useState(false);

  const translateY = useSharedValue(SHEET_PEEK_Y);
  const context = useSharedValue({ y: 0 });

  useEffect(() => {
    if (isTodoExpanded) {
      // 展开到顶部
      translateY.value = withSpring(SHEET_TOP_OFFSET, {
        damping: 20,
        stiffness: 90
      });
    } else {
      // 收缩到底部 (Peek)
      translateY.value = withSpring(SHEET_PEEK_Y, {
        damping: 20,
        stiffness: 90
      });
    }
  }, [isTodoExpanded]);

  const gesture = Gesture.Pan()
    .onStart(() => {
      context.value = { y: translateY.value };
    })
    .onUpdate((event) => {
      translateY.value = event.translationY + context.value.y;
      // 限制拖拽范围
      if (translateY.value < SHEET_TOP_OFFSET) {
        translateY.value = SHEET_TOP_OFFSET + (translateY.value - SHEET_TOP_OFFSET) * 0.1;
      }
    })
    .onEnd(() => {
      if (translateY.value < (SHEET_PEEK_Y + SHEET_TOP_OFFSET) / 2) {
        runOnJS(setIsTodoExpanded)(true);
      } else {
        runOnJS(setIsTodoExpanded)(false);
      }
    });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
    };
  });

  const selectedDateKey = useMemo(() => formatDateKey(selectedDate), [selectedDate]);
  
  const currentTodos = useMemo(() => {
    return todos.filter(t => t.targetDate === selectedDateKey).sort((a, b) => {
        if (a.completed === b.completed) return 0;
        return a.completed ? 1 : -1;
    });
  }, [todos, selectedDateKey]);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: 'black' }}>
      <StatusBar barStyle="light-content" />
      
      {/* 背景图片: 实际开发请放入 assets/bg.jpg */}
      <ImageBackground
        source={{ uri: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=1000&auto=format&fit=crop' }}
        style={{ flex: 1 }}
        resizeMode="cover"
      >
        <BlurView intensity={60} tint="dark" style={{ flex: 1 }}>
            <SafeAreaView style={{ flex: 1 }}>
                {/* 全屏日历 */}
                <View style={{ flex: 1 }}>
                    <CalendarWidget
                        todos={todos}
                        selectedDate={selectedDate}
                        onDateSelect={setSelectedDate}
                        onDoubleSelect={() => setIsTodoExpanded(true)}
                    />
                </View>

                {/* 待办列表 (滑动面板) */}
                <GestureDetector gesture={gesture}>
                  <Animated.View
                    style={[
                      {
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        bottom: 0,
                        top: 0, // 初始top为0，通过translateY控制位置
                        backgroundColor: '#1a1b1e',
                        borderTopLeftRadius: 24,
                        borderTopRightRadius: 24,
                        overflow: 'hidden',
                        shadowColor: '#000',
                        shadowOpacity: 0.5,
                        shadowRadius: 24,
                        borderTopWidth: 1,
                        borderTopColor: 'rgba(255,255,255,0.1)',
                        zIndex: 100,
                      },
                      animatedStyle
                    ]}
                  >
                      {/* 关闭把手/按钮 */}
                      <View className="items-center py-2 bg-white/5 border-b border-white/5">
                          <TouchableOpacity 
                              onPress={() => setIsTodoExpanded(!isTodoExpanded)}
                              className="p-1"
                          >
                              {isTodoExpanded ? (
                                  <ChevronDown size={24} color="#9ca3af" />
                              ) : (
                                  <View className="w-12 h-1 bg-white/20 rounded-full" />
                              )}
                          </TouchableOpacity>
                      </View>

                      <AgendaList
                          dateKey={selectedDateKey}
                          todos={currentTodos}
                          onAdd={(text) => addTodo(text, selectedDateKey)}
                          onToggle={toggleTodo}
                          onDelete={deleteTodo}
                      />
                  </Animated.View>
                </GestureDetector>
            </SafeAreaView>
        </BlurView>
      </ImageBackground>
    </GestureHandlerRootView>
  );
}