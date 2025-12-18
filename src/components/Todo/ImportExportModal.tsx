import { BlurView } from 'expo-blur';
import { FileDown, FileUp, X } from 'lucide-react-native';
import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { ZoomIn, ZoomOut } from 'react-native-reanimated';

interface ImportExportModalProps {
  visible: boolean;
  onClose: () => void;
  onImport: () => void;
  onExport: () => void;
}

export const ImportExportModal: React.FC<ImportExportModalProps> = ({
  visible,
  onClose,
  onImport,
  onExport,
}) => {
  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        
        <Animated.View 
          entering={ZoomIn.duration(200)} 
          exiting={ZoomOut.duration(200)}
          style={styles.contentContainer}
        >
          <View style={styles.header}>
            <Text style={styles.title}>数据管理</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={20} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>
          </View>

          <View style={styles.optionsContainer}>
            <TouchableOpacity style={styles.optionButton} onPress={onImport}>
              <View style={[styles.iconContainer, { backgroundColor: '#3b82f6' }]}>
                <FileDown size={24} color="white" />
              </View>
              <View style={styles.textContainer}>
                <Text style={styles.optionTitle}>导入 Excel</Text>
                <Text style={styles.optionDescription}>从 Excel 文件恢复待办数据</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.optionButton} onPress={onExport}>
              <View style={[styles.iconContainer, { backgroundColor: '#10b981' }]}>
                <FileUp size={24} color="white" />
              </View>
              <View style={styles.textContainer}>
                <Text style={styles.optionTitle}>导出 Excel</Text>
                <Text style={styles.optionDescription}>将所有待办备份为 Excel 文件</Text>
              </View>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  contentContainer: {
    width: '85%',
    backgroundColor: '#1c1c1e',
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: 'white',
  },
  closeButton: {
    padding: 4,
  },
  optionsContainer: {
    gap: 16,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 16,
    borderRadius: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
  },
});
