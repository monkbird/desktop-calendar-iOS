import { toDateId, useCalendar } from '@marceloterreiro/flash-calendar';
import { addHours, format, startOfHour } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { BlurView } from 'expo-blur';
import { Check, ChevronLeft, ChevronRight, X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  FlatList,
  LayoutAnimation,
  Modal,
  PanResponder,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  UIManager,
  View
} from 'react-native';
import { Todo } from '../../types';

if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

interface DateSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (data: { startDate: string; endDate: string; isAllDay: boolean; isAllYear: boolean; isMonth: boolean; repeat?: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly' }) => void;
  initialDate?: string; // ISO date string
  todo?: Todo;
}

// Wheel Picker Component
const ITEM_HEIGHT = 44;
const VISIBLE_ITEMS = 5;

const WheelPicker = ({ 
    items, 
    selectedValue, 
    onValueChange 
}: { 
    items: { label: string; value: number }[]; 
    selectedValue: number; 
    onValueChange: (val: number) => void 
}) => {
    const flatListRef = React.useRef<FlatList>(null);

    // Initial scroll to selected value
    useEffect(() => {
        const index = items.findIndex(i => i.value === selectedValue);
        if (index !== -1 && flatListRef.current) {
            // Use requestAnimationFrame to ensure layout is ready
            requestAnimationFrame(() => {
                flatListRef.current?.scrollToIndex({ index, animated: false });
            });
        }
    }, []);

    const handleScroll = (event: any) => {
        const offsetY = event.nativeEvent.contentOffset.y;
        const index = Math.round(offsetY / ITEM_HEIGHT);
        if (index >= 0 && index < items.length) {
            const item = items[index];
            if (item.value !== selectedValue) {
                onValueChange(item.value);
            }
        }
    };

    return (
        <View style={{ height: ITEM_HEIGHT * VISIBLE_ITEMS, width: 100, overflow: 'hidden' }}>
            <FlatList
                ref={flatListRef}
                data={items}
                keyExtractor={(item) => item.value.toString()}
                renderItem={({ item }) => {
                    const isSelected = item.value === selectedValue;
                    return (
                        <View style={{ height: ITEM_HEIGHT, justifyContent: 'center', alignItems: 'center' }}>
                            <Text style={{ 
                                color: isSelected ? 'white' : 'rgba(255,255,255,0.3)', 
                                fontSize: isSelected ? 20 : 18, 
                                fontWeight: isSelected ? '600' : '400',
                                opacity: isSelected ? 1 : 0.5
                            }}>
                                {item.label}
                            </Text>
                        </View>
                    );
                }}
                getItemLayout={(_, index) => ({ length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index })}
                snapToInterval={ITEM_HEIGHT}
                decelerationRate="fast"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingVertical: ITEM_HEIGHT * 2 }}
                onMomentumScrollEnd={handleScroll}
                onScrollEndDrag={handleScroll}
            />
        </View>
    );
};

// Simple Calendar Component using useCalendar
const EmbeddedCalendar = ({ 
    date, 
    onDateChange, 
    onMonthChange
}: { 
    date: Date, 
    onDateChange: (id: string) => void,
    onMonthChange: (diff: number) => void
}) => {
    
    const [showPicker, setShowPicker] = useState(false);
    const [tempDate, setTempDate] = useState(date);
    
    // Fix for stale closure in PanResponder
    const onMonthChangeRef = React.useRef(onMonthChange);
    useEffect(() => {
        onMonthChangeRef.current = onMonthChange;
    }, [onMonthChange]);

    // Animation values
    const slideAnim = React.useRef(new Animated.Value(0)).current;
    const fadeAnim = React.useRef(new Animated.Value(1)).current;
    const screenWidth = Dimensions.get('window').width;

    const handleMonthChangeWithAnimation = (diff: number) => {
        // 1. Animate Out
        // If next month (diff > 0), move current to Left (-width)
        // If prev month (diff < 0), move current to Right (+width)
        const toValue = diff > 0 ? -screenWidth / 2 : screenWidth / 2;
        
        Animated.parallel([
            Animated.timing(slideAnim, {
                toValue,
                duration: 200,
                useNativeDriver: true,
                easing: Easing.out(Easing.ease), // "先快后慢"
            }),
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            })
        ]).start(() => {
            // 2. Update Data
            onMonthChangeRef.current(diff);
            
            // 3. Reset Position (Instant)
            // If we moved Left (-), new comes from Right (+)
            slideAnim.setValue(diff > 0 ? screenWidth / 2 : -screenWidth / 2);
            
            // 4. Animate In
            Animated.parallel([
                Animated.timing(slideAnim, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true,
                    easing: Easing.out(Easing.cubic), // "先快后慢"
                }),
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                })
            ]).start();
        });
    };

    const { weeksList } = useCalendar({
        calendarMonthId: toDateId(date),
        calendarFirstDayOfWeek: 'monday',
        calendarActiveDateRanges: [
             { startId: toDateId(date), endId: toDateId(date) }
        ]
    });

    const panResponder = React.useRef(
        PanResponder.create({
            onMoveShouldSetPanResponder: (_, gestureState) => {
                // Trigger only on horizontal swipes
                return Math.abs(gestureState.dx) > 20 && Math.abs(gestureState.dy) < 20;
            },
            onPanResponderRelease: (_, gestureState) => {
                if (gestureState.dx > 50) {
                    handleMonthChangeWithAnimation(-1); // Swipe Right -> Prev Month
                } else if (gestureState.dx < -50) {
                    handleMonthChangeWithAnimation(1); // Swipe Left -> Next Month
                }
            },
        })
    ).current;

    const formatMonthTitle = (d: Date) => format(d, 'yyyy年 M月', { locale: zhCN });
    
    // Generate Year/Month Data
    const years = Array.from({ length: 20 }, (_, i) => {
        const y = new Date().getFullYear() - 10 + i;
        return { label: `${y}年`, value: y };
    });
    
    const months = Array.from({ length: 12 }, (_, i) => {
        return { label: `${i + 1}月`, value: i };
    });

    return (
        <View>
            {/* Modal for Month/Year Selection */}
             <Modal
                visible={showPicker}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowPicker(false)}
             >
                 <BlurView intensity={50} tint="dark" style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                     <View style={{ backgroundColor: '#1c1c1e', padding: 24, borderRadius: 20, width: 320, alignItems: 'center' }}>
                         <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 30 }}>
                             <TouchableOpacity onPress={() => setShowPicker(false)}>
                                 <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 17 }}>取消</Text>
                             </TouchableOpacity>
                             <TouchableOpacity onPress={() => {
                                 const diff = (tempDate.getFullYear() - date.getFullYear()) * 12 + (tempDate.getMonth() - date.getMonth());
                                 onMonthChange(diff);
                                 setShowPicker(false);
                             }}>
                                 <Text style={{ color: '#0A84FF', fontSize: 17, fontWeight: '600' }}>确定</Text>
                             </TouchableOpacity>
                         </View>
                         
                         <View style={{ flexDirection: 'row', justifyContent: 'center', height: ITEM_HEIGHT * VISIBLE_ITEMS, position: 'relative' }}>
                             {/* Highlight Bar Background */}
                             <View style={{ 
                                 position: 'absolute', 
                                 top: ITEM_HEIGHT * 2, 
                                 left: 0, 
                                 right: 0, 
                                 height: ITEM_HEIGHT, 
                                 backgroundColor: 'rgba(120, 120, 128, 0.3)',
                                 borderRadius: 8,
                                 zIndex: 0
                             }} />
                             
                             <View style={{ flexDirection: 'row', zIndex: 1 }}>
                                 <WheelPicker 
                                    items={years}
                                    selectedValue={tempDate.getFullYear()}
                                    onValueChange={(y) => {
                                        const newDate = new Date(tempDate);
                                        newDate.setFullYear(y);
                                        setTempDate(newDate);
                                    }}
                                 />
                                 <View style={{ width: 20 }} />
                                 <WheelPicker 
                                    items={months}
                                    selectedValue={tempDate.getMonth()}
                                    onValueChange={(m) => {
                                        const newDate = new Date(tempDate);
                                        newDate.setMonth(m);
                                        setTempDate(newDate);
                                    }}
                                 />
                             </View>
                         </View>
                     </View>
                 </BlurView>
             </Modal>

             <View {...panResponder.panHandlers}>
                 {/* Simple Calendar Header */}
                 <View style={styles.calendarHeader}>
                    <TouchableOpacity onPress={() => {
                        setTempDate(date);
                        setShowPicker(true);
                    }}>
                        <Text style={styles.calendarTitle}>{formatMonthTitle(date)}</Text>
                    </TouchableOpacity>
                    <View style={{ flexDirection: 'row', gap: 16 }}>
                        <TouchableOpacity onPress={() => handleMonthChangeWithAnimation(-1)}>
                            <ChevronLeft color="#ef4444" size={24} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleMonthChangeWithAnimation(1)}>
                            <ChevronRight color="#ef4444" size={24} />
                        </TouchableOpacity>
                    </View>
                 </View>

                 <Animated.View style={{ 
                     opacity: fadeAnim,
                     transform: [{ translateX: slideAnim }]
                 }}>
                     {/* Week Days Header */}
                     <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: 8 }}>
                         {['一', '二', '三', '四', '五', '六', '日'].map(d => (
                             <Text key={d} style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, width: 32, textAlign: 'center' }}>{d}</Text>
                         ))}
                     </View>
    
                     {/* Days Grid */}
                     <View>
                         {weeksList.map((week, wIndex) => (
                             <View key={wIndex} style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: 8 }}>
                                 {week.map((day, dIndex) => {
                                     const isToday = day.isToday;
                                     const isSameMonth = day.isDifferentMonth === false;
                                     const isActive = day.id === toDateId(date);
                                     
                                     return (
                                         <TouchableOpacity 
                                            key={day.id} 
                                            onPress={() => onDateChange(day.id)}
                                            style={{
                                                width: 32,
                                                height: 32,
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                borderRadius: 16,
                                                backgroundColor: isActive ? '#ef4444' : 'transparent'
                                            }}
                                         >
                                             <Text style={{ 
                                                 color: isActive ? 'white' : (isSameMonth ? 'white' : 'rgba(255,255,255,0.2)'),
                                                 fontWeight: isActive || isToday ? '600' : '400'
                                             }}>
                                                 {parseInt(day.id.split('-')[2], 10)}
                                             </Text>
                                             {isToday && !isActive && (
                                                 <View style={{ position: 'absolute', bottom: 4, width: 4, height: 4, borderRadius: 2, backgroundColor: '#ef4444' }} />
                                             )}
                                         </TouchableOpacity>
                                     );
                                 })}
                             </View>
                         ))}
                     </View>
                 </Animated.View>
            </View>
        </View>
    );
}

export default function DateSelectionModal({
  visible,
  onClose,
  onSave,
  initialDate,
  todo
}: DateSelectionModalProps) {
  const [isAllDay, setIsAllDay] = useState(false);
  const [isAllYear, setIsAllYear] = useState(false);
  const [isMonth, setIsMonth] = useState(false);
  const [repeat, setRepeat] = useState<'none' | 'daily' | 'weekly' | 'monthly' | 'yearly'>('none');
  const [showRepeatPicker, setShowRepeatPicker] = useState(false);
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(addHours(new Date(), 1));
  const [activeTimeField, setActiveTimeField] = useState<'start' | 'end' | null>(null); // Which field is currently expanding the calendar/time picker
  
  // Modal Drag Logic
  const panY = React.useRef(new Animated.Value(0)).current;
  const modalPanResponder = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, { dx, dy }) => {
        return Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx);
      },
      onPanResponderMove: Animated.event([null, { dy: panY }], { useNativeDriver: false }),
      onPanResponderRelease: () => {
        Animated.spring(panY, {
          toValue: 0,
          useNativeDriver: false,
          friction: 6,
          tension: 40
        }).start();
      }
    })
  ).current;

  // Initialize state when modal opens
  useEffect(() => {
    if (visible) {
      const start = initialDate ? new Date(initialDate) : startOfHour(new Date());
      const end = addHours(start, 1);
      
      if (todo) {
        setStartDate(todo.startDate ? new Date(todo.startDate) : start);
        setEndDate(todo.endDate ? new Date(todo.endDate) : end);
        setIsAllDay(true);
        setIsAllYear(todo.isAllYear || false);
        setIsMonth(todo.isMonth || false);
        setRepeat(todo.repeat || 'none');
      } else {
        setStartDate(start);
        setEndDate(end);
        setIsAllDay(true);
        setIsAllYear(false);
        setIsMonth(false);
        setRepeat('none');
      }
      setActiveTimeField(null);
      setShowRepeatPicker(false);
    }
  }, [visible, initialDate, todo]);

  const handleAllYearChange = (val: boolean) => {
      setIsAllYear(val);
      if (val) {
          setIsMonth(false);
          setIsAllDay(true);
          setActiveTimeField(null);
      }
  };

  const handleMonthChange = (val: boolean) => {
      setIsMonth(val);
      if (val) {
          setIsAllYear(false);
          setIsAllDay(true);
          setActiveTimeField(null);
      }
  };

  const handleDateChange = (dateId: string) => {
    // FlashCalendar returns YYYY-MM-DD
    const [year, month, day] = dateId.split('-').map(Number);
    
    if (activeTimeField === 'start') {
      const newStart = new Date(startDate);
      newStart.setFullYear(year, month - 1, day);
      setStartDate(newStart);
      
      // If end date is before start date, move end date
      if (endDate < newStart) {
        const newEnd = new Date(newStart);
        newEnd.setHours(newEnd.getHours() + 1);
        setEndDate(newEnd);
      }
    } else if (activeTimeField === 'end') {
      const newEnd = new Date(endDate);
      newEnd.setFullYear(year, month - 1, day);
      setEndDate(newEnd);
      
      // If end date is before start date, warn or move start (simple logic: just set)
      if (newEnd < startDate) {
        const newStart = new Date(newEnd);
        newStart.setHours(newStart.getHours() - 1);
        setStartDate(newStart);
      }
    }
  };

  const formatDate = (date: Date) => format(date, 'yyyy年 M月 d日', { locale: zhCN });

  const renderTimeRow = (label: string, date: Date, type: 'start' | 'end') => {
    const isActive = activeTimeField === type;
    const isDisabled = isAllYear || isMonth;
    
    return (
      <View>
        <View style={styles.row}>
          <Text style={[styles.label, isDisabled && { opacity: 0.3 }]}>{label}</Text>
          <View style={[styles.dateTimeContainer, isDisabled && { opacity: 0.3 }]}>
            <TouchableOpacity 
              disabled={isDisabled}
              style={[styles.dateButton, isActive && styles.activeButton]}
              onPress={() => {
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                setActiveTimeField(isActive ? null : type);
              }}
            >
              <Text style={[styles.dateText, isActive && styles.activeText]}>
                {formatDate(date)}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {!isDisabled && isActive && (
             <View style={styles.pickerContainer}>
                 <EmbeddedCalendar 
                    date={date}
                    onDateChange={handleDateChange}
                    onMonthChange={(diff) => {
                        const newDate = new Date(date);
                        newDate.setMonth(newDate.getMonth() + diff);
                        if(type === 'start') setStartDate(newDate); else setEndDate(newDate);
                    }}
                 />
             </View>
        )}
      </View>
    );
  };

  const getRepeatLabel = (r: string) => {
      switch(r) {
          case 'none': return '永不';
          case 'daily': return '每天';
          case 'weekly': return '每周';
          case 'monthly': return '每月';
          case 'yearly': return '每年';
          default: return '永不';
      }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <BlurView intensity={20} tint="dark" style={styles.container}>
        <Animated.View style={[styles.modalContent, { transform: [{ translateY: panY }] }]}>
          {/* Header */}
          <View style={styles.header} {...modalPanResponder.panHandlers}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X color="white" size={24} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>长期待办设置</Text>
            <TouchableOpacity 
                onPress={() => {
                    let finalStartDate = startDate;
                    let finalEndDate = endDate;

                    // If Month/Year is selected, snap start date to beginning of period
                    if (isMonth) {
                        finalStartDate = new Date(startDate);
                        finalStartDate.setDate(1);
                        finalStartDate.setHours(0, 0, 0, 0);
                        
                        // End date is end of month? Or just keep it?
                        // Usually implies whole month, so let's ensure consistency if needed, 
                        // but logic mainly uses flags. Keeping it simple.
                    } else if (isAllYear) {
                        finalStartDate = new Date(startDate);
                        finalStartDate.setMonth(0);
                        finalStartDate.setDate(1);
                        finalStartDate.setHours(0, 0, 0, 0);
                    }

                    onSave({ 
                        startDate: finalStartDate.toISOString(), 
                        endDate: finalEndDate.toISOString(), 
                        isAllDay,
                        isAllYear,
                        isMonth,
                        repeat
                    });
                    onClose();
                }} 
                style={styles.confirmButton}
            >
              <Check color="white" size={24} />
            </TouchableOpacity>
          </View>



          <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>
            {/* Main Form Group */}
            <View style={styles.group}>
              {/* All Year Toggle */}
              <View style={[styles.row, styles.borderBottom]}>
                <Text style={styles.label}>全年</Text>
                <Switch 
                  value={isAllYear} 
                  onValueChange={handleAllYearChange}
                  trackColor={{ false: '#3e3e3e', true: '#34c759' }}
                  thumbColor={'white'}
                />
              </View>

              {/* This Month Toggle */}
              <View style={[styles.row, styles.borderBottom]}>
                <Text style={styles.label}>本月</Text>
                <Switch 
                  value={isMonth} 
                  onValueChange={handleMonthChange}
                  trackColor={{ false: '#3e3e3e', true: '#34c759' }}
                  thumbColor={'white'}
                />
              </View>

              {/* Start Date */}
              {renderTimeRow('开始', startDate, 'start')}
              
              <View style={styles.separator} />

              {/* End Date */}
              {renderTimeRow('结束', endDate, 'end')}
            </View>

             {/* Repeat Group */}
             <View style={styles.group}>
                 <TouchableOpacity 
                    style={styles.row}
                    onPress={() => setShowRepeatPicker(!showRepeatPicker)}
                 >
                     <Text style={styles.label}>重复</Text>
                     <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                         <Text style={styles.valueText}>{getRepeatLabel(repeat)}</Text>
                         <ChevronRight size={16} color="rgba(255,255,255,0.3)" />
                     </View>
                 </TouchableOpacity>
                 
                 {showRepeatPicker && (
                    <View style={[styles.pickerContainer, { paddingBottom: 0 }]}>
                        {['none', 'monthly', 'yearly'].map((item) => (
                             <TouchableOpacity 
                                 key={item}
                                 style={[
                                     styles.repeatOption, 
                                     repeat === item && styles.repeatOptionActive
                                 ]}
                                 onPress={() => {
                                     setRepeat(item as any);
                                     setShowRepeatPicker(false);
                                 }}
                             >
                                 <Text style={[
                                     styles.repeatOptionText,
                                     repeat === item && styles.repeatOptionTextActive
                                 ]}>
                                     {getRepeatLabel(item)}
                                 </Text>
                                 {repeat === item && <Check size={16} color="#ef4444" />}
                             </TouchableOpacity>
                         ))}
                     </View>
                 )}
             </View>

            <View style={{ height: 100 }} /> 
          </ScrollView>
        </Animated.View>
      </BlurView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end', // iOS Modal style
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    height: '92%', // Takes up most of the screen
    backgroundColor: '#1c1c1e', // iOS Dark Mode Background
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#1c1c1e',
  },
  headerTitle: {
    color: 'white',
    fontSize: 17,
    fontWeight: '600',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  formScroll: {
    flex: 1,
    paddingHorizontal: 16,
  },
  group: {
    backgroundColor: '#2c2c2e',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    minHeight: 50,
  },
  borderBottom: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  separator: {
      height: 1,
      backgroundColor: 'rgba(255,255,255,0.1)',
      marginLeft: 16,
  },
  label: {
    color: 'white',
    fontSize: 16,
  },
  valueText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 16,
    marginRight: 4,
  },
  dateTimeContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  dateButton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  activeButton: {
      backgroundColor: 'rgba(255,255,255,0.2)', // Lighter when active
  },
  dateText: {
    color: 'white',
    fontSize: 15,
  },
  activeText: {
      color: '#ef4444', // Red text when active
  },
  pickerContainer: {
      paddingBottom: 16,
      borderTopWidth: 1,
      borderTopColor: 'rgba(255,255,255,0.1)',
  },
  calendarHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
  },
  calendarTitle: {
      color: '#ef4444',
      fontSize: 16,
      fontWeight: '600',
  },
  repeatOption: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderTopWidth: 1,
      borderTopColor: 'rgba(255,255,255,0.05)',
  },
  repeatOptionActive: {
      backgroundColor: 'rgba(255,255,255,0.05)',
  },
  repeatOptionText: {
      color: 'white',
      fontSize: 16,
  },
  repeatOptionTextActive: {
      color: '#ef4444',
      fontWeight: '600',
  },
});
