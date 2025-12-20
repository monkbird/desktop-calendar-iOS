import React, { useRef } from 'react';
import { Pressable, Text, View } from 'react-native';
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from 'react-native-draggable-flatlist';
import { Swipeable } from 'react-native-gesture-handler';
import { Todo } from '../../types';
import { TodoItem } from './TodoItem';

interface DraggableTodoListProps {
  todos: Todo[];
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (todo: Todo) => void;
  onStar: (todo: Todo) => void;
  onPin: (todo: Todo) => void;
  onReorder: (todos: Todo[]) => void;
}

export function DraggableTodoList({ 
    todos, 
    onToggle, 
    onDelete, 
    onEdit, 
    onStar, 
    onPin,
    onReorder 
}: DraggableTodoListProps) {
  const activeRowRef = useRef<Swipeable | null>(null);

  const closeActiveRow = () => {
      activeRowRef.current?.close();
      activeRowRef.current = null;
  };

  const onRowOpen = (ref: Swipeable) => {
      if (activeRowRef.current && activeRowRef.current !== ref) {
          activeRowRef.current.close();
      }
      activeRowRef.current = ref;
  };
    
  const renderItem = ({ item, drag, isActive }: RenderItemParams<Todo>) => {
    return (
      <ScaleDecorator>
        <TodoItem 
            todo={item}
            onToggle={onToggle}
            onDelete={onDelete}
            onEdit={onEdit}
            onStar={onStar}
            onPin={onPin}
            drag={drag}
            onSwipeableOpen={onRowOpen}
            closeActiveRow={closeActiveRow}
        />
      </ScaleDecorator>
    );
  };

  if (todos.length === 0) {
      return (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 40 }}>
            <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 16 }}>无待办事项</Text>
        </View>
      );
  }

  return (
    <Pressable style={{ flex: 1 }} onPress={closeActiveRow}>
      <DraggableFlatList
        data={todos}
        onDragEnd={({ data }) => onReorder(data)}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        onScrollBeginDrag={closeActiveRow}
      />
    </Pressable>
  );
}
