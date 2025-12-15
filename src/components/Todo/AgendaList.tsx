import { CheckCircle2, Circle, Plus, Trash2 } from 'lucide-react-native';
import React, { useState } from 'react';
import {
    FlatList,
    KeyboardAvoidingView,
    Platform,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { Todo } from '../../types';

interface AgendaListProps {
  dateKey: string;
  todos: Todo[];
  onAdd: (text: string) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

export default function AgendaList({
  dateKey,
  todos,
  onAdd,
  onToggle,
  onDelete
}: AgendaListProps) {
  const [text, setText] = useState('');

  const handleAdd = () => {
    const value = text.trim();
    if (!value) return;
    onAdd(value);
    setText('');
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={{ flex: 1 }}>
        <View
          style={{
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: 'rgba(255,255,255,0.1)',
            flexDirection: 'row',
            alignItems: 'flex-end',
            justifyContent: 'space-between'
          }}
        >
          <View>
            <Text style={{ color: '#ffffff', fontSize: 18, fontWeight: '600' }}>
              待办事项
            </Text>
            <Text
              style={{
                marginTop: 4,
                fontSize: 12,
                color: 'rgba(255,255,255,0.5)'
              }}
            >
              {dateKey} · 共 {todos.length} 项
            </Text>
          </View>
        </View>

        <FlatList
          data={todos}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12, gap: 8 }}
          ListEmptyComponent={
            <View
              style={{
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: 48
              }}
            >
              <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)' }}>
                今天还没有待办，添加一个吧
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: 'rgba(255,255,255,0.05)',
                borderRadius: 16,
                paddingHorizontal: 12,
                paddingVertical: 8,
                marginBottom: 8,
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.05)'
              }}
            >
              <TouchableOpacity
                onPress={() => onToggle(item.id)}
                style={{ marginRight: 12 }}
                hitSlop={8}
              >
                {item.completed ? (
                  <CheckCircle2 size={20} color="#22c55e" />
                ) : (
                  <Circle size={20} color="#64748b" />
                )}
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <Text
                  style={
                    item.completed
                      ? {
                          fontSize: 14,
                          color: '#94a3b8',
                          textDecorationLine: 'line-through'
                        }
                      : {
                          fontSize: 14,
                          color: '#f1f5f9'
                        }
                  }
                  numberOfLines={2}
                >
                  {item.text}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => onDelete(item.id)}
                style={{
                  marginLeft: 12,
                  padding: 4,
                  borderRadius: 999,
                  backgroundColor: 'rgba(255,255,255,0.05)'
                }}
                hitSlop={8}
              >
                <Trash2 size={16} color="#f97373" />
              </TouchableOpacity>
            </View>
          )}
        />

        <View
          style={{
            paddingHorizontal: 16,
            paddingBottom: 16,
            paddingTop: 8,
            borderTopWidth: 1,
            borderTopColor: 'rgba(255,255,255,0.1)',
            backgroundColor: 'rgba(0,0,0,0.4)'
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: 'rgba(255,255,255,0.08)',
              borderRadius: 16,
              paddingHorizontal: 12,
              paddingVertical: 10
            }}
          >
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="输入待办事项..."
              placeholderTextColor="#64748b"
              onSubmitEditing={handleAdd}
              returnKeyType="done"
              style={{
                flex: 1,
                fontSize: 14,
                color: '#ffffff',
                marginRight: 8
              }}
            />
            <TouchableOpacity
              onPress={handleAdd}
              disabled={!text.trim()}
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: text.trim()
                  ? '#22c55e'
                  : 'rgba(255,255,255,0.1)'
              }}
            >
              <Plus
                size={18}
                color={text.trim() ? '#0b1120' : '#64748b'}
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
