import React from 'react';
import { Animated, Text, TouchableOpacity, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Trash2 } from 'lucide-react-native';
import { Todo } from '../../types';

interface TodoItemProps {
  todo: Todo;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (todo: Todo) => void;
}

export const TodoItem = ({ todo, onToggle, onDelete, onEdit }: TodoItemProps) => {
  const renderRightActions = (_: Animated.AnimatedInterpolation<number>, dragX: Animated.AnimatedInterpolation<number>) => {
    const scale = dragX.interpolate({
      inputRange: [-100, 0],
      outputRange: [1, 0],
      extrapolate: 'clamp',
    });

    return (
      <TouchableOpacity onPress={() => onDelete(todo.id)} style={{ justifyContent: 'center', alignItems: 'center', width: 80 }}>
        <Animated.View style={{ transform: [{ scale }] }}>
          <Trash2 size={24} color="#ef4444" />
        </Animated.View>
      </TouchableOpacity>
    );
  };

  return (
    <Swipeable renderRightActions={renderRightActions}>
      <TouchableOpacity 
        onPress={() => onEdit(todo)}
        style={{ 
            flexDirection: 'row', 
            alignItems: 'center', 
            paddingVertical: 12,
            backgroundColor: 'black' // 确保背景色遮挡
        }}
      >
        <TouchableOpacity 
            onPress={() => onToggle(todo.id)}
            style={{ 
                width: 20, 
                height: 20, 
                borderRadius: 9999, 
                borderWidth: 2,
                borderColor: todo.completed ? 'rgba(255,255,255,0.3)' : '#f97316',
                backgroundColor: todo.completed ? 'rgba(255,255,255,0.3)' : 'transparent',
                marginRight: 12,
                alignItems: 'center',
                justifyContent: 'center'
            }}
        >
            {todo.completed && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: 'black' }} />}
        </TouchableOpacity>
        
        <Text 
          numberOfLines={1} 
          style={{ 
            color: todo.completed ? 'rgba(255,255,255,0.3)' : 'white', 
            fontSize: 16,
            fontWeight: '500',
            textDecorationLine: todo.completed ? 'line-through' : 'none',
            flex: 1
        }}>
            {todo.text}
        </Text>
      </TouchableOpacity>
    </Swipeable>
  );
};
