import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { AppIcon } from '../../../components/AppIcon';
import { Icons } from '../../../components/icons';
import type { ChatStyles } from '../styles/chat.styles';

export type PendingAttachment = {
  uri: string;
  name: string;
  mimeType: string;
};

type ChatComposerProps = {
  styles: ChatStyles;
  onSend: (text: string) => void;
  onSendAttachment: (file: PendingAttachment) => Promise<void> | void;
  sending?: boolean;
};

export function ChatComposer({
  styles,
  onSend,
  onSendAttachment,
  sending = false,
}: ChatComposerProps) {
  const insets = useSafeAreaInsets();
  const [text, setText] = useState('');
  const muted = styles.toolIcon.color as string;
  const onDark = styles.sendBtnText.color as string;

  const submit = () => {
    const value = text.trim();
    if (!value || sending) return;
    onSend(value);
    setText('');
  };

  async function pickImage() {
    if (sending) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        'Permiso',
        'Necesitamos acceso a tu galería para enviar imágenes.',
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    const mimeType = asset.mimeType ?? 'image/jpeg';
    const name =
      asset.fileName ??
      `imagen.${mimeType.includes('png') ? 'png' : 'jpg'}`;
    await onSendAttachment({
      uri: asset.uri,
      name,
      mimeType,
    });
  }

  async function pickPdf() {
    if (sending) return;
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    await onSendAttachment({
      uri: asset.uri,
      name: asset.name || 'documento.pdf',
      mimeType: asset.mimeType ?? 'application/pdf',
    });
  }

  function openAttachMenu() {
    Alert.alert('Adjuntar', 'Elige el tipo de archivo', [
      { text: 'Imagen', onPress: () => void pickImage() },
      { text: 'PDF', onPress: () => void pickPdf() },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  }

  return (
    <View
      style={[
        styles.composerWrap,
        { paddingBottom: Math.max(insets.bottom, 10) },
      ]}
    >
      <View style={styles.composerInputWrap}>
        <TextInput
          style={styles.composerInput}
          value={text}
          onChangeText={setText}
          placeholder="Escribir mensaje..."
          placeholderTextColor="#9CA3AF"
          multiline
          editable={!sending}
        />
        <View style={styles.composerTools}>
          <Pressable
            onPress={openAttachMenu}
            disabled={sending}
            accessibilityLabel="Adjuntar archivo"
          >
            <AppIcon icon={Icons.paperclip} size={18} color={muted} />
          </Pressable>
          <Pressable
            onPress={() => void pickPdf()}
            disabled={sending}
            accessibilityLabel="Adjuntar PDF"
          >
            <AppIcon icon={Icons.document} size={18} color={muted} />
          </Pressable>
        </View>
      </View>
      <Pressable
        style={styles.sendBtn}
        onPress={submit}
        disabled={sending}
        accessibilityRole="button"
        accessibilityLabel="Enviar mensaje"
      >
        {sending ? (
          <ActivityIndicator color={onDark} />
        ) : (
          <AppIcon icon={Icons.send} size={18} color={onDark} />
        )}
      </Pressable>
    </View>
  );
}
