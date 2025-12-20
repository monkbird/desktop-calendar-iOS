import * as DocumentPicker from 'expo-document-picker';
import * as ExpoFileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import XLSX from 'xlsx';
import { Todo } from '../types';

export const exportTodosToExcel = async (todos: Todo[]) => {
  try {
    const getRepeatText = (repeat?: string) => {
        switch(repeat) {
            case 'daily': return '每天';
            case 'weekly': return '每周';
            case 'monthly': return '每月';
            case 'yearly': return '每年';
            default: return '永不';
        }
    };

    // 1. 转换数据格式
    const data = todos.map(todo => {
      // 辅助函数：将 ISO 时间字符串或时间戳转换为本地 Date 对象，以便 Excel 正确显示本地时间
      const toLocalDate = (dateStrOrNum?: string | number) => {
          if (!dateStrOrNum) return '';
          return new Date(dateStrOrNum);
      };

      // 辅助函数：提取 YYYY-MM-DD HH:mm
      const toLocalDateTimeString = (dateStrOrNum?: string | number) => {
          if (!dateStrOrNum) return '';
          const d = new Date(dateStrOrNum);
          if (isNaN(d.getTime())) return '';
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          const hour = String(d.getHours()).padStart(2, '0');
          const minute = String(d.getMinutes()).padStart(2, '0');
          return `${year}-${month}-${day} ${hour}:${minute}`;
      };

      return {
        '清单名称': '默认清单',
        '计划日期': todo.targetDate,
        '待办内容': todo.text,
        '优先级': todo.isLongTerm ? '长期' : (todo.isPinned ? '重要' : '无'),
        '开始时间': toLocalDateTimeString(todo.startDate),
        '结束时间': toLocalDateTimeString(todo.endDate),
        '重复': getRepeatText(todo.repeat),
        '状态': todo.completed ? '已完成' : '未完成',
        '完成时间': toLocalDateTimeString(todo.completedAt),
        '创建时间': toLocalDateTimeString(todo.createdAt || Date.now()),
        
        // 增加保留列
        '置顶': todo.isPinned ? '是' : '否',
        '全天': todo.isAllDay ? '是' : '否',
        '全年': todo.isAllYear ? '是' : '否',
        '本月': todo.isMonth ? '是' : '否',
      };
    });

    // 2. 创建工作簿
    const ws = XLSX.utils.json_to_sheet(data, {
        header: [
            '清单名称', 
            '计划日期', 
            '待办内容', 
            '优先级', 
            '开始时间',
            '结束时间',
            '重复',
            '状态',
            '完成时间', 
            '创建时间',
            '置顶',
            '全天',
            '全年',
            '本月'
        ]
    });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "待办事项");

    // 3. 生成 Base64 数据
    const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });

    // 4. 保存到临时文件
    const filename = `todos_backup_${new Date().toISOString().split('T')[0]}.xlsx`;
    const uri = ExpoFileSystem.cacheDirectory + filename;
    
    // 写入 Base64
    // 注意：必须使用字符串 'base64' 而不是 ExpoFileSystem.EncodingType.Base64，以避免运行时 undefined 错误
    await ExpoFileSystem.writeAsStringAsync(uri, wbout, { encoding: 'base64' });

    // 5. 分享文件
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        dialogTitle: 'Export Todos',
        UTI: 'com.microsoft.excel.xlsx'
      });
    } else {
      throw new Error("Sharing is not available on this device");
    }

    return true;
  } catch (error) {
    console.error("Export failed:", error);
    throw error;
  }
};

export const importTodosFromExcel = async (): Promise<Todo[]> => {
  try {
    // 1. 选择文件
    const result = await DocumentPicker.getDocumentAsync({
      type: [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
        'application/vnd.ms-excel', // .xls
        'text/csv', // .csv
        'application/csv', // .csv
      ],
      copyToCacheDirectory: true
    });

    if (result.canceled) {
      return [];
    }

    const { uri } = result.assets[0];

    // 2. 读取文件内容 (Base64)
    // 注意：必须使用字符串 'base64' 而不是 ExpoFileSystem.EncodingType.Base64
    const content = await ExpoFileSystem.readAsStringAsync(uri, { encoding: 'base64' });

    // 3. 解析 Excel
    const wb = XLSX.read(content, { type: 'base64', cellDates: true });
    const wsname = wb.SheetNames[0];
    const ws = wb.Sheets[wsname];
    
    // 4. 转换为 JSON
    const data = XLSX.utils.sheet_to_json(ws);

    // 5. 映射回 Todo 结构
    const todos: Todo[] = data.map((row: any) => {
      // 辅助函数：处理日期
      const formatDate = (dateVal: any): string => {
        if (!dateVal) {
             const now = new Date();
             const year = now.getFullYear();
             const month = String(now.getMonth() + 1).padStart(2, '0');
             const day = String(now.getDate()).padStart(2, '0');
             return `${year}-${month}-${day}`;
        }
        if (dateVal instanceof Date) {
            // 使用本地时间而不是 UTC，以避免时区差异导致的日期偏移（例如 UTC+8 的 00:00 会变成前一天的 16:00）
            const year = dateVal.getFullYear();
            const month = String(dateVal.getMonth() + 1).padStart(2, '0');
            const day = String(dateVal.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        }
        // 如果是字符串，尝试直接返回或简单解析
        return String(dateVal);
      };

      const getTimestamp = (dateVal: any): number => {
          if (!dateVal) return Date.now();
          if (dateVal instanceof Date) {
              return dateVal.getTime();
          }
          if (typeof dateVal === 'string') {
              const d = new Date(dateVal);
              if (!isNaN(d.getTime())) {
                  return d.getTime();
              }
          }
          return Date.now();
      };

      const parseBoolean = (val: any): boolean => {
          if (!val) return false;
          if (typeof val === 'string') {
              const lower = val.toLowerCase().trim();
              return ['是', 'true', 'yes', '1', 'y'].includes(lower);
          }
          return val === true || val === 1;
      };

      const parseRepeat = (text?: string): 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly' => {
          if (!text) return 'none';
          const lower = String(text).toLowerCase().trim();
          if (lower === '每天' || lower === 'daily') return 'daily';
          if (lower === '每周' || lower === 'weekly') return 'weekly';
          if (lower === '每月' || lower === 'monthly') return 'monthly';
          if (lower === '每年' || lower === 'yearly') return 'yearly';
          return 'none';
      };

      // 提取原始值以进行逻辑判断
      const rawIsLongTerm = row['是否长期'] || row['IsLongTerm'] || row['isLongTerm'];
      const rawIsPinned = row['是否置顶'] || row['IsPinned'] || row['isPinned'];
      const rawPriority = row['优先级'] || row['Priority'];
      const rawRepeat = row['重复'] || row['Repeat'];
      const rawStart = row['开始时间'] || row['StartDate'] || row['StartTime'];
      const rawEnd = row['结束时间'] || row['EndDate'] || row['EndTime'];
      const rawDate = row['计划日期'] || row['TargetDate'] || row['Date'];
      const rawCompletedAt = row['完成时间'] || row['CompletedAt'];

      let isLongTerm = parseBoolean(rawIsLongTerm);
      let isPinned = parseBoolean(rawIsPinned);
      const repeat = parseRepeat(rawRepeat);
      const isCompleted = row['状态'] === '已完成' || row['Status'] === '已完成' || row['Status'] === 'Completed';

      // 智能推断：如果优先级包含"长期"，或者有重复规则，或者有起止时间，则视为长期
      if (!isLongTerm) {
          if (rawPriority && (String(rawPriority).includes('长期') || String(rawPriority).toLowerCase().includes('long'))) {
              isLongTerm = true;
          }
          if (repeat !== 'none') {
              isLongTerm = true;
          }
          if (rawStart && rawEnd) {
              isLongTerm = true;
          }
      }

      // 智能推断：如果优先级包含"重要"、"高"、"置顶"，则视为置顶
      if (!isPinned && rawPriority) {
          const p = String(rawPriority).toLowerCase();
          if (p.includes('重要') || p.includes('important') || p.includes('高') || p.includes('high') || p.includes('置顶') || p.includes('pin') || p.includes('top')) {
              isPinned = true;
          }
      }

      // 计算 Target Date (计划日期)
      let targetDate = '';
      
      // 规则 0: 如果已完成，且有完成时间，优先使用完成时间作为 targetDate
      // 这样可以确保历史记录准确显示在完成的那一天，而不是原计划日期
      if (isCompleted && rawCompletedAt) {
          targetDate = formatDate(rawCompletedAt);
      }
      else if (rawDate) {
          targetDate = formatDate(rawDate);
      } else {
          // 如果 Excel 没填计划日期，根据规则生成
          const todayKey = formatDate(null); // Today
          
          if (isCompleted) {
              // 规则 1: 如果已完成，但无完成时间，默认为今天
              targetDate = todayKey;
          } else {
              // 规则 2: 如果未完成
              // 针对 "优先级不是长期的待办" (这里理解为不重复的待办，虽然有起止时间可能被标记为 isLongTerm)
              // 逻辑：按开始时间和导入时间(今天)的匹配，哪个晚就按那个时间生成
              if (repeat === 'none' && rawStart) {
                  const startDateStr = formatDate(rawStart);
                  if (startDateStr > todayKey) {
                      targetDate = startDateStr;
                  } else {
                      targetDate = todayKey;
                  }
              } else {
                  // 其他情况 (如重复待办，或无开始时间)，默认为今天
                  // 重复待办的后续周期计算由 useTodos 处理
                  targetDate = todayKey;
              }
          }
      }

      // 修正逻辑：对于未完成且不重复的待办，确保 targetDate 不早于 startDate
      // 解决场景：导入的数据中，计划日期被错误记录为“今天”，但开始日期其实在“未来”（如 26年QC报告）
      // 此时应强制将其修正为开始日期
      if (!isCompleted && repeat === 'none' && rawStart) {
          const startDateStr = formatDate(rawStart);
          if (targetDate < startDateStr) {
              targetDate = startDateStr;
          }
      }

      // 处理 ID: 如果有则用之，否则暂存为 null (稍后在 importTodos 中处理)
      // 注意：这里我们生成一个临时 ID，但如果 Excel 中有 ID，我们优先使用
      const existingId = row['ID'] ? String(row['ID']) : (row['id'] ? String(row['id']) : null);

      // 确定 completedAt 时间
      let finalCompletedAt: number | undefined;
      if (isCompleted) {
          const cVal = row['完成时间'] || row['CompletedAt'];
          if (cVal) {
              finalCompletedAt = getTimestamp(cVal);
          } else {
              // 如果没有完成时间，但有计划日期，则认为是在计划日期完成的
              // 避免默认变成“导入时间(今天)”，导致历史记录显示错误
              if (rawDate) {
                  finalCompletedAt = getTimestamp(rawDate);
              } else {
                  finalCompletedAt = Date.now();
              }
          }
      }

      return {
        id: existingId || (Date.now().toString(36) + Math.random().toString(36).slice(2)),
        text: row['待办内容'] || row['Content'] || row['待办事项'] || row['Title'] || '',
        completed: isCompleted,
        targetDate: targetDate,
        createdAt: getTimestamp(row['创建时间'] || row['CreatedAt']),
        updatedAt: Date.now(),
        completedAt: finalCompletedAt,
        
        // 新增字段映射
        isLongTerm: isLongTerm,
        isPinned: isPinned,
        startDate: rawStart ? formatDate(rawStart) : (repeat !== 'none' ? targetDate : undefined),
        endDate: rawEnd ? formatDate(rawEnd) : undefined,
        isAllDay: parseBoolean(row['全天'] || row['IsAllDay']),
        isAllYear: parseBoolean(row['全年'] || row['IsAllYear']),
        isMonth: parseBoolean(row['本月'] || row['IsMonth']),
        repeat: repeat
      };
    }).filter(t => t.text); // 过滤空行

    return todos;
  } catch (error) {
    console.error("Import failed:", error);
    throw error;
  }
};
