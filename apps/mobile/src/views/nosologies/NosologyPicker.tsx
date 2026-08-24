import { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppIcon } from '../../components/AppIcon';
import { Icons } from '../../components/icons';
import { useBranding } from '../../context/BrandingContext';
import { nosologiesService } from '../../services/nosologies.service';
import type { NosologyCategory, NosologyItem } from '../../types/nosology';
import { NosologySearchBar } from './components/NosologySearchBar';
import {
  NosologyCategoryRow,
  NosologyItemRow,
} from './components/NosologyRows';
import { createNosologiesStyles } from './styles/nosologies.styles';

type NosologyPickerProps = {
  title?: string;
  onCancel: () => void;
  onSelect: (item: NosologyItem, category: NosologyCategory) => void;
};

/**
 * Selector de nosologías solo para corregir un resultado de análisis.
 * No forma parte de la navegación principal.
 */
export function NosologyPicker({
  title = 'Corregir con nosología',
  onCancel,
  onSelect,
}: NosologyPickerProps) {
  const insets = useSafeAreaInsets();
  const branding = useBranding();
  const styles = useMemo(
    () => createNosologiesStyles(branding.colors),
    [branding.colors],
  );
  const onDark = branding.colors.textOnDark;

  const [categories, setCategories] = useState<NosologyCategory[]>([]);
  const [query, setQuery] = useState('');
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  useEffect(() => {
    void nosologiesService.listCategories().then(setCategories);
  }, []);

  const activeCategory = useMemo(
    () => categories.find((c) => c.id === activeCategoryId) ?? null,
    [categories, activeCategoryId],
  );

  const visibleCategories = useMemo(
    () => nosologiesService.filterCategories(categories, query),
    [categories, query],
  );

  const visibleItems = useMemo(() => {
    if (!activeCategory) return [];
    return nosologiesService.filterItems(activeCategory.items, query);
  }, [activeCategory, query]);

  function goBackLevel() {
    if (activeCategoryId) {
      setActiveCategoryId(null);
      setSelectedItemId(null);
      setQuery('');
      return;
    }
    onCancel();
  }

  function confirmSelection() {
    if (!activeCategory || !selectedItemId) return;
    const item = activeCategory.items.find((i) => i.id === selectedItemId);
    if (!item) return;
    onSelect(item, activeCategory);
  }

  return (
    <View style={[styles.screen, { backgroundColor: branding.colors.primary }]}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 10) }]}>
        <Pressable
          style={styles.headerIconBtn}
          onPress={goBackLevel}
          accessibilityLabel="Volver"
        >
          <AppIcon icon={Icons.back} size={22} color={onDark} />
        </Pressable>
        <Text
          style={{
            flex: 1,
            color: onDark,
            fontWeight: '800',
            fontSize: 16,
            textAlign: 'center',
          }}
          numberOfLines={1}
        >
          {title}
        </Text>
        <Pressable
          style={styles.headerIconBtn}
          onPress={onCancel}
          accessibilityLabel="Cerrar"
        >
          <AppIcon icon={Icons.close} size={20} color={onDark} />
        </Pressable>
      </View>

      <View style={styles.body}>
        <View style={styles.titleRow}>
          {activeCategoryId ? (
            <Pressable style={styles.backCircle} onPress={goBackLevel}>
              <AppIcon
                icon={Icons.back}
                size={22}
                color={branding.colors.primary}
              />
            </Pressable>
          ) : null}
          <Text style={styles.title}>
            {activeCategory ? activeCategory.name : 'Lista de nosologías'}
          </Text>
        </View>
        <Text style={styles.hint}>
          Busca o elige una nosología para reemplazar el nombre del resultado.
        </Text>

        <NosologySearchBar
          styles={styles}
          value={query}
          onChange={setQuery}
          primaryColor={branding.colors.primary}
        />

        {!activeCategory ? (
          <FlatList
            data={visibleCategories}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyText}>
                  No hay categorías que coincidan.
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <NosologyCategoryRow
                styles={styles}
                label={item.name}
                onDark={onDark}
                onPress={() => {
                  setActiveCategoryId(item.id);
                  setSelectedItemId(null);
                  setQuery('');
                }}
              />
            )}
          />
        ) : (
          <FlatList
            data={visibleItems}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyText}>
                  No hay nosologías que coincidan.
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <NosologyItemRow
                styles={styles}
                label={item.name}
                selected={selectedItemId === item.id}
                onPress={() => setSelectedItemId(item.id)}
              />
            )}
          />
        )}

        <View
          style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}
        >
          <Pressable
            style={[
              styles.saveBtn,
              (!activeCategory || !selectedItemId) && styles.saveBtnDisabled,
            ]}
            disabled={!activeCategory || !selectedItemId}
            onPress={confirmSelection}
          >
            <Text style={styles.saveBtnText}>
              Reemplazar diagnóstico
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
