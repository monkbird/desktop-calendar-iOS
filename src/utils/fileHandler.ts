import XLSX from 'xlsx';
import { Todo } from '../types';

export const exportTodosToExcel = async (todos: Todo[]) => {
  try {
    const FileSystem = require('expo-file-system');
    const Sharing = require('expo-sharing');

    // 1. 转换数据格式
    const data = todos.map(todo => ({
      ID: todo.id,
      Content: todo.text,
      Completed: todo.completed ? 'Yes' : 'No',
      TargetDate: todo.targetDate,
      CompletedAt: todo.completedAt ? new Date(todo.completedAt).toLocaleString() : '',
      CreatedAt: todo.createdAt ? new Date(todo.createdAt).toLocaleString() : '',
      UpdatedAt: todo.updatedAt ? new Date(todo.updatedAt).toLocaleString() : '',
    }));

    // 2. 创建工作簿
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Todos");

    // 3. 生成 Base64 数据
    const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });

    // 4. 保存到临时文件
    const filename = `todos_backup_${new Date().toISOString().split('T')[0]}.xlsx`;
    const uri = FileSystem.cacheDirectory + filename;
    
    // 写入 Base64
    await FileSystem.writeAsStringAsync(uri, wbout, { encoding: FileSystem.EncodingType.Base64 });

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
    const DocumentPicker = require('expo-document-picker');
    const FileSystem = require('expo-file-system');

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
    const content = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });

    // 3. 解析 Excel
    const wb = XLSX.read(content, { type: 'base64' });
    const wsname = wb.SheetNames[0];
    const ws = wb.Sheets[wsname];
    
    // 4. 转换为 JSON
    const data = XLSX.utils.sheet_to_json(ws);

    // 5. 映射回 Todo 结构
    const todos: Todo[] = data.map((row: any) => {
      return {
        id: row.ID ? String(row.ID) : Date.now().toString() + Math.random().toString().slice(2),
        text: row.Content || row.text || '',
        completed: row.Completed === 'Yes' || row.Completed === true || row.completed === true,
        targetDate: row.TargetDate || new Date().toISOString().split('T')[0],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
    }).filter(t => t.text); // 过滤空行

    return todos;
  } catch (error) {
    console.error("Import failed:", error);
    throw error;
  }
};
