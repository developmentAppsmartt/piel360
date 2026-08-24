import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { useBranding } from '../../../../context/BrandingContext';
import {
  CATALOG_TABS,
  matchCatalogTab,
  productsService,
  type CatalogProduct,
  type CatalogTabKey,
} from '../../../../services/products.service';
import { createYoucamResultsStyles } from '../styles/youcamResults.styles';

type YoucamCatalogSectionProps = {
  styles: ReturnType<typeof createYoucamResultsStyles>;
};

export function YoucamCatalogSection({ styles }: YoucamCatalogSectionProps) {
  const branding = useBranding();
  const [tab, setTab] = useState<CatalogTabKey>('productos');
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const list = await productsService.list();
        if (!cancelled) setProducts(list);
      } catch {
        if (!cancelled) setProducts([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const matched = products.filter((p) =>
      matchCatalogTab(p.category.categoryName, tab),
    );
    if (matched.length > 0) return matched;
    // Si el doctor aún no nombró categorías como en la UI, mostrar todo en Productos.
    if (tab === 'productos') return products;
    return [];
  }, [products, tab]);

  return (
    <View style={styles.catalogBlock}>
      <View style={styles.catalogTabBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.catalogTabs}
        >
          {CATALOG_TABS.map((t) => {
            const active = t.key === tab;
            return (
              <Pressable
                key={t.key}
                style={[styles.catalogTab, active && styles.catalogTabOn]}
                onPress={() => setTab(t.key)}
              >
                <Text
                  style={[
                    styles.catalogTabText,
                    active && styles.catalogTabTextOn,
                  ]}
                >
                  {t.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {loading ? (
        <ActivityIndicator color={branding.colors.primary} />
      ) : filtered.length === 0 ? (
        <Text style={styles.catalogEmpty}>
          No hay ítems en «{CATALOG_TABS.find((t) => t.key === tab)?.label}».
          Añádelos desde el panel de productos (categorías Rutinas, Productos,
          Suplementos o Tratamientos).
        </Text>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.catalogCards}
        >
          {filtered.map((item) => (
            <Pressable
              key={item.id}
              style={styles.catalogCard}
              onPress={() => {
                if (item.productUrl) void Linking.openURL(item.productUrl);
              }}
            >
              {item.imageUrl ? (
                <Image
                  source={{ uri: item.imageUrl }}
                  style={styles.catalogCardImage}
                  contentFit="cover"
                />
              ) : (
                <View style={styles.catalogCardImagePlaceholder}>
                  <Text style={styles.catalogCardPlaceholderText}>
                    {item.productName.slice(0, 1).toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={styles.catalogCardFooter}>
                <Text style={styles.catalogCardTitle} numberOfLines={2}>
                  {item.productName}
                </Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
}
