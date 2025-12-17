import { Calendar, Inbox, Plus, Search } from 'lucide-react-native';
import React, { useState } from 'react';
import { ScrollView, StatusBar, Text, TouchableOpacity, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import MonthView from '../src/components/Calendar/MonthView';
import YearView from '../src/components/Calendar/YearView';
import { TodoItem } from '../src/components/Todo/TodoItem';
import { TodoModal } from '../src/components/Todo/TodoModal';
import { useTodos } from '../src/hooks/useTodos';
import { Todo } from '../src/types';
import { formatDateKey } from '../src/utils';

export default function HomeScreen() {
  const { todos, addTodo, toggleTodo, updateTodo, deleteTodo } = useTodos();
  const [viewMode, setViewMode] = useState<'year' | 'month'>('month');
  
  // currentDate 控制视图显示的月份/年份
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // selectedDate 控制用户点击选中的日期
  const [selectedDate, setSelectedDate] = useState(new Date());

  const selectedDateKey = formatDateKey(selectedDate);
  const selectedTodos = todos.filter(t => t.targetDate === selectedDateKey);

  const [isModalVisible, setModalVisible] = useState(false);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);

  const handleAddTodo = () => {
      setEditingTodo(null);
      setModalVisible(true);
  };

  const handleEditTodo = (todo: Todo) => {
      setEditingTodo(todo);
      setModalVisible(true);
  };

  const handleSaveTodo = (text: string) => {
      if (editingTodo) {
          updateTodo(editingTodo.id, text);
      } else {
          addTodo(text, selectedDateKey);
      }
  };

  const handleDoubleSelect = (date: Date) => {
      setSelectedDate(date);
      setTimeout(() => {
          setEditingTodo(null);
          setModalVisible(true);
      }, 50);
  };

  const handleMonthSelectFromYear = (date: Date) => {
    setCurrentDate(date); // 更新视图到选中的月份
    setViewMode('month');
  };

  const handleBackToYear = (date?: Date) => {
    // 回退时，保持在当前选中的年份
    if (date) {
        setCurrentDate(date);
    }
    setViewMode('year');
  };

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: 'black' }}>
      <StatusBar barStyle="light-content" />
      
      {/* 主视图区域 */}
      <View style={{ flex: 1 }}>
        {viewMode === 'year' ? (
            <YearView 
                key={currentDate.getFullYear()} // 年份变化时重置
                initialYear={currentDate.getFullYear()} 
                onMonthSelect={handleMonthSelectFromYear}
                currentDate={new Date()} 
            />
        ) : (
            <MonthView 
                key={currentDate.toISOString()} // 日期变化时重置视图
                initialDate={currentDate}
                selectedDate={selectedDate}
                onDateSelect={setSelectedDate}
                onDoubleSelect={handleDoubleSelect}
                onBackToYear={handleBackToYear}
                todos={todos}
            />
        )}
      </View>

      {/* --- 悬浮 UI --- */}

      {/* 顶部右侧工具栏 */}
      <View 
        style={{ 
            position: 'absolute', 
            top: 56, 
            right: 16, 
            flexDirection: 'row', 
            gap: 12, 
            backgroundColor: '#1c1c1e', 
            paddingHorizontal: 16, 
            paddingVertical: 8, 
            borderRadius: 9999, 
            borderColor: 'rgba(255,255,255,0.1)', 
            borderWidth: 1,
            shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4
        }}
      >
        <TouchableOpacity>
            <Calendar size={20} color="white" />
        </TouchableOpacity>
        <TouchableOpacity style={{ marginLeft: 12 }}>
            <Search size={20} color="white" />
        </TouchableOpacity>
        <TouchableOpacity style={{ marginLeft: 12 }} onPress={handleAddTodo}>
            <Plus size={20} color="white" />
        </TouchableOpacity>
      </View>

      {/* 底部栏 */}
      <View style={{ 
          position: 'absolute', 
          bottom: 32, 
          left: 24, 
          right: 24, 
          flexDirection: 'row', 
          justifyContent: 'space-between', 
          alignItems: 'center' 
        }}>
        {/* 今天按钮 */}
        <TouchableOpacity 
            style={{ 
                backgroundColor: '#1c1c1e', 
                paddingHorizontal: 20, 
                paddingVertical: 12, 
                borderRadius: 9999, 
                borderColor: 'rgba(255,255,255,0.1)', 
                borderWidth: 1 
            }}
            onPress={() => {
                const now = new Date();
                setSelectedDate(now);
                setCurrentDate(now);
                // 如果在年视图，可能需要跳转到月视图？或者只是滚动到今年？
                // 简单起见，点击今天回到月视图
                setViewMode('month');
            }}
        >
            <Text style={{ color: 'white', fontWeight: '500' }}>今天</Text>
        </TouchableOpacity>

        {/* 模式切换 (日历/待办) */}
        <View style={{ 
            flexDirection: 'row', 
            backgroundColor: '#1c1c1e', 
            borderRadius: 9999, 
            borderColor: 'rgba(255,255,255,0.1)', 
            borderWidth: 1, 
            padding: 4 
        }}>
            <TouchableOpacity style={{ paddingHorizontal: 16, paddingVertical: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 9999 }}>
                <Calendar size={20} color="white" />
            </TouchableOpacity>
            <TouchableOpacity style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
                <Inbox size={20} color="white" />
            </TouchableOpacity>
        </View>
      </View>

      {/* 无日程提示 (仅在月视图且无待办时显示?) 
          根据图1，它显示在屏幕下方区域。
          我们可以做一个绝对定位的层，或者集成在 MonthView 里。
          为了简单，这里做一个悬浮层，但要注意不要遮挡日期。
          如果 MonthView 是全屏的，这个提示应该在底部留白区域。
          目前 MonthView 也是全屏的，所以这个提示可以作为 Overlay。
      */}
      {viewMode === 'month' && (
          <View pointerEvents="box-none" style={{ position: 'absolute', top: 580, bottom: 80, width: '100%', paddingHorizontal: 24 }}>
              {selectedTodos.length > 0 ? (
                  <ScrollView style={{ width: '100%' }} showsVerticalScrollIndicator={false}>
                      {selectedTodos.map(todo => (
                          <TodoItem 
                              key={todo.id} 
                              todo={todo} 
                              onToggle={toggleTodo} 
                              onDelete={deleteTodo}
                              onEdit={handleEditTodo}
                          />
                      ))}
                  </ScrollView>
              ) : (
                  <View style={{ alignItems: 'center', marginTop: 20 }}>
                      <Text style={{ color: 'rgba(255,255,255,0.3)', fontWeight: '500', fontSize: 18 }}>无日程</Text>
                  </View>
              )}
          </View>
      )}
      
      <TodoModal 
        visible={isModalVisible}
        onClose={() => setModalVisible(false)}
        onSave={handleSaveTodo}
        initialText={editingTodo?.text}
        isEditing={!!editingTodo}
      />
    </GestureHandlerRootView>
  );
}
