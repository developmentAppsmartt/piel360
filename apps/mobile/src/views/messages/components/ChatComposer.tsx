import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppIcon } from '../../../components/AppIcon';
import { Icons } from '../../../components/icons';
import type { ChatStyles } from '../styles/chat.styles';

type ChatComposerProps = {
  styles: ChatStyles;
  onSend: (text: string) => void;
};

export function ChatComposer({ styles, onSend }: ChatComposerProps) {
  const insets = useSafeAreaInsets();
  const [text, setText] = useState('');
  const muted = styles.toolIcon.color as string;
  const onDark = styles.sendBtnText.color as string;

  const submit = () => {
    const value = text.trim();
    if (!value) return;
    onSend(value);
    setText('');
  };

  return (
    <View style={[styles.composerWrap, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      <View style={styles.composerInputWrap}>
        <TextInput
          style={styles.composerInput}
          value={text}
          onChangeText={setText}
          placeholder="Escribir mensaje..."
          placeholderTextColor="#9CA3AF"
          multiline
        />
        <View style={styles.composerTools}>
          <AppIcon icon={Icons.paperclip} size={18} color={muted} />
          <AppIcon icon={Icons.document} size={18} color={muted} />
        </View>
      </View>
      <Pressable
        style={styles.sendBtn}
        onPress={submit}
        accessibilityRole="button"
        accessibilityLabel="Enviar mensaje"
      >
        <AppIcon icon={Icons.send} size={18} color={onDark} />
      </Pressable>
    </View>
  );
}
