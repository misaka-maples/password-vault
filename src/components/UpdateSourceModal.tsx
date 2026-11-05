import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { getCustomUpdateUrl, setCustomUpdateUrl, AppReleaseInfo } from '../services/update';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSimulateUpdate: (sampleRelease: AppReleaseInfo) => void;
  onShowToast: (msg: string) => void;
}

export const UpdateSourceModal: React.FC<Props> = ({
  visible,
  onClose,
  onSimulateUpdate,
  onShowToast,
}) => {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      getCustomUpdateUrl().then((saved) => {
        setUrl(saved || '');
      });
    }
  }, [visible]);

  const handleSave = async () => {
    setLoading(true);
    try {
      await setCustomUpdateUrl(url);
      onShowToast(url.trim() ? '已保存自定义更新源' : '已恢复默认更新源 (Supabase)');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleTestSimulation = () => {
    onClose();
    const sampleRelease: AppReleaseInfo = {
      version: '1.1.0',
      versionCode: 2,
      title: '发现新版本 v1.1.0 (测试体验)',
      releaseNotes:
        '1. 支持软件内一键检查更新与静默下载安装；\n2. 弹窗全面统一拟物粗黑边插画风；\n3. 优化指纹面容秒级识别解锁性能；\n4. 适配全面屏手势抬高底部导航栏。',
      downloadUrl:
        url.trim() ||
        'https://github.com/react-native-community/react-native-template-typescript/raw/master/template/android/app/build.gradle', // safe fallback
      fileSize: '33.2 MB',
      forceUpdate: false,
      publishedAt: '2026-11-05',
    };
    onSimulateUpdate(sampleRelease);
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <View style={styles.card}>
          <View style={[styles.iconCircle, { backgroundColor: '#FFF0E8' }]}>
            <Text style={styles.iconText}>⚙️</Text>
          </View>

          <Text style={styles.title}>版本更新源设置</Text>

          <Text style={styles.subtitle}>
            默认通过 Supabase 云端自动获取更新。你也可以填写自定义的 JSON 版本配置地址：
          </Text>

          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="例如：https://example.com/version.json"
              placeholderTextColor="#A79791"
              value={url}
              onChangeText={setUrl}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* 模拟测试入口 */}
          <TouchableOpacity
            style={styles.testBtn}
            onPress={handleTestSimulation}
            activeOpacity={0.7}
          >
            <Text style={styles.testBtnText}>💡 立即模拟触发新版本下载安装</Text>
          </TouchableOpacity>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.btn, styles.cancelBtn]}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelBtnText}>取消</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btn, styles.primaryBtn, loading && styles.disabledBtn]}
              onPress={handleSave}
              disabled={loading}
              activeOpacity={0.7}
            >
              <Text style={styles.primaryBtnText}>{loading ? '保存中...' : '保存设置'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(32, 20, 18, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFDFB',
    borderRadius: 26,
    borderWidth: 2.2,
    borderColor: '#2D3142',
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 22,
    alignItems: 'center',
    shadowColor: '#2D3142',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 10,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2.2,
    borderColor: '#2D3142',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  iconText: {
    fontSize: 28,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: '#2D3142',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: '#6F5E59',
    lineHeight: 19,
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  inputWrapper: {
    width: '100%',
    marginBottom: 14,
  },
  input: {
    width: '100%',
    backgroundColor: '#FAF5F2',
    borderWidth: 2,
    borderColor: '#2D3142',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: '#2D3142',
    fontWeight: '600',
  },
  testBtn: {
    width: '100%',
    backgroundColor: '#FFF0ED',
    borderWidth: 1.8,
    borderColor: '#FF7A59',
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: 'center',
    marginBottom: 18,
  },
  testBtnText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#FF5C5C',
  },
  buttonRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  btn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 16,
    borderWidth: 2.2,
    borderColor: '#2D3142',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    backgroundColor: '#F5ECE7',
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#6F5E59',
  },
  primaryBtn: {
    backgroundColor: '#FF7A59',
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  disabledBtn: {
    opacity: 0.6,
  },
});
