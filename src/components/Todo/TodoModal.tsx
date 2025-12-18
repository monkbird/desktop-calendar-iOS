import React, { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Animated, { Easing, FadeIn, Layout, ZoomIn } from 'react-native-reanimated';

interface TodoModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (text: string) => void;
  initialText?: string;
  isEditing?: boolean;
  date?: Date;
}

export const TodoModal = ({ visible, onClose, onSave, initialText = '', isEditing = false, date }: TodoModalProps) => {
  const [text, setText] = useState(initialText);
  const inputRef = useRef<TextInput>(null);
  
  // 渲染控制：先展开容器，再显示内容
  const [shouldRenderContent, setShouldRenderContent] = useState(false);

  useEffect(() => {
    if (visible) {
      setText(initialText);
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
  }, [visible, initialText]);

  const handleSave = () => {
    if (text.trim()) {
      onSave(text.trim());
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade" // 背景淡入淡出
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
            layout={Layout.duration(250).easing(Easing.out(Easing.cubic))} // 平滑处理高度变化，无回弹
            style={{ width: '80%', backgroundColor: '#1c1c1e', borderRadius: 16, padding: 20, minHeight: 200, overflow: 'hidden' }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Text style={{ color: 'white', fontSize: 18, fontWeight: '600' }}>
              {isEditing ? '编辑待办' : '新建待办'}
            </Text>
            {date && (
              <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>
                {date.getMonth() + 1}月{date.getDate()}日
              </Text>
            )}
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
                        minHeight: 100,
                        textAlignVertical: 'top'
                    }}
                    value={text}
                    onChangeText={setText}
                    placeholder="输入待办事项..."
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    multiline={true}
                  />
                  
                  <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12 }}>
                    <TouchableOpacity onPress={onClose} style={{ padding: 8 }}>
                        <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 16 }}>取消</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleSave} style={{ padding: 8, backgroundColor: '#f97316', borderRadius: 8 }}>
                        <Text style={{ color: 'white', fontWeight: '600', fontSize: 16 }}>保存</Text>
                    </TouchableOpacity>
                  </View>
              </Animated.View>
          ) : (
              // 占位区域，保持容器大小或显示加载状态
              <View style={{ minHeight: 150 }} />
          )}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
};
