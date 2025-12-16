import { BlurView } from 'expo-blur';
import React, { useMemo, useState, useEffect } from 'react';
import { ImageBackground, StatusBar, View, Dimensions, TouchableOpacity, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';
import { ChevronDown } from 'lucide-react-native';
import CalendarWidget from '../src/components/Calendar/CalendarWidget';
import AgendaList from '../src/components/Todo/AgendaList';
import { useTodos } from '../src/hooks/useTodos';
import { formatDateKey } from '../src/utils';

const SCREEN_HEIGHT = Dimensions.get('window').height;
// 估算的顶部高度 (Header + Week row approx offset)
// 实际可以根据 CalendarWidget 内部布局调整，这里预设一个合理值让它盖住日历部分但露出Header
const SHEET_TOP_OFFSET = 120; 

export default function HomeScreen() {
  const { todos, addTodo, toggleTodo, deleteTodo } = useTodos();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isTodoVisible, setIsTodoVisible] = useState(false);

  const translateY = useSharedValue(SCREEN_HEIGHT);

  useEffect(() => {
    if (isTodoVisible) {
      translateY.value = withSpring(SHEET_TOP_OFFSET, {
        damping: 20,
        stiffness: 90
      });
    } else {
      translateY.value = withTiming(SCREEN_HEIGHT, { duration: 300 });
    }
  }, [isTodoVisible]);

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
    <View style={{ flex: 1, backgroundColor: 'black' }}>
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
                        onDoubleSelect={() => setIsTodoVisible(true)}
                    />
                </View>

                {/* 待办列表 (滑动面板) */}
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
                            onPress={() => setIsTodoVisible(false)}
                            className="p-1"
                        >
                            <ChevronDown size={24} color="#9ca3af" />
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
            </SafeAreaView>
        </BlurView>
      </ImageBackground>
    </View>
  );
}