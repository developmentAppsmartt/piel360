import { Pressable, Text, TextInput, View } from 'react-native';
import { AppIcon } from '../../../components/AppIcon';
import { Icons } from '../../../components/icons';
import type { NosologiesStyles } from '../styles/nosologies.styles';

type NosologySearchBarProps = {
  styles: NosologiesStyles;
  value: string;
  onChange: (value: string) => void;
  primaryColor: string;
};

export function NosologySearchBar({
  styles,
  value,
  onChange,
  primaryColor,
}: NosologySearchBarProps) {
  return (
    <View style={styles.searchWrap}>
      <AppIcon icon={Icons.search} size={20} color={primaryColor} />
      <TextInput
        style={styles.searchInput}
        value={value}
        onChangeText={onChange}
        placeholder="Búsqueda por nosología"
        placeholderTextColor="#9CA3AF"
        autoCorrect={false}
        autoCapitalize="none"
      />
      {value ? (
        <Pressable onPress={() => onChange('')} hitSlop={8}>
          <Text style={{ color: '#9CA3AF', fontWeight: '700' }}>×</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
