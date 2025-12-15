import { BlurView } from 'expo-blur';
import React, { useMemo, useState } from 'react';
import { ImageBackground, StatusBar, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CalendarWidget from '../src/components/Calendar/CalendarWidget';
import AgendaList from '../src/components/Todo/AgendaList';
import { useTodos } from '../src/hooks/useTodos';
import { formatDateKey } from '../src/utils';

export default function HomeScreen() {
  const { todos, addTodo, toggleTodo, deleteTodo } = useTodos();
  const [selectedDate, setSelectedDate] = useState(new Date());

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
                {/* 上半部分：日历 (固定高度) */}
                <View style={{ height: 420 }}>
                    <CalendarWidget
                        todos={todos}
                        selectedDate={selectedDate}
                        onDateSelect={setSelectedDate}
                    />
                </View>

                {/* 下半部分：待办列表 (自动填充剩余空间) */}
                <View
                  style={{
                    flex: 1,
                    backgroundColor: '#1a1b1e',
                    borderTopLeftRadius: 24,
                    borderTopRightRadius: 24,
                    overflow: 'hidden',
                    shadowColor: '#000',
                    shadowOpacity: 0.5,
                    shadowRadius: 24,
                    borderTopWidth: 1,
                    borderTopColor: 'rgba(255,255,255,0.1)'
                  }}
                >
                    <AgendaList
                        dateKey={selectedDateKey}
                        todos={currentTodos}
                        onAdd={(text) => addTodo(text, selectedDateKey)}
                        onToggle={toggleTodo}
                        onDelete={deleteTodo}
                    />
                </View>
            </SafeAreaView>
        </BlurView>
      </ImageBackground>
    </View>
  );
}