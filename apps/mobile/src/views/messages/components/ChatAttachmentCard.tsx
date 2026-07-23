import { Pressable, Text, View } from 'react-native';
import { AppIcon } from '../../../components/AppIcon';
import { Icons } from '../../../components/icons';
import type { ChatStyles } from '../styles/chat.styles';

type ChatAttachmentCardProps = {
  styles: ChatStyles;
  name: string;
  onDownload?: () => void;
};

export function ChatAttachmentCard({
  styles,
  name,
  onDownload,
}: ChatAttachmentCardProps) {
  return (
    <View style={styles.attachment}>
      <View style={styles.attachmentIcon}>
        <AppIcon
          icon={Icons.file}
          size={18}
          color={styles.attachmentIconText.color as string}
        />
      </View>
      <Text style={styles.attachmentName} numberOfLines={2}>
        {name}
      </Text>
      <Pressable
        style={styles.attachmentAction}
        onPress={onDownload}
        accessibilityRole="button"
        accessibilityLabel="Descargar archivo"
      >
        <AppIcon icon={Icons.download} size={16} color="#FFF" />
      </Pressable>
    </View>
  );
}
