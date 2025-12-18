import React, { useEffect, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Modal, Platform, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Animated, { Easing, FadeIn, Layout, ZoomIn } from 'react-native-reanimated';
import { Todo } from '../../types';

interface SearchModalProps {
  visible: boolean;
  onClose: () => void;
  todos: Todo[];
  onSelectTodo: (date: string) => void;
}

export const SearchModal = ({ visible, onClose, todos, onSelectTodo }: SearchModalProps) => {
  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState<Todo[]>([]);
  const inputRef = useRef<TextInput>(null);
  
  // 渲染控制：先展开容器，再显示内容
  const [shouldRenderContent, setShouldRenderContent] = useState(false);

  useEffect(() => {
    if (visible) {
      setSearchText('');
      setSearchResults([]);
      setShouldRenderContent(false);
      
      // 300ms 后显示内容（配合容器展开动画）
      const timer = setTimeout(() => {
        setShouldRenderContent(true);
        // 内容显示后聚焦
        setTimeout(() => inputRef.current?.focus(), 50);
      }, 300);
      
      return () => clearTimeout(timer);
    } else {
        setShouldRenderContent(false);
    }
  }, [visible]);

  useEffect(() => {
    if (!searchText.trim()) {
        setSearchResults([]);
        return;
    }
    const results = todos.filter(todo => 
        todo.text.toLowerCase().includes(searchText.toLowerCase())
    );
    setSearchResults(results);
  }, [searchText, todos]);

  const handleSelect = (todo: Todo) => {
      onSelectTodo(todo.targetDate);
      onClose();
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
              搜索待办
            </Text>
            <TouchableOpacity onPress={onClose}>
                <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 16 }}>关闭</Text>
            </TouchableOpacity>
          </View>
          
          {/* 延迟渲染的内容区域 */}
          {shouldRenderContent ? (
              <Animated.View entering={FadeIn.duration(200)}>
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
                    placeholder="输入关键字搜索..."
                    placeholderTextColor="rgba(255,255,255,0.3)"
                  />
                  
                  {searchResults.length > 0 ? (
                      <FlatList
                          data={searchResults}
                          keyExtractor={item => item.id}
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
                      />
                  ) : (
                      searchText.trim() ? (
                          <View style={{ alignItems: 'center', padding: 20 }}>
                              <Text style={{ color: 'rgba(255,255,255,0.3)' }}>未找到相关待办</Text>
                          </View>
                      ) : null
                  )}
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
