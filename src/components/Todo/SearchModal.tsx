import React, { useEffect, useRef, useState } from 'react';
import { Alert, FlatList, KeyboardAvoidingView, Modal, Platform, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Animated, { Easing, FadeIn, Layout, ZoomIn } from 'react-native-reanimated';
import { Todo } from '../../types';
import { formatDateKey } from '../../utils';

interface SearchModalProps {
  visible: boolean;
  onClose: () => void;
  todos: Todo[];
  onSelectTodo: (date: string) => void;
  onDeleteAll: () => void;
}

export const SearchModal = ({ visible, onClose, todos, onSelectTodo, onDeleteAll }: SearchModalProps) => {
  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState<Todo[]>([]);
  const inputRef = useRef<TextInput>(null);
  
  const total = todos.length;
  const completedCount = todos.filter(t => t.completed).length;
  const uncompletedCount = total - completedCount;

  // 渲染控制：先展开容器，再显示内容
  const [shouldRenderContent, setShouldRenderContent] = useState(false);

  const getSortedTodos = (todoList: Todo[]) => {
      return [...todoList].sort((a, b) => {
          // 第一优先级：按日期降序
          const dateDiff = b.targetDate.localeCompare(a.targetDate);
          if (dateDiff !== 0) return dateDiff;
          
          // 第二优先级：未完成排在已完成前面
          // completed: false (0) -> completed: true (1)
          // a.completed (false) - b.completed (true) = 0 - 1 = -1 (a 排在 b 前面)
          // a.completed (true) - b.completed (false) = 1 - 0 = 1 (b 排在 a 前面)
          return (Number(a.completed) - Number(b.completed));
      });
  };

  useEffect(() => {
    if (visible) {
      setSearchText('');
      // 默认按日期降序显示所有待办
      setSearchResults(getSortedTodos(todos));
      setShouldRenderContent(false);
      
      // 300ms 后显示内容（配合容器展开动画）
      const timer = setTimeout(() => {
        setShouldRenderContent(true);
        // 内容显示后聚焦
        // setTimeout(() => inputRef.current?.focus(), 50); // 移除自动聚焦，避免键盘遮挡列表
      }, 300);
      
      return () => clearTimeout(timer);
    } else {
        setShouldRenderContent(false);
    }
  }, [visible, todos]);

  useEffect(() => {
    const todayKey = formatDateKey(new Date());

    const filtered = todos.filter(t => {
        // 1. 文本匹配
        if (searchText.trim() && !t.text.toLowerCase().includes(searchText.toLowerCase())) {
            return false;
        }
        
        // 2. 过滤掉未来的长期待办 (User: "对于未来生成的，统一当没有处理")
        // 已完成的历史记录 isLongTerm 为 false，所以会被保留。
        // 当前/过期的 active instance (isLongTerm=true) targetDate <= todayKey，也会被保留。
        if (t.isLongTerm && t.targetDate > todayKey) {
            return false;
        }
        
        return true;
    });

    setSearchResults(getSortedTodos(filtered));
  }, [searchText, todos]);

  const handleSelect = (todo: Todo) => {
      onSelectTodo(todo.targetDate);
      onClose();
  };

  const handleDeleteAll = () => {
    Alert.alert(
        '删除全部待办',
        '确定要删除所有待办事项吗？此操作不可恢复。',
        [
            { text: '取消', style: 'cancel' },
            { 
                text: '删除', 
                style: 'destructive', 
                onPress: onDeleteAll 
            }
        ]
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}
      >
        <TouchableOpacity style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }} onPress={onClose} />
        
        {/* 弹窗容器：执行展开动画 */}
        <Animated.View 
            entering={ZoomIn.duration(250).easing(Easing.out(Easing.cubic))}
            layout={Layout.duration(250).easing(Easing.out(Easing.cubic))}
            style={{ width: '85%', backgroundColor: '#1c1c1e', borderRadius: 16, padding: 20, maxHeight: '80%', minHeight: 200, overflow: 'hidden' }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Text style={{ color: 'white', fontSize: 18, fontWeight: '600' }}>
              待办记录
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                <TouchableOpacity onPress={handleDeleteAll}>
                    <Text style={{ color: '#ef4444', fontSize: 16 }}>全部删除</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={onClose}>
                    <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 16 }}>关闭</Text>
                </TouchableOpacity>
            </View>
          </View>
          
          {/* 延迟渲染的内容区域 */}
          {shouldRenderContent ? (
              <Animated.View entering={FadeIn.duration(200)}>
                  {/* 统计信息 */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16, backgroundColor: '#2c2c2e', padding: 12, borderRadius: 8 }}>
                      <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>总计: {total}</Text>
                      <Text style={{ color: '#4ade80', fontSize: 13 }}>完成: {completedCount}</Text>
                      <Text style={{ color: '#fbbf24', fontSize: 13 }}>未完成: {uncompletedCount}</Text>
                  </View>

                  <TextInput
                    ref={inputRef}
                    style={{ 
                        backgroundColor: '#2c2c2e', 
                        color: 'white', 
                        padding: 12, 
                        borderRadius: 8, 
                        fontSize: 16,
                        marginBottom: 16,
                    }}
                    value={searchText}
                    onChangeText={setSearchText}
                    placeholder="搜索待办..."
                    placeholderTextColor="rgba(255,255,255,0.3)"
                  />
                  
                  <FlatList
                      data={searchResults}
                      keyExtractor={item => item.id}
                      keyboardShouldPersistTaps="always"
                      keyboardDismissMode="on-drag"
                      renderItem={({ item }) => (
                          <TouchableOpacity 
                              onPress={() => handleSelect(item)}
                              style={{ 
                                  padding: 12, 
                                  borderBottomWidth: 0.5, 
                                  borderBottomColor: 'rgba(255,255,255,0.1)',
                                  flexDirection: 'row',
                                  justifyContent: 'space-between',
                                  alignItems: 'center'
                              }}
                          >
                              <View style={{ flex: 1 }}>
                                  <Text style={{ color: 'white', fontSize: 16 }} numberOfLines={1}>{item.text}</Text>
                                  <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 4 }}>{item.targetDate}</Text>
                              </View>
                              <Text style={{ color: item.completed ? '#4ade80' : '#fbbf24', fontSize: 12 }}>
                                  {item.completed ? '已完成' : '未完成'}
                              </Text>
                          </TouchableOpacity>
                      )}
                      style={{ maxHeight: 300 }}
                      ListEmptyComponent={
                          <View style={{ alignItems: 'center', padding: 20 }}>
                              <Text style={{ color: 'rgba(255,255,255,0.3)' }}>
                                  {searchText ? '未找到相关待办' : '暂无待办记录'}
                              </Text>
                          </View>
                      }
                  />
              </Animated.View>
          ) : (
              // 占位区域
              <View style={{ minHeight: 150 }} />
          )}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
};
