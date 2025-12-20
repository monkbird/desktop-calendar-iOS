import { BlurView } from 'expo-blur';
import { FileSpreadsheet, Inbox, Plus, Search } from 'lucide-react-native';
import React, { useState } from 'react';
import { Alert, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { Easing, FadeIn, FadeOut, Keyframe, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import MonthView from '../src/components/Calendar/MonthView';
import YearView from '../src/components/Calendar/YearView';
import DateSelectionModal from '../src/components/Todo/DateSelectionModal';
import { DraggableTodoList } from '../src/components/Todo/DraggableTodoList';
import { ImportExportModal } from '../src/components/Todo/ImportExportModal';
import { SearchModal } from '../src/components/Todo/SearchModal';
import { TodoModal } from '../src/components/Todo/TodoModal';
import { AnimatedNumber } from '../src/components/UI/AnimatedNumber';
import { useTodos } from '../src/hooks/useTodos';
import { Todo } from '../src/types';
import { formatDateKey, getDateInfo } from '../src/utils';
import { exportTodosToExcel, importTodosFromExcel } from '../src/utils/fileHandler';

// 定义视图切换动画
// 进入月份 (Open/Expand): 年份变大消失，月份从小变大出现
const OpenMonthEnter = new Keyframe({
    0: { transform: [{ scale: 0.8 }], opacity: 0 },
    100: { transform: [{ scale: 1 }], opacity: 1 },
});
const OpenYearExit = new Keyframe({
    0: { transform: [{ scale: 1 }], opacity: 1 },
    100: { transform: [{ scale: 1.2 }], opacity: 0 },
});

// 返回年份 (Close/Gather): 月份变小消失，年份从大变小出现
const CloseMonthExit = new Keyframe({
    0: { transform: [{ scale: 1 }], opacity: 1 },
    100: { transform: [{ scale: 0.8 }], opacity: 0 },
});
const CloseYearEnter = new Keyframe({
    0: { transform: [{ scale: 1.2 }], opacity: 0 },
    100: { transform: [{ scale: 1 }], opacity: 1 },
});

export default function HomeScreen() {
  const { todos, addTodo, toggleTodo, updateTodo, updateTodoFields, deleteTodo, deleteAllTodos, reorderTodos, importTodos } = useTodos();
  const [viewMode, setViewMode] = useState<'year' | 'month'>('month');
  
  // currentDate 控制视图显示的月份/年份
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // 稳定的 "今天" 对象，避免 render 时重复创建
  const [today] = useState(() => new Date());
  
  // selectedDate 控制用户点击选中的日期
  const [selectedDate, setSelectedDate] = useState(new Date());

  // 当前视图的周数（用于自适应高度）
  const [weekCount, setWeekCount] = useState(5);


  const animatedStyle = useAnimatedStyle(() => {
    return {
      top: withTiming(560 + (weekCount - 5) * 65, {
        duration: 800,
        easing: Easing.out(Easing.cubic),
      }),
    };
  }, [weekCount]);

  const selectedDateKey = formatDateKey(selectedDate);
  // 获取今天的日期 Key，用于过滤逻辑
  const todayKey = formatDateKey(new Date());

  const selectedTodos = todos
    .reduce<Todo[]>((acc, t) => {
        // 0. 特殊过滤：已完成的长期待办，只显示在完成日期当天
        // (注意：新的逻辑中，完成的长期待办会生成一个 isLongTerm=false 的历史记录，所以这里的 checks 可能不再需要，
        // 但为了兼容旧数据或防止逻辑遗漏，保留也无妨。不过根据新逻辑，完成的 repeating todo 会被重置为未完成并推到下个月，
        // 同时生成一个 isLongTerm=false 的副本。所以 t.isLongTerm && t.completed 的情况应该不存在了（除非是 AllYear/Month？）)
        // 让我们先保留基本的 targetDate 匹配逻辑。

        // 1. 全年/全月 特殊逻辑 (已移除，根据用户需求，长期待办只显示在 targetDate)
                // 之前的逻辑会强制显示在 1 月 1 日或每月 1 日，这与 "Start/End Date" 的精确控制冲突。
                // 现在的 useTodos 钩子已经完善了 targetDate 的自动顺延和周期跳转逻辑，
                // 所以直接依赖下面的 targetDate 匹配即可。

        // 2. 通用匹配逻辑 (Normal + Repeating + LongTerm Range)
        // 现在重复待办由 useTodos 自动维护 targetDate (自动顺延/自动跳转下个月)，
        // 所以我们只需要匹配 targetDate 即可。不再需要投影计算。
        // 这也符合 "For future generated, treat as not existing" (因为 targetDate 还没到)
        // 以及 "Uncompleted defers" (targetDate 会随 performMigration 变更为 Today)
        
        if (t.targetDate === selectedDateKey) {
            acc.push(t);
        }
        
        return acc;
    }, [])
    .sort((a, b) => {
        // 1. Completed status (Uncompleted first)
        const aCompleted = Number(a.completed);
        const bCompleted = Number(b.completed);
        if (aCompleted !== bCompleted) return aCompleted - bCompleted;

        // 2. Pinned status (Pinned first)
        const aPinned = a.isPinned ? 1 : 0;
        const bPinned = b.isPinned ? 1 : 0;
        if (aPinned !== bPinned) return bPinned - aPinned;

        return 0;
    });

  const totalTodos = selectedTodos.length;
  const completedTodos = selectedTodos.filter(t => t.completed).length;
  const uncompletedTodos = totalTodos - completedTodos;

  const dateInfo = getDateInfo(selectedDate);

  const [isModalVisible, setModalVisible] = useState(false);
  const [isSearchVisible, setSearchVisible] = useState(false);
  const [isImportExportVisible, setImportExportVisible] = useState(false);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);

  const [dateSelectionModalVisible, setDateSelectionModalVisible] = useState(false);
  const [dateSelectionTodoId, setDateSelectionTodoId] = useState<string | null>(null);

  const handleSearchResultSelect = (dateString: string) => {
      // 解析日期 YYYY-MM-DD
      const [year, month, day] = dateString.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      
      setSelectedDate(date);
      setCurrentDate(date);
      setViewMode('month');
      setSearchVisible(false);
  };

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

  const handleExport = async () => {
      try {
          await exportTodosToExcel(todos);
      } catch (e) {
          Alert.alert('导出失败', String(e));
      }
  };

  const handleImport = async () => {
      try {
          const imported = await importTodosFromExcel();
          if (imported.length > 0) {
              importTodos(imported);
              Alert.alert('导入成功', `成功导入 ${imported.length} 条待办`);
          }
      } catch (e) {
          Alert.alert('导入失败', String(e));
      }
  };

  const handleStarTodo = (todo: Todo) => {
    setDateSelectionTodoId(todo.id);
    setDateSelectionModalVisible(true);
  };

  const handlePinTodo = (todo: Todo) => {
      updateTodoFields(todo.id, { isPinned: !todo.isPinned });
  };

  const handleDateSelectionSave = (data: { startDate: string; endDate: string; isAllDay: boolean; isAllYear: boolean; isMonth: boolean }) => {
    const { startDate, endDate, isAllDay, isAllYear, isMonth } = data;
    if (dateSelectionTodoId) {
        updateTodoFields(dateSelectionTodoId, {
            isLongTerm: true,
            startDate,
            endDate,
            isAllDay,
            isAllYear,
            isMonth
        });
    }
    setDateSelectionModalVisible(false);
    setDateSelectionTodoId(null);
  };

  const selectedTodoForModal = todos.find(t => t.id === dateSelectionTodoId);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: 'black' }}>
      <StatusBar barStyle="light-content" />
      
      {/* 主视图区域 */}
      <View style={{ flex: 1 }}>
        {viewMode === 'year' ? (
            <Animated.View 
                key="year"
                style={[StyleSheet.absoluteFill, { zIndex: 1 }]}
                entering={CloseYearEnter.duration(300)}
                exiting={OpenYearExit.duration(300)}
            >
                <YearView 
                    key={currentDate.getFullYear()} // 年份变化时重置
                    initialYear={currentDate.getFullYear()} 
                    onMonthSelect={handleMonthSelectFromYear}
                    currentDate={today} 
                    todos={todos}
                />
            </Animated.View>
        ) : (
            <Animated.View 
                key="month"
                style={[StyleSheet.absoluteFill, { zIndex: 1 }]}
                entering={OpenMonthEnter.duration(300)}
                exiting={CloseMonthExit.duration(300)}
            >
                <MonthView 
                    // Removed key to prevent re-mounting on date change, enabling scroll animation
                    initialDate={currentDate}
                    selectedDate={selectedDate}
                    onDateSelect={setSelectedDate}
                    onDoubleSelect={handleDoubleSelect}
                    onBackToYear={handleBackToYear}
                    onWeekCountChange={setWeekCount}
                    todos={todos}
                />
            </Animated.View>
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
            shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4,
            zIndex: 100
        }}
      >
        <TouchableOpacity onPress={() => setImportExportVisible(true)}>
            <FileSpreadsheet size={20} color="white" />
        </TouchableOpacity>
        <TouchableOpacity style={{ marginLeft: 12 }} onPress={handleAddTodo}>
            <Plus size={20} color="white" />
        </TouchableOpacity>
      </View>



      {/* 无日程提示 (仅在月视图且无待办时显示?) 
          根据图1，它显示在屏幕下方区域。
          我们可以做一个绝对定位的层，或者集成在 MonthView 里。
          为了简单，这里做一个悬浮层，但要注意不要遮挡日期。
          如果 MonthView 是全屏的，这个提示应该在底部留白区域。
          目前 MonthView 也是全屏的，所以这个提示可以作为 Overlay。
      */}
      {viewMode === 'month' && (
          <Animated.View pointerEvents="box-none" style={[{ position: 'absolute', bottom: 0, width: '100%', zIndex: 10 }, animatedStyle]}>
              <BlurView intensity={20} tint="dark" style={{ borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden', flex: 1 }}>
                  <View style={{ 
                      flexDirection: 'row', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      paddingVertical: 12,
                      paddingHorizontal: 16,
                      borderBottomWidth: 0.5,
                      borderBottomColor: 'rgba(255,255,255,0.1)'
                  }}>
                      {/* 左侧：日期信息 */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                          <Text style={{ color: 'white', fontSize: 16, fontWeight: '600', marginRight: 8 }}>
                              {selectedDate.getMonth() + 1}月{selectedDate.getDate()}日
                          </Text>
                          <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, marginRight: 8 }}>
                              {dateInfo.fullLunar}
                          </Text>
                          {(dateInfo.term || dateInfo.festival) ? (
                            <Text style={{ color: '#f87171', fontSize: 10, flexShrink: 1 }}>
                                {dateInfo.festival || dateInfo.term}
                            </Text>
                        ) : null}
                      </View>

                      {/* 中间分隔线 */}
                      <View style={{ width: 1, height: 16, backgroundColor: 'rgba(255,255,255,0.2)', marginHorizontal: 12 }} />

                      {/* 右侧：待办统计 */}
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginRight: 4 }}>待办</Text>
                          <View style={{ marginRight: 8 }}>
                            <AnimatedNumber value={totalTodos} style={{ fontSize: 12, color: '#f87171', fontWeight: 'bold' }} />
                          </View>
                          
                          <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', marginRight: 8 }}>|</Text>

                          <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginRight: 4 }}>完成</Text>
                          <View style={{ marginRight: 8 }}>
                            <AnimatedNumber value={completedTodos} style={{ fontSize: 12, color: '#4ade80', fontWeight: 'bold' }} />
                          </View>

                          <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', marginRight: 8 }}>|</Text>

                          <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginRight: 4 }}>未完成</Text>
                          <AnimatedNumber value={uncompletedTodos} style={{ fontSize: 12, color: '#fbbf24', fontWeight: 'bold' }} />
                      </View>
                  </View>
                  <View style={{ flex: 1, overflow: 'hidden' }}>
                    <Animated.View
                        key={selectedDateKey}
                        entering={FadeIn.duration(400).delay(100)}
                        exiting={FadeOut.duration(400)}
                        style={[StyleSheet.absoluteFill]}
                    >
                      <DraggableTodoList 
                          todos={selectedTodos}
                          onToggle={toggleTodo} 
                          onDelete={deleteTodo}
                          onEdit={handleEditTodo}
                          onStar={handleStarTodo}
                          onPin={handlePinTodo}
                          onReorder={reorderTodos}
                      />
                    </Animated.View>
                  </View>
              </BlurView>
          </Animated.View>
      )}

      {/* 底部栏 */}
      <View style={{ 
          position: 'absolute', 
          bottom: 32, 
          left: 24, 
          right: 24, 
          flexDirection: 'row', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          zIndex: 50
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
            <TouchableOpacity 
                style={{ paddingHorizontal: 16, paddingVertical: 8 }}
                onPress={() => setSearchVisible(true)}
            >
                <Search size={20} color="white" />
            </TouchableOpacity>
            <TouchableOpacity style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
                <Inbox size={20} color="white" />
            </TouchableOpacity>
        </View>
      </View>
      
      <DateSelectionModal 
        visible={dateSelectionModalVisible}
        onClose={() => setDateSelectionModalVisible(false)}
        onSave={handleDateSelectionSave}
        todo={selectedTodoForModal}
      />

      <TodoModal 
        visible={isModalVisible}
        onClose={() => setModalVisible(false)}
        onSave={handleSaveTodo}
        initialText={editingTodo?.text}
        isEditing={!!editingTodo}
        date={selectedDate}
      />
      
      <SearchModal 
        visible={isSearchVisible}
        onClose={() => setSearchVisible(false)}
        todos={todos}
        onSelectTodo={handleSearchResultSelect}
        onDeleteAll={deleteAllTodos}
      />

      <ImportExportModal 
        visible={isImportExportVisible}
        onClose={() => setImportExportVisible(false)}
        onImport={handleImport}
        onExport={handleExport}
      />
    </GestureHandlerRootView>
  );
}
