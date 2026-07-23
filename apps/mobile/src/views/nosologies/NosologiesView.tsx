import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppIcon } from '../../components/AppIcon';
import { Icons } from '../../components/icons';
import { useAuth } from '../../context/AuthContext';
import { useBranding } from '../../context/BrandingContext';
import { nosologiesService } from '../../services/nosologies.service';
import type { NosologyCategory } from '../../types/nosology';
import { AccountDrawer } from '../doctor/patients/components/AccountDrawer';
import { PaymentsView } from '../doctor/payments/PaymentsView';
import { NosologySearchBar } from './components/NosologySearchBar';
import {
  NosologyCategoryRow,
  NosologyItemRow,
} from './components/NosologyRows';
import { createNosologiesStyles } from './styles/nosologies.styles';

type NosologiesViewProps = {
  onOpenMessages?: () => void;
  onOpenProfile?: () => void;
};

export function NosologiesView({
  onOpenMessages,
  onOpenProfile,
}: NosologiesViewProps) {
  const insets = useSafeAreaInsets();
  const branding = useBranding();
  const { logout } = useAuth();
  const styles = useMemo(
    () => createNosologiesStyles(branding.colors),
    [branding.colors],
  );

  const [categories, setCategories] = useState<NosologyCategory[]>([]);
  const [query, setQuery] = useState('');
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showingPayments, setShowingPayments] = useState(false);

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

  const goBack = useCallback(() => {
    if (activeCategoryId) {
      setActiveCategoryId(null);
      setSelectedItemId(null);
      setQuery('');
      return;
    }
  }, [activeCategoryId]);

  const onDark = branding.colors.textOnDark;

  const handleMenuSelect = (id: string) => {
    setMenuOpen(false);
    if (id === 'salir') void logout();
    else if (id === 'perfil') onOpenProfile?.();
    else if (id === 'suscripcion') setShowingPayments(true);
    else
      Alert.alert(
        'Próximamente',
        'Esta opción del menú se conectará en una siguiente iteración.',
      );
  };

  if (showingPayments) {
    return (
      <>
        <PaymentsView
          onBack={() => setShowingPayments(false)}
          onOpenMenu={() => setMenuOpen(true)}
          onOpenMessages={onOpenMessages}
        />
        <AccountDrawer
          visible={menuOpen}
          onClose={() => setMenuOpen(false)}
          onSelect={handleMenuSelect}
        />
      </>
    );
  }

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 10) }]}>
        <View style={styles.headerLeft}>
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: 'rgba(255,255,255,0.2)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <AppIcon icon={Icons.account} size={20} color={onDark} />
          </View>
        </View>
        <View style={styles.headerActions}>
          <Pressable style={styles.headerIconBtn} accessibilityLabel="Premios">
            <AppIcon icon={Icons.gift} size={20} color={onDark} />
          </Pressable>
          <Pressable
            style={styles.headerIconBtn}
            onPress={onOpenMessages}
            accessibilityLabel="Mensajes"
          >
            <AppIcon icon={Icons.chat} size={20} color={onDark} />
            <View style={styles.badge}>
              <Text style={styles.badgeText}>1</Text>
            </View>
          </Pressable>
          <Pressable
            style={styles.headerIconBtn}
            onPress={() => setMenuOpen(true)}
            accessibilityLabel="Menú"
          >
            <AppIcon icon={Icons.menu} size={22} color={onDark} />
          </Pressable>
        </View>
      </View>

      <View style={styles.body}>
        <View style={styles.titleRow}>
          {activeCategoryId ? (
            <Pressable style={styles.backCircle} onPress={goBack}>
              <AppIcon
                icon={Icons.back}
                size={22}
                color={branding.colors.primary}
              />
            </Pressable>
          ) : null}
          <Text style={styles.title}>Lista de nosologías</Text>
        </View>
        <Text style={styles.hint}>
          Introduzca el nombre de la nosología en la barra de búsqueda o
          selecciónelo de la lista
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
                <Text style={styles.emptyText}>No hay categorías que coincidan.</Text>
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
                <Text style={styles.emptyText}>No hay nosologías que coincidan.</Text>
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

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <Pressable
            style={[
              styles.saveBtn,
              activeCategory && !selectedItemId ? styles.saveBtnDisabled : null,
            ]}
            disabled={Boolean(activeCategory) && !selectedItemId}
            onPress={() => {
              if (!activeCategory) {
                Alert.alert(
                  'Selecciona una categoría',
                  'Entra a una categoría y elige una nosología para guardar el resultado.',
                );
                return;
              }
              const selected = activeCategory.items.find(
                (i) => i.id === selectedItemId,
              );
              Alert.alert(
                'Resultado guardado',
                selected
                  ? `Nosología: ${selected.name}`
                  : 'Selección guardada (mock).',
              );
            }}
          >
            <Text style={styles.saveBtnText}>Guardar Resultado</Text>
          </Pressable>
        </View>
      </View>

      <AccountDrawer
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        onSelect={handleMenuSelect}
      />
    </View>
  );
}
