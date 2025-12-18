import React, { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Text, TextInput, TouchableOpacity, View } from 'react-native';

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

  useEffect(() => {
    if (visible) {
      setText(initialText);
      // 延迟聚焦以确保 Modal 动画完成
      setTimeout(() => inputRef.current?.focus(), 100);
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
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}
      >
        <TouchableOpacity style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }} onPress={onClose} />
        
        <View style={{ width: '80%', backgroundColor: '#1c1c1e', borderRadius: 16, padding: 20 }}>
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
          
          <TextInput
            ref={inputRef}
            style={{ 
                backgroundColor: '#2c2c2e', 
                color: 'white', 
                padding: 12, 
                borderRadius: 8, 
                fontSize: 16,
                marginBottom: 16,
                minHeight: 100, // 增加高度
                textAlignVertical: 'top' // 文字置顶
            }}
            value={text}
            onChangeText={setText}
            placeholder="输入待办事项..."
            placeholderTextColor="rgba(255,255,255,0.3)"
            multiline={true} // 开启多行，解决中文输入法回车误触提交的问题
            // onSubmitEditing={handleSave} // 多行模式下回车是换行，不自动提交
            // returnKeyType="done"
          />
          
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12 }}>
            <TouchableOpacity onPress={onClose} style={{ padding: 8 }}>
                <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 16 }}>取消</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSave} style={{ padding: 8, backgroundColor: '#f97316', borderRadius: 8 }}>
                <Text style={{ color: 'white', fontWeight: '600', fontSize: 16 }}>保存</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};
