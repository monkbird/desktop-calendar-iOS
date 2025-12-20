import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { supabase } from '../supabase';
import { SyncAction, Todo } from '../types';
import { formatDateKey } from '../utils';

const STORAGE_KEY_TODOS = 'ios-calendar-todos-v1';
const STORAGE_KEY_QUEUE = 'ios-calendar-sync-queue';

// 纯函数：执行迁移逻辑
const performMigration = (inputTodos: Todo[]) => {
  const todayKey = formatDateKey(new Date());
  let hasChanges = false;
  let migrationCount = 0;
  const newSyncActions: SyncAction[] = [];
  const now = Date.now();

  const newTodos = inputTodos.map(todo => {
      if (!todo.completed && todo.targetDate < todayKey) {
          console.log(`Migrating todo: ${todo.text} from ${todo.targetDate} to ${todayKey}`);
          hasChanges = true;
          migrationCount++;
          const updatedTodo = {
              ...todo,
              targetDate: todayKey,
              updatedAt: now
          };
          
          newSyncActions.push({
              id: todo.id,
              type: 'UPDATE',
              payload: { targetDate: todayKey, updatedAt: now },
              timestamp: now
          });
          
          return updatedTodo;
      }
      return todo;
  });

  return { newTodos, newSyncActions, hasChanges, migrationCount };
};

// 纯函数：检查并更新/生成重复待办
const checkAndRegenerateRepeatingTodos = (inputTodos: Todo[]) => {
  const today = new Date();
  const todayKey = formatDateKey(today);
  const now = Date.now();
  
  let hasChanges = false;
  const newSyncActions: SyncAction[] = [];
  // Use a map to track current state of todos.
  const todosMap = new Map(inputTodos.map(t => [t.id, t]));
  const addedTodos: Todo[] = [];

  // Helper to calculate next date preserving day of month
  const getNextDate = (dateStr: string, type: 'monthly' | 'yearly') => {
      const [y, m, d] = dateStr.split('-').map(Number);
      // Construct date. Note: dateStr is YYYY-MM-DD.
      const current = new Date(y, m - 1, d);
      let nextY = current.getFullYear();
      let nextM = current.getMonth();
      const day = current.getDate();

      if (type === 'monthly') {
          nextM++;
      } else {
          nextY++;
      }
      
      // Clamp day to month length
      const daysInMonth = new Date(nextY, nextM + 1, 0).getDate();
      const clampedDay = Math.min(day, daysInMonth);
      
      return formatDateKey(new Date(nextY, nextM, clampedDay));
  };

  inputTodos.forEach(todo => {
    if (todo.repeat !== 'monthly' && todo.repeat !== 'yearly') return;

    // 1. Calculate Next Cycle Start
    // Use startDate if available as anchor, otherwise targetDate
    const anchorDate = todo.startDate || todo.targetDate;
    const nextStartKey = getNextDate(anchorDate, todo.repeat as 'monthly' | 'yearly');
    
    // Calculate Next End (if exists)
    let nextEndKey: string | undefined;
    if (todo.endDate) {
        nextEndKey = getNextDate(todo.endDate, todo.repeat as 'monthly' | 'yearly');
    }

    if (todo.completed) {
        // Case A: Completed.
        // 1. Create History Record (The completed instance)
        // It becomes a normal completed todo.
        const historyId = `${todo.id}_hist_${todo.targetDate}_${now}`;
        const historyTodo: Todo = {
            ...todo,
            id: historyId,
            isLongTerm: false, // Convert to normal
            repeat: 'none',
            startDate: undefined, // Remove range display
            endDate: undefined,
            // completed is true, completedAt is preserved
        };
        
        addedTodos.push(historyTodo);
        newSyncActions.push({
            id: historyId,
            type: 'INSERT',
            payload: historyTodo,
            timestamp: now
        });
        console.log(`Created history todo: ${historyTodo.text} for ${historyTodo.targetDate}`);

        // 2. Advance Current Todo to Next Cycle
        const updatedTodo: Todo = {
            ...todo,
            completed: false,
            completedAt: undefined,
            targetDate: nextStartKey,
            startDate: nextStartKey,
            endDate: nextEndKey,
            updatedAt: now
        };
        
        todosMap.set(todo.id, updatedTodo);
        newSyncActions.push({
            id: todo.id,
            type: 'UPDATE',
            payload: {
                completed: false,
                completedAt: undefined,
                targetDate: nextStartKey,
                startDate: nextStartKey,
                endDate: nextEndKey,
                updatedAt: now
            },
            timestamp: now
        });
        hasChanges = true;
        console.log(`Advanced repeating todo: ${todo.text} to ${nextStartKey}`);

    } else {
        // Case B: Not Completed.
        // Check if we have crossed into the Next Cycle.
        // Logic: If Today >= Next Cycle Start, the old cycle is "expired".
        // We "delete" the old instance (by overwriting it) and start the new one.
        // Use a loop to catch up if we missed multiple cycles (e.g. import from past)
        
        let currentNextStart = nextStartKey;
        let currentNextEnd = nextEndKey;
        let shouldUpdate = false;
        
        // Loop while today is past the start of the *next* cycle
        // e.g. Today=Dec 20. Cycle=Sep. Next=Oct 1.
        // Oct 1 <= Dec 20? Yes. Advance to Oct.
        // Next=Nov 1. Nov 1 <= Dec 20? Yes. Advance to Nov.
        // Next=Dec 1. Dec 1 <= Dec 20? Yes. Advance to Dec.
        // Next=Jan 1. Jan 1 <= Dec 20? No. Stop.
        // Result: Cycle starts Dec 1.
        
        while (todayKey >= currentNextStart) {
            shouldUpdate = true;
            // Advance pointers
            // Calculate next-next based on current-next
            const nextNextStart = getNextDate(currentNextStart, todo.repeat as 'monthly' | 'yearly');
            const nextNextEnd = currentNextEnd ? getNextDate(currentNextEnd, todo.repeat as 'monthly' | 'yearly') : undefined;
            
            // If the *next* cycle is ALSO in the past, we continue loop.
            // But we need to be careful: currentNextStart is the "candidate for new cycle".
            // If todayKey >= currentNextStart, it means the cycle STARTING at currentNextStart has already begun.
            // So we update the todo to start at currentNextStart.
            // But if todayKey >= nextNextStart, it means even THAT cycle is old.
            // So we want to find the LATEST cycle where Start <= Today < NextStart?
            // Or just LATEST cycle where Start <= Today.
            
            // Let's refine:
            // We want the todo to represent the cycle that "covers" today (or the most recent start).
            // If today is Dec 20. We want the cycle starting Dec 1.
            // Dec 1 <= Dec 20.
            // Jan 1 > Dec 20.
            // So we keep advancing as long as the *next* candidate is <= Today.
            
            // Wait, logic in loop:
            // Initial: Todo=Sep. Next=Oct 1.
            // Check: Is Oct 1 <= Today? Yes.
            // Action: Update "Target" to Oct 1.
            // Prepare Next: Nov 1.
            // Check: Is Nov 1 <= Today? Yes.
            // Action: Update "Target" to Nov 1.
            // ...
            
            // So we just track the latest valid start.
            
            const tempNext = getNextDate(currentNextStart, todo.repeat as 'monthly' | 'yearly');
            
            if (todayKey >= tempNext) {
                // If the cycle *after* this one is also past, we skip this one and move to next.
                currentNextStart = tempNext;
                if (currentNextEnd) currentNextEnd = getNextDate(currentNextEnd, todo.repeat as 'monthly' | 'yearly');
            } else {
                // The next cycle (tempNext) is in future.
                // So currentNextStart is the correct "Current" cycle.
                // We stop here and use currentNextStart.
                break;
            }
        }
        
        // Wait, the logic above:
        // If Todo=Sep. Next=Oct 1.
        // If Today=Oct 2.
        // tempNext = Nov 1.
        // Today >= Nov 1? No.
        // Break.
        // Use currentNextStart (Oct 1).
        // Correct.
        
        // If Today=Nov 2.
        // tempNext = Nov 1.
        // Today >= Nov 1? Yes.
        // Update currentNextStart = Nov 1.
        // Loop again.
        // tempNext = Dec 1.
        // Today >= Dec 1? No.
        // Break.
        // Use currentNextStart (Nov 1).
        // Correct.
        
        // But what if we just entered the loop?
        // We only enter if `todayKey >= nextStartKey`.
        // So we know at least one advance is needed.
        // The loop should handle finding the *last* valid one.
        
        // Actually, simple loop:
        // start = nextStartKey
        // while (getNextDate(start) <= todayKey) { start = getNextDate(start); }
        // update todo to start.
        
        if (shouldUpdate) {
             // Logic to find the LAST start date <= today
             let bestStart = nextStartKey;
             let bestEnd = nextEndKey;
             
             while (true) {
                 const nextOfBest = getNextDate(bestStart, todo.repeat as 'monthly' | 'yearly');
                 if (todayKey >= nextOfBest) {
                     bestStart = nextOfBest;
                     if (bestEnd) bestEnd = getNextDate(bestEnd, todo.repeat as 'monthly' | 'yearly');
                 } else {
                     break;
                 }
             }
             
             const updatedTodo: Todo = {
                ...todo,
                // completed is already false
                targetDate: bestStart,
                startDate: bestStart,
                endDate: bestEnd,
                updatedAt: now
            };
            
            todosMap.set(todo.id, updatedTodo);
            newSyncActions.push({
                id: todo.id,
                type: 'UPDATE',
                payload: {
                    targetDate: bestStart,
                    startDate: bestStart,
                    endDate: bestEnd,
                    updatedAt: now
                },
                timestamp: now
            });
            hasChanges = true;
            console.log(`Auto-advanced overdue repeating todo: ${todo.text} to ${bestStart}`);
        } else if (todayKey >= nextStartKey) {
            // Fallback for single step (should be covered by loop, but just in case logic matches original)
             const updatedTodo: Todo = {
                ...todo,
                // completed is already false
                targetDate: nextStartKey,
                startDate: nextStartKey,
                endDate: nextEndKey,
                updatedAt: now
            };
            
            todosMap.set(todo.id, updatedTodo);
            newSyncActions.push({
                id: todo.id,
                type: 'UPDATE',
                payload: {
                    targetDate: nextStartKey,
                    startDate: nextStartKey,
                    endDate: nextEndKey,
                    updatedAt: now
                },
                timestamp: now
            });
            hasChanges = true;
            console.log(`Auto-advanced overdue repeating todo: ${todo.text} to ${nextStartKey}`);
        }
    }
  });
  
  if (!hasChanges) return null;
  
  return {
      newTodos: [...Array.from(todosMap.values()), ...addedTodos],
      newSyncActions
  };
};

// 纯函数：去重逻辑
const deduplicateTodos = (todos: Todo[]): { uniqueTodos: Todo[], removedIds: string[] } => {
    const uniqueMap = new Map<string, Todo>();
    const removedIds: string[] = [];
    
    // 按 text + targetDate 分组
    const groups = new Map<string, Todo[]>();
    
    todos.forEach(t => {
        const key = `${t.text}_${t.targetDate}`;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(t);
    });
    
    groups.forEach((groupTodos) => {
        if (groupTodos.length === 1) {
            uniqueMap.set(groupTodos[0].id, groupTodos[0]);
            return;
        }
        
        // 有重复，选择保留哪一个
        // 规则1: 优先保留已完成的 (通常是有价值的历史记录)
        // 规则2: 如果状态相同，保留 updatedAt 最新的
        // 规则3: 如果都一样，保留 ID 看起来比较正常的 (可选，这里简化为取第一个)
        
        groupTodos.sort((a, b) => {
            // 已完成排在前面
            if (a.completed !== b.completed) {
                return a.completed ? -1 : 1;
            }
            // 更新时间晚的排在前面
            return (b.updatedAt || 0) - (a.updatedAt || 0);
        });
        
        const winner = groupTodos[0];
        uniqueMap.set(winner.id, winner);
        
        // 记录被移除的 ID
        for (let i = 1; i < groupTodos.length; i++) {
            removedIds.push(groupTodos[i].id);
        }
    });
    
    return {
        uniqueTodos: Array.from(uniqueMap.values()),
        removedIds
    };
};

export function useTodos() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [syncQueue, setSyncQueue] = useState<SyncAction[]>([]);
  const [session, setSession] = useState<any>(null);

  // 3. 监听 todos 变化，自动执行规则（迁移、重复生成）
  useEffect(() => {
    // 避免初始化时的空运行
    if (todos.length === 0) return;

    let currentTodos = todos;
    let hasAnyChanges = false;
    let combinedSyncActions: SyncAction[] = [];

    // 1. Migrate overdue (Defer to today)
    const migrationResult = performMigration(currentTodos);
    if (migrationResult.hasChanges) {
        currentTodos = migrationResult.newTodos;
        combinedSyncActions.push(...migrationResult.newSyncActions);
        hasAnyChanges = true;
    }

    // 2. Regenerate repeating (Cycle advancement)
    const regenResult = checkAndRegenerateRepeatingTodos(currentTodos);
    if (regenResult) {
        currentTodos = regenResult.newTodos;
        combinedSyncActions.push(...regenResult.newSyncActions);
        hasAnyChanges = true;
    }

    // Only update state if rules triggered changes
    // Prevent infinite loops by checking if the changes are substantial?
    // The logic naturally converges, so it should be fine.
    // But we must ensure we don't trigger this effect immediately after setting todos in this effect.
    // The `setTodos` will trigger re-render, then this effect runs again.
    // On 2nd run, `performMigration` returns no changes. `regenResult` returns null.
    // So hasAnyChanges = false. Loop stops.
    if (hasAnyChanges) {
        console.log('Auto-processing todos rules...');
        // Use functional update to ensure we don't overwrite concurrent changes?
        // But we computed based on `todos` from closure.
        // It's safer to just set.
        setTodos(currentTodos);
        setSyncQueue(prev => [...prev, ...combinedSyncActions]);
    }
  }, [todos]);

  // 1. 初始化加载
  useEffect(() => {
    loadLocalData(); // Just load. The rules effect will handle migration after load.
    
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchRemoteTodos();
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchRemoteTodos();
    });

    return () => subscription.unsubscribe();
  }, []);

  // 监听 App 状态变化，从后台返回前台时检查迁移
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active') {
        checkAndMigrateTodos();
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // 迁移过期未完成待办到今天
  const checkAndMigrateTodos = async () => {
    try {
        console.log('Checking for todo migration...');
        const savedTodosStr = await AsyncStorage.getItem(STORAGE_KEY_TODOS);
        if (!savedTodosStr) {
            console.log('No saved todos found for migration.');
            return;
        }
        
        const currentTodos: Todo[] = JSON.parse(savedTodosStr);
        // 1. Migrate overdue
        const migrationResult = performMigration(currentTodos);
        
        let finalTodos = migrationResult.newTodos;
        let finalSyncActions = [...migrationResult.newSyncActions];
        let anyChanges = migrationResult.hasChanges;
        
        // 2. Regenerate repeating
        const regenResult = checkAndRegenerateRepeatingTodos(finalTodos);
        
        if (regenResult) {
            finalTodos = regenResult.newTodos;
            finalSyncActions = [...finalSyncActions, ...regenResult.newSyncActions];
            anyChanges = true;
        }

        if (anyChanges) {
            console.log(`Migration/Regeneration completed. Total actions: ${finalSyncActions.length}`);
            setTodos(finalTodos);
            setSyncQueue(prev => [...prev, ...finalSyncActions]);
        } else {
            console.log('No migration needed.');
        }
    } catch (e) {
        console.error('Failed to migrate todos', e);
    }
  };

  // 2. 监听队列和网络，尝试同步
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      if (state.isConnected && syncQueue.length > 0) {
        processSyncQueue();
      }
    });
    if (syncQueue.length > 0) {
        processSyncQueue();
    }
    saveLocalData();
    return () => unsubscribe();
  }, [syncQueue, todos]);

  const loadLocalData = async () => {
    try {
      const savedTodos = await AsyncStorage.getItem(STORAGE_KEY_TODOS);
      const savedQueue = await AsyncStorage.getItem(STORAGE_KEY_QUEUE);
      if (savedTodos) setTodos(JSON.parse(savedTodos));
      if (savedQueue) setSyncQueue(JSON.parse(savedQueue));
    } catch (e) {
      console.error('Failed to load local data', e);
    }
  };

  const saveLocalData = async () => {
    await AsyncStorage.setItem(STORAGE_KEY_TODOS, JSON.stringify(todos));
    await AsyncStorage.setItem(STORAGE_KEY_QUEUE, JSON.stringify(syncQueue));
  };

  const processSyncQueue = async () => {
    if (!session || syncQueue.length === 0) return;
    
    // 简单锁机制，防止并发 (实际项目可优化)
    const queueToProcess = [...syncQueue];
    const remainingQueue: SyncAction[] = [];

    for (const action of queueToProcess) {
      const { type, payload, id } = action;
      let error = null;

      try {
        if (type === 'INSERT') {
          const t = payload as Todo;
          const { error: e } = await supabase.from('todos').insert({
            id: t.id,
            text: t.text,
            completed: t.completed,
            target_date: t.targetDate,
            created_at: new Date(t.createdAt || Date.now()).toISOString(),
            updated_at: new Date(t.updatedAt || Date.now()).toISOString(),
            completed_at: t.completed && t.completedAt ? new Date(t.completedAt).toISOString() : (t.completed ? new Date().toISOString() : null),
            is_long_term: t.isLongTerm,
            start_date: t.startDate,
            end_date: t.endDate,
            is_all_day: t.isAllDay,
            is_all_year: t.isAllYear,
            is_month: t.isMonth,
            repeat: t.repeat
          });
          error = e;
        } else if (type === 'UPDATE') {
          const t = payload as Partial<Todo>;
          const updates: any = { updated_at: new Date().toISOString() };
          if (t.text !== undefined) updates.text = t.text;
          if (t.targetDate !== undefined) updates.target_date = t.targetDate;
          if (t.completed !== undefined) {
             updates.completed = t.completed;
             updates.completed_at = t.completed ? new Date().toISOString() : null;
          }
          if (t.isLongTerm !== undefined) updates.is_long_term = t.isLongTerm;
          if (t.startDate !== undefined) updates.start_date = t.startDate;
          if (t.endDate !== undefined) updates.end_date = t.endDate;
          if (t.isAllDay !== undefined) updates.is_all_day = t.isAllDay;
          if (t.isAllYear !== undefined) updates.is_all_year = t.isAllYear;
          if (t.isMonth !== undefined) updates.is_month = t.isMonth;
          if (t.repeat !== undefined) updates.repeat = t.repeat;
          const { error: e } = await supabase.from('todos').update(updates).eq('id', id);
          error = e;
        } else if (type === 'DELETE') {
          const { error: e } = await supabase.from('todos').delete().eq('id', id);
          error = e;
        }
      } catch (e) {
        error = e;
      }

      if (error) remainingQueue.push(action);
    }
    setSyncQueue(remainingQueue);
  };

  const fetchRemoteTodos = async () => {
    if (!session) return;
    const { data, error } = await supabase.from('todos').select('*');
    if (!error && data) {
       // 智能合并：对比 updatedAt 保留较新版本
       const remoteTodos: Todo[] = data.map(d => ({
         id: d.id, text: d.text, completed: d.completed, targetDate: d.target_date,
         createdAt: new Date(d.created_at).getTime(),
         updatedAt: new Date(d.updated_at).getTime(),
         isLongTerm: d.is_long_term,
         startDate: d.start_date,
         endDate: d.end_date,
         isAllDay: d.is_all_day,
         isAllYear: d.is_all_year,
         isMonth: d.is_month,
         repeat: d.repeat
       }));
       
       setTodos(prev => {
          const remoteMap = new Map(remoteTodos.map(t => [t.id, t]));
          
          // 遍历本地待办，决定保留本地还是覆盖
          const merged = prev.map(local => {
              if (remoteMap.has(local.id)) {
                  const remote = remoteMap.get(local.id)!;
                  // 如果本地更新时间晚于云端，保留本地（解决迁移后被云端旧数据覆盖的问题）
                  // 注意：依赖本地时钟准确性
                  if ((local.updatedAt || 0) > (remote.updatedAt || 0)) {
                      remoteMap.delete(local.id);
                      return local;
                  } else {
                      remoteMap.delete(local.id);
                      return remote;
                  }
              }
              return local;
          });
          
          // 添加云端新增的待办
          return [...merged, ...Array.from(remoteMap.values())];
       });
    }
  };

  // --- CRUD API ---

  const createId = () => {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  };

  const addTodo = (text: string, dateKey: string) => {
    const id = createId();
    const now = Date.now();
    
    // 如果选择的日期早于今天，强制归为今天
    const todayKey = formatDateKey(new Date());
    const targetDate = dateKey < todayKey ? todayKey : dateKey;

    const newTodo: Todo = { id, text, completed: false, targetDate: targetDate, createdAt: now, updatedAt: now };
    
    setTodos(prev => [...prev, newTodo]);
    setSyncQueue(prev => [...prev, { id, type: 'INSERT', payload: newTodo, timestamp: now }]);
  };

  const toggleTodo = (id: string) => {
    const todo = todos.find(t => t.id === id);
    if (!todo) return;
    
    // Calculate new completion status
    const isCompleted = !todo.completed;
    const now = Date.now();
    
    // If we are completing a recurring todo (and it has a repeat rule),
    // we should "split" it: mark current as done (and stop repeating),
    // and create a new one for the next interval.
    // This ensures future occurrences appear as uncompleted.
    // NOTE: For 'monthly' and 'yearly' (Long Term) todos, we use the `checkAndRegenerateRepeatingTodos` logic
    // which preserves the main ID and creates history records. So we SKIP manual generation here.
    const repeatType = todo.repeat as string;
    if (isCompleted && repeatType && repeatType !== 'none' && repeatType !== 'monthly' && repeatType !== 'yearly') {
        const [y, m, d] = todo.targetDate.split('-').map(Number);
        let nextDateObj: Date;
        
        // m is 1-based. Date constructor month is 0-based.
        // new Date(y, m - 1, d) is current date.
        
        if (todo.repeat === 'daily') {
            nextDateObj = new Date(y, m - 1, d + 1);
        } else if (todo.repeat === 'weekly') {
            nextDateObj = new Date(y, m - 1, d + 7);
        } else if (todo.repeat === 'monthly') {
            // Move to next month, same day
            // new Date(y, m, d) -> m is (currentMonthIndex + 1), so it is next month
            nextDateObj = new Date(y, m, d);
        } else if (todo.repeat === 'yearly') {
            nextDateObj = new Date(y + 1, m - 1, d);
        } else {
            nextDateObj = new Date(y, m - 1, d); // Should not happen
        }
        
        const nextDate = formatDateKey(nextDateObj);
        
        // 1. Create successor
        const newId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}-rep`;
        const newTodo: Todo = {
            ...todo,
            id: newId,
            targetDate: nextDate,
            completed: false,
            completedAt: undefined,
            createdAt: now,
            updatedAt: now,
            // new todo keeps the repeat rule to continue the chain
            // but for 'monthly'/'yearly' logic in DateSelectionModal, we might need to adjust startDate if it exists?
            // If startDate exists, it's usually the anchor. Should we shift startDate too?
            // If we don't shift startDate, isMonth logic might still anchor to old month?
            // isMonth logic uses startDate.
        };

        if (newTodo.startDate) {
             const [sy, sm, sd] = newTodo.startDate.split('-').map(Number);
             let nextStartObj: Date;
             if (todo.repeat === 'monthly') {
                 nextStartObj = new Date(sy, sm, sd); // next month
             } else if (todo.repeat === 'yearly') {
                 nextStartObj = new Date(sy + 1, sm - 1, sd);
             } else if (todo.repeat === 'weekly') {
                 nextStartObj = new Date(sy, sm - 1, sd + 7);
             } else if (todo.repeat === 'daily') {
                 nextStartObj = new Date(sy, sm - 1, sd + 1);
             } else {
                 nextStartObj = new Date(sy, sm - 1, sd);
             }
             // Update startDate/endDate to match the new period
             // Assuming duration is constant
             const duration = newTodo.endDate ? (new Date(newTodo.endDate).getTime() - new Date(todo.startDate).getTime()) : 0;
             newTodo.startDate = formatDateKey(nextStartObj);
             if (newTodo.endDate) {
                 newTodo.endDate = formatDateKey(new Date(nextStartObj.getTime() + duration));
             }
        }
        
        // 2. Retire current todo
        const updatedCurrent = { 
            ...todo, 
            completed: true, 
            completedAt: now,
            updatedAt: now,
            repeat: 'none' as const // Stop repeating this instance
        };
        
        setTodos(prev => {
            // Replace current and append new
            return [...prev.map(t => t.id === id ? updatedCurrent : t), newTodo];
        });
        
        setSyncQueue(prev => [
            ...prev, 
            { id: id, type: 'UPDATE', payload: updatedCurrent, timestamp: now },
            { id: newId, type: 'INSERT', payload: newTodo, timestamp: now }
        ]);
        
        return;
    }

    const updates = { 
        completed: isCompleted, 
        completedAt: isCompleted ? Date.now() : undefined,
        updatedAt: Date.now() 
    };
    
    setTodos(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    setSyncQueue(prev => [...prev, { id, type: 'UPDATE', payload: updates, timestamp: Date.now() }]);
  };

  const updateTodo = (id: string, text: string) => {
    const updates = { text, updatedAt: Date.now() };
    setTodos(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    setSyncQueue(prev => [...prev, { id, type: 'UPDATE', payload: updates, timestamp: Date.now() }]);
  };

  const updateTodoFields = (id: string, fields: Partial<Todo>) => {
    const updates = { ...fields, updatedAt: Date.now() };
    setTodos(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    setSyncQueue(prev => [...prev, { id, type: 'UPDATE', payload: updates, timestamp: Date.now() }]);
  };

  const reorderTodos = (newTodos: Todo[]) => {
      // 这里的 newTodos 应该是已经重新排序后的完整列表或者当前视图的列表
      // 由于 todos 包含所有日期的，直接替换可能会丢失其他日期的 todo
      // 所以我们应该只更新当前操作的那些 todo 的顺序，但因为没有 order 字段，
      // 我们只能假设 newTodos 是全集，或者我们需要在 Todo 中加 order 字段。
      // 鉴于目前需求，我们简单地更新本地状态即可，
      // 但为了支持持久化，我们需要找到这些 todo 在原数组中的位置并交换，或者直接更新整个数组（如果 newTodos 是全集）
      // 这里的简单做法是：找到 newTodos 中的 ids，在原 todos 中把它们按新顺序排列。
      
      setTodos(prev => {
          const prevMap = new Map(prev.map(t => [t.id, t]));
          const newOrderIds = new Set(newTodos.map(t => t.id));
          
          // 保留那些不在 newTodos 里的 todo (其他日期的)
          const others = prev.filter(t => !newOrderIds.has(t.id));
          
          // 使用 newTodos (它们已经有了新的顺序)
          return [...others, ...newTodos];
      });
      // 注意：reorder 不会产生 SyncAction，除非我们加了 order 字段。
      // 如果只是本地拖拽排序，不涉及云端同步顺序，这样就够了。
  };

  const deleteTodo = (id: string) => {
    setTodos(prev => prev.filter(t => t.id !== id));
    setSyncQueue(prev => [...prev, { id, type: 'DELETE', payload: id, timestamp: Date.now() }]);
  };

  const deleteAllTodos = () => {
    if (todos.length === 0) return;
    
    const now = Date.now();
    const actions: SyncAction[] = todos.map(t => ({
        id: t.id,
        type: 'DELETE',
        payload: t.id,
        timestamp: now
    }));
    
    setTodos([]);
    setSyncQueue(prev => [...prev, ...actions]);
  };

  const importTodos = (importedTodos: Todo[]) => {
    const now = Date.now();
    const newActions: SyncAction[] = [];
    
    // 使用当前 todos 状态来计算合并
    const prevTodos = todos;
    const todoMap = new Map(prevTodos.map(t => [t.id, t]));
    const textDateMap = new Map(prevTodos.map(t => [`${t.text}_${t.targetDate}`, t.id]));
    
    // 复制一份 map 用于操作，避免修改原引用（虽然这里是 map，但最好是新的）
    const mergedTodosMap = new Map(todoMap);

    importedTodos.forEach(t => {
        let finalId = t.id;
        let isUpdate = false;

        // 1. 优先尝试 ID 匹配
        if (mergedTodosMap.has(t.id)) {
            isUpdate = true;
        } else {
            // 2. 尝试 内容+日期 匹配 (智能去重)
            const key = `${t.text}_${t.targetDate}`;
            if (textDateMap.has(key)) {
                finalId = textDateMap.get(key)!;
                isUpdate = true;
            } else {
                // 3. 全新任务
                textDateMap.set(key, t.id);
            }
        }

        const mergedTodo = { ...t, id: finalId, updatedAt: now };
        mergedTodosMap.set(finalId, mergedTodo);

        newActions.push({
            id: finalId,
            type: isUpdate ? 'UPDATE' : 'INSERT',
            payload: mergedTodo,
            timestamp: now
        });
    });

    const mergedTodos = Array.from(mergedTodosMap.values());

    // 立即执行迁移检查，确保导入的旧待办能显示在今天
    const { newTodos, newSyncActions: migrationActions, hasChanges } = performMigration(mergedTodos);

    setTodos(newTodos);
    setSyncQueue(prev => [...prev, ...newActions, ...migrationActions]);

    if (hasChanges) {
        console.log('Import triggered migration of past due todos');
    }
  };

  return { todos, addTodo, toggleTodo, updateTodo, updateTodoFields, reorderTodos, deleteTodo, deleteAllTodos, importTodos, session };
}
