import * as Haptics from 'expo-haptics';
import { GripVertical, Pin, Star, Trash2 } from 'lucide-react-native';
import React, { useRef } from 'react';
import { Alert, Animated, Share, Text, TouchableOpacity, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Todo } from '../../types';

interface TodoItemProps {
  todo: Todo;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (todo: Todo) => void;
  onStar: (todo: Todo) => void;
  onPin: (todo: Todo) => void;
  drag?: () => void;
  onSwipeableOpen?: (ref: Swipeable) => void;
  closeActiveRow?: () => void;
}

export const TodoItem = ({ todo, onToggle, onDelete, onEdit, onStar, onPin, drag, onSwipeableOpen, closeActiveRow }: TodoItemProps) => {
  const lastPress = useRef(0);
  const swipeableRef = useRef<Swipeable>(null);
  const [isOpen, setIsOpen] = React.useState(false);
  
  // Capture dragX for inline star animation
  const [dragX, setDragX] = React.useState<Animated.AnimatedInterpolation<number> | null>(null);

  // Helper component to capture dragX asynchronously to avoid "update during render" error
  const DragXCapture = React.useMemo(() => {
    return ({ dx, onUpdate }: { dx: Animated.AnimatedInterpolation<number>, onUpdate: (val: Animated.AnimatedInterpolation<number>) => void }) => {
      React.useEffect(() => {
        onUpdate(dx);
      }, [dx, onUpdate]);
      return null;
    };
  }, []);

  const handlePress = () => {
    if (isOpen) {
        swipeableRef.current?.close();
        return;
    }
    // Close any other open row
    closeActiveRow?.();
    
    const now = Date.now();
    if (now - lastPress.current < 500) {
      onEdit(todo);
    }
    lastPress.current = now;
  };

  const handleLongPress = async () => {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const result = await Share.share({
        message: todo.text,
      });
      if (result.action === Share.sharedAction) {
        // 分享成功
      }
    } catch (error) {
      Alert.alert('操作失败', '无法调用系统分享');
    }
  };

  const renderLeftActions = (_: Animated.AnimatedInterpolation<number>, dragX: Animated.AnimatedInterpolation<number>) => {
      const scale = dragX.interpolate({
        inputRange: [0, 100],
        outputRange: [0, 1],
        extrapolate: 'clamp',
      });
  
      return (
        <TouchableOpacity 
          onLongPress={drag}
          delayLongPress={100}
          style={{ justifyContent: 'center', alignItems: 'center', width: 80 }}
        >
          <Animated.View style={{ transform: [{ scale }] }}>
            <GripVertical size={24} color="#a1a1aa" />
          </Animated.View>
        </TouchableOpacity>
      );
    };

  const renderRightActions = (_: Animated.AnimatedInterpolation<number>, dx: Animated.AnimatedInterpolation<number>) => {
    const scale = dx.interpolate({
      inputRange: [-100, 0],
      outputRange: [1, 0],
      extrapolate: 'clamp',
    });

    return (
      <View style={{ flexDirection: 'row', width: 210 }}>
        <DragXCapture dx={dx} onUpdate={setDragX} />
        <TouchableOpacity onPress={() => onPin(todo)} style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Animated.View style={{ transform: [{ scale }] }}>
            <Pin size={24} color={todo.isPinned ? "#22c55e" : "#9ca3af"} fill={todo.isPinned ? "#22c55e" : "none"} />
            </Animated.View>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onStar(todo)} style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Animated.View style={{ transform: [{ scale }] }}>
            <Star size={24} color={todo.isLongTerm ? "#fbbf24" : "#9ca3af"} fill={todo.isLongTerm ? "#fbbf24" : "none"} />
            </Animated.View>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onDelete(todo.id)} style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Animated.View style={{ transform: [{ scale }] }}>
            <Trash2 size={24} color="#ef4444" />
            </Animated.View>
        </TouchableOpacity>
      </View>
    );
  };

  // Calculate inline star opacity: fade out when swiping left
  const rowStarOpacity = dragX ? dragX.interpolate({
    inputRange: [-80, 0], // Start fading after 0, fully gone at -80
    outputRange: [0, 1],
    extrapolate: 'clamp',
  }) : 1;

  // Check if todo is duration-based (Month/Year) which cannot be manually completed
  const isDurationTodo = todo.isMonth || todo.isAllYear;

  const todayStr = new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0') + '-' + String(new Date().getDate()).padStart(2, '0');

    return (
    <Swipeable 
        ref={swipeableRef}
        renderRightActions={renderRightActions}
        renderLeftActions={renderLeftActions}
        onSwipeableWillOpen={() => onSwipeableOpen?.(swipeableRef.current!)}
        onSwipeableOpen={() => setIsOpen(true)}
        onSwipeableClose={() => setIsOpen(false)}
    >
      <TouchableOpacity 
        onPress={handlePress}
        onLongPress={handleLongPress}
        activeOpacity={1}
        style={{ 
            flexDirection: 'row', 
            alignItems: 'center', 
            paddingVertical: 12,
            // backgroundColor: 'black' 
        }}
      >
        <TouchableOpacity 
            onPress={() => !isDurationTodo && onToggle(todo.id)}
            activeOpacity={isDurationTodo ? 1 : 0.7}
            style={{ 
                width: 20, 
                height: 20, 
                borderRadius: 9999, 
                borderWidth: 2,
                borderColor: isDurationTodo 
                    ? '#fbbf24' // Yellow for duration todos
                    : (todo.completed ? 'rgba(255,255,255,0.3)' : '#f97316'),
                backgroundColor: todo.completed ? 'rgba(255,255,255,0.3)' : 'transparent',
                marginRight: 12,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: isDurationTodo ? 0.8 : 1
            }}
        >
            {todo.completed && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: 'black' }} />}
            {isDurationTodo && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#fbbf24' }} />}
        </TouchableOpacity>
        
        <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {todo.isPinned && (
                    <Pin size={14} color="#22c55e" style={{ marginRight: 4 }} fill="#22c55e" />
                )}
                <Text 
                style={{ 
                    color: todo.completed 
                        ? 'rgba(255,255,255,0.3)' 
                        : (todo.endDate && todo.endDate < todayStr
                            ? '#ef4444' // Red for overdue
                            : 'white'), 
                    fontSize: 16,
                    fontWeight: '500',
                    textDecorationLine: todo.completed ? 'line-through' : 'none',
                    flex: 1
                }}>
                    {todo.text}
                </Text>
            </View>
            {todo.isLongTerm && (
                <Text style={{ 
                    fontSize: 12, 
                    color: (todo.endDate && todo.endDate < todayStr && !todo.completed)
                        ? '#ef4444' 
                        : '#fbbf24', 
                    marginTop: 2 
                }}>
                    {todo.isAllYear 
                        ? '全年' 
                        : todo.isMonth 
                            ? '本月' 
                            : (todo.startDate && todo.endDate 
                                ? `${todo.startDate.split('T')[0]} - ${todo.endDate.split('T')[0]}`
                                : '')
                    }
                    {(todo.endDate && todo.endDate < todayStr && !todo.completed) ? ' (已超时)' : ''}
                </Text>
            )}
        </View>

        {todo.isLongTerm && (
            <Animated.View style={{ opacity: rowStarOpacity }}>
                <Star size={16} color="#fbbf24" fill="#fbbf24" style={{ marginLeft: 8 }} />
            </Animated.View>
        )}
      </TouchableOpacity>
    </Swipeable>
  );
};
