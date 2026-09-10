import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { WebView } from 'react-native-webview';
import { AppIcon } from '../../../../components/AppIcon';
import { Icons, type AppIconName } from '../../../../components/icons';
import { useBranding } from '../../../../context/BrandingContext';
import {
  routinesService,
  type RecommendedRoutine,
  type RoutineStep,
} from '../../../../services/routines.service';
import { skinAgeRulesService } from '../../../../services/skin-age-rules.service';
import {
  treatmentsService,
  type RecommendedTreatment,
} from '../../../../services/treatments.service';
import { resolveMediaUrl } from '../../../../utils/mediaUrl';
import { createYoucamResultsStyles } from '../styles/youcamResults.styles';

type YoucamCatalogSectionProps = {
  styles: ReturnType<typeof createYoucamResultsStyles>;
  analysisId: string;
  metricType: string | null;
};

type CatalogKind = 'routine' | 'product' | 'treatment' | 'supplement';

type CatalogCard = {
  id: string;
  title: string;
  subtitle?: string;
  description?: string | null;
  imageUrl: string | null;
  url?: string | null;
  kind: CatalogKind;
};

type CatalogDetail = {
  title: string;
  subtitle?: string;
  description?: string | null;
  imageUrl: string | null;
  url?: string | null;
  kind: CatalogKind;
  extras?: string[];
  mediaItems?: MediaPreview[];
};

type MediaPreview = {
  kind: 'video' | 'image';
  url: string;
  title: string;
};

function mentions(text: string | null | undefined, words: string[]): boolean {
  const n = (text ?? '').toLowerCase();
  return words.some((w) => n.includes(w));
}

function routineHasMoment(routine: RecommendedRoutine, kind: 'am' | 'pm') {
  const words =
    kind === 'am'
      ? ['mañana', 'manana', 'am', 'morning', 'día', 'dia']
      : ['noche', 'pm', 'night', 'evening'];
  if (mentions(routine.name, words) || mentions(routine.description, words)) {
    return true;
  }
  return routine.steps.some(
    (s) => mentions(s.title, words) || mentions(s.description, words),
  );
}

function inferMediaKind(
  mediaType: string | null | undefined,
  url: string,
): 'video' | 'image' {
  const type = (mediaType ?? '').toLowerCase().trim();
  if (type === 'video') return 'video';
  if (type === 'image' || type === 'gif') return 'image';
  if (/\.(mp4|mov|webm|m4v|mkv)(\?|#|$)/i.test(url)) return 'video';
  return 'image';
}

function stepMedia(step: RoutineStep): MediaPreview | null {
  const url = resolveMediaUrl(step.mediaUrl);
  if (!url) return null;
  return {
    kind: inferMediaKind(step.mediaType, url),
    url,
    title: step.title,
  };
}

function routineMediaItems(routine: RecommendedRoutine): MediaPreview[] {
  return [...routine.steps]
    .sort((a, b) => a.order - b.order)
    .map(stepMedia)
    .filter((item): item is MediaPreview => item != null);
}

function routineImages(routine: RecommendedRoutine): string[] {
  return routineMediaItems(routine)
    .filter((item) => item.kind === 'image')
    .map((item) => item.url)
    .slice(0, 3);
}

function uniqueCards(cards: CatalogCard[]): CatalogCard[] {
  const seen = new Set<string>();
  return cards.filter((c) => {
    if (seen.has(c.id)) return false;
    seen.add(c.id);
    return true;
  });
}

function openUrl(url?: string | null) {
  if (url) void Linking.openURL(url);
}

type RecoKind = 'routines' | 'products' | 'treatments' | 'supplements';

function matchesMetric(
  conditions: { metricType: string }[] | undefined,
  metricType: string,
) {
  return (conditions ?? []).some((c) => c.metricType === metricType);
}

export function YoucamCatalogSection({
  styles,
  analysisId,
  metricType,
}: YoucamCatalogSectionProps) {
  const branding = useBranding();
  const primary = branding.colors.primary;
  const muted = branding.colors.muted;
  const [open, setOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [routines, setRoutines] = useState<RecommendedRoutine[]>([]);
  const [treatments, setTreatments] = useState<RecommendedTreatment[]>([]);
  const [directProducts, setDirectProducts] = useState<CatalogCard[]>([]);
  const [directSupplements, setDirectSupplements] = useState<CatalogCard[]>([]);
  const [skinAgeNote, setSkinAgeNote] = useState<string | null>(null);
  const [selectedRoutineId, setSelectedRoutineId] = useState<string | null>(
    null,
  );
  const [detail, setDetail] = useState<CatalogDetail | null>(null);
  const [mediaPreview, setMediaPreview] = useState<MediaPreview | null>(null);
  const [sectionOpen, setSectionOpen] = useState<Record<RecoKind, boolean>>({
    routines: true,
    products: true,
    treatments: true,
    supplements: true,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setSkinAgeNote(null);
      setDirectProducts([]);
      setDirectSupplements([]);
      if (!metricType) {
        if (!cancelled) {
          setRoutines([]);
          setTreatments([]);
          setLoading(false);
        }
        return;
      }
      try {
        if (metricType === 'skin_age') {
          const age = await skinAgeRulesService.recommendForAnalysis(analysisId);
          if (cancelled) return;
          const reco = age.recommendations;
          const diff = age.snapshot.skinAgeDifference;
          const diffLabel =
            diff == null ? null : `${diff > 0 ? '+' : ''}${diff} años`;
          setSkinAgeNote(
            age.matchedRule
              ? `Según la diferencia de edad de la piel${diffLabel ? ` (${diffLabel})` : ''}: ${age.matchedRule.label}`
              : age.snapshot.message,
          );
          setRoutines(
            reco.routines.map((routine) => ({
              id: routine.id,
              doctorId: '',
              name: routine.name,
              description: routine.description,
              isActive: true,
              conditions: [],
              steps: (routine.steps ?? []).map((step) => ({
                id: step.id,
                routineId: routine.id,
                order: step.order,
                title: step.title,
                description: step.description,
                mediaUrl: step.mediaUrl,
                mediaType: step.mediaType,
                productId: step.productId ?? step.product?.id ?? null,
                product: step.product
                  ? {
                      id: step.product.id,
                      productName: step.product.productName,
                      productType: step.product.productType,
                      productUrl: step.product.productUrl ?? null,
                      imageUrl: resolveMediaUrl(step.product.imageUrl),
                    }
                  : null,
              })),
            })),
          );
          setTreatments(
            reco.treatments.map((treatment) => ({
              id: treatment.id,
              doctorId: '',
              categoryId: treatment.id,
              category: treatment.categoryName
                ? { id: treatment.id, categoryName: treatment.categoryName }
                : { id: treatment.id, categoryName: 'Tratamiento' },
              name: treatment.name,
              description: treatment.description,
              isActive: true,
              conditions: [],
              items: (treatment.items ?? []).map((item, index) => ({
                id: item.id,
                treatmentId: treatment.id,
                order: index,
                note: item.note,
                productId: item.productId,
                product: {
                  id: item.productId,
                  productName: item.productName,
                  productType:
                    item.productType === 'supplement' ? 'supplement' : 'product',
                  productDescription: item.note,
                  productUrl: item.productUrl ?? null,
                  imageUrl: item.imageUrl ?? null,
                },
              })),
            })),
          );
          setDirectProducts(
            reco.products.map((product) => ({
              id: product.id,
              title: product.name,
              subtitle: product.categoryName ?? undefined,
              description: product.description,
              imageUrl: resolveMediaUrl(product.imageUrl),
              url: product.productUrl,
              kind: 'product' as const,
            })),
          );
          setDirectSupplements(
            reco.supplements.map((product) => ({
              id: product.id,
              title: product.name,
              subtitle: product.categoryName ?? undefined,
              description: product.description,
              imageUrl: resolveMediaUrl(product.imageUrl),
              url: product.productUrl,
              kind: 'supplement' as const,
            })),
          );
        } else {
          const [recs, treats] = await Promise.all([
            routinesService.listRecommended(analysisId),
            treatmentsService.listRecommended(analysisId),
          ]);
          if (cancelled) return;
          setRoutines(recs.filter((r) => matchesMetric(r.conditions, metricType)));
          setTreatments(
            treats.filter((t) => matchesMetric(t.conditions, metricType)),
          );
        }
      } catch {
        if (!cancelled) {
          setRoutines([]);
          setTreatments([]);
          setDirectProducts([]);
          setDirectSupplements([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [analysisId, metricType]);

  const visibleRoutines = routines;
  const productCards = useMemo(
    () =>
      uniqueCards([
        ...directProducts,
        ...treatments
          .filter((t) => !t.categoryId)
          .flatMap((t) =>
            t.items
              .filter((item) => item.product.productType !== 'supplement')
              .map((item) => ({
                id: item.product.id,
                title: item.product.productName,
                subtitle: t.name,
                description:
                  item.note ??
                  item.product.productDescription ??
                  t.description,
                imageUrl: resolveMediaUrl(item.product.imageUrl),
                url: item.product.productUrl,
                kind: 'product' as const,
              })),
          ),
      ]),
    [treatments, directProducts],
  );

  const treatmentCards = useMemo(
    () =>
      uniqueCards(
        treatments
          .filter((t) => Boolean(t.categoryId))
          .map((t) => ({
            id: t.id,
            title: t.name,
            subtitle: t.category?.categoryName ?? undefined,
            description: t.description,
            imageUrl: resolveMediaUrl(t.items[0]?.product.imageUrl ?? null),
            url: t.items[0]?.product.productUrl ?? null,
            kind: 'treatment' as const,
          })),
      ),
    [treatments],
  );

  const supplementCards = useMemo(
    () =>
      uniqueCards([
        ...directSupplements,
        ...treatments
          .filter((t) => !t.categoryId)
          .flatMap((t) =>
            t.items
              .filter((item) => item.product.productType === 'supplement')
              .map((item) => ({
                id: item.product.id,
                title: item.product.productName,
                subtitle: t.name,
                description:
                  item.note ??
                  item.product.productDescription ??
                  t.description,
                imageUrl: resolveMediaUrl(item.product.imageUrl),
                url: item.product.productUrl,
                kind: 'supplement' as const,
              })),
          ),
      ]),
    [treatments, directSupplements],
  );

  const selectedRoutine =
    visibleRoutines.find((r) => r.id === selectedRoutineId) ??
    visibleRoutines[0] ??
    null;

  useEffect(() => {
    if (!visibleRoutines.length) {
      setSelectedRoutineId(null);
      return;
    }
    if (!visibleRoutines.some((r) => r.id === selectedRoutineId)) {
      setSelectedRoutineId(visibleRoutines[0].id);
    }
  }, [visibleRoutines, selectedRoutineId]);

  function seeAll(title: string, names: string[]) {
    Alert.alert(
      title,
      names.length > 0
        ? names.join('\n')
        : 'Aún no hay ítems en esta categoría.',
    );
  }

  function toggleSection(kind: RecoKind) {
    setSectionOpen((current) => ({ ...current, [kind]: !current[kind] }));
  }

  return (
    <View style={styles.recBlock}>
      <Pressable
        style={styles.recToggle}
        onPress={() => setOpen((v) => !v)}
        accessibilityRole="button"
      >
        <Text style={styles.recToggleText}>
          {open ? 'Ocultar recomendaciones' : 'Ver recomendaciones'}
        </Text>
        <View style={{ transform: [{ rotate: open ? '90deg' : '-90deg' }] }}>
          <AppIcon
            icon={Icons.back}
            size={22}
            color={branding.colors.textOnDark}
          />
        </View>
      </Pressable>

      {open ? (
        loading ? (
          <View style={styles.recLoading}>
            <ActivityIndicator color={primary} />
          </View>
        ) : (
          <View style={styles.recBody}>
            {skinAgeNote ? (
              <Text style={styles.catalogEmpty}>{skinAgeNote}</Text>
            ) : null}
            <RecoSection
              styles={styles}
              title="Productos sugeridos"
              icon={Icons.shopping}
              iconColor={primary}
              mutedColor={muted}
              open={sectionOpen.products}
              onToggle={() => toggleSection('products')}
              onSeeAll={() =>
                seeAll(
                  'Productos sugeridos',
                  productCards.map((c) => c.title),
                )
              }
            >
              <CardCarousel
                styles={styles}
                cards={productCards}
                emptyLabel={
                  metricType === 'skin_age'
                    ? 'No hay productos en la regla de edad de piel para esta diferencia.'
                    : 'No hay productos configurados para esta métrica.'
                }
                variant="product"
                onOpen={setDetail}
              />
            </RecoSection>

            <RecoSection
              styles={styles}
              title="Rutinas"
              icon={Icons.clipboardList}
              iconColor={primary}
              mutedColor={muted}
              open={sectionOpen.routines}
              onToggle={() => toggleSection('routines')}
              onSeeAll={() =>
                seeAll(
                  'Rutinas',
                  visibleRoutines.map((r) => r.name),
                )
              }
            >
              {visibleRoutines.length > 0 ? (
                <>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.recCarousel}
                  >
                    {visibleRoutines.map((routine, index) => {
                      const active = routine.id === selectedRoutine?.id;
                      const images = routineImages(routine);
                      const mediaItems = routineMediaItems(routine);
                      const am = routineHasMoment(routine, 'am');
                      const pm = routineHasMoment(routine, 'pm');
                      return (
                        <View key={routine.id} style={styles.recoCardWrap}>
                          <Pressable
                            style={[
                              styles.routineCard,
                              active && styles.routineCardOn,
                            ]}
                            onPress={() => {
                              setSelectedRoutineId(routine.id);
                              setDetail({
                                title: routine.name,
                                subtitle:
                                  [am ? 'Mañana' : null, pm ? 'Noche' : null]
                                    .filter(Boolean)
                                    .join(' / ') || undefined,
                                description: routine.description,
                                imageUrl: images[0] ?? null,
                                kind: 'routine',
                                mediaItems,
                                extras: [...routine.steps]
                                  .sort((a, b) => a.order - b.order)
                                  .map(
                                    (step, i) =>
                                      `${i + 1}. ${step.title}${step.description ? ` — ${step.description}` : ''}`,
                                  ),
                              });
                            }}
                          >
                            <View style={styles.routineCardMedia}>
                              {index === 0 ? (
                                <View style={styles.recBadge}>
                                  <Text style={styles.recBadgeText}>
                                    Recomendada
                                  </Text>
                                </View>
                              ) : null}
                              <StackedThumbs
                                styles={styles}
                                urls={images}
                                fallback={routine.name}
                                primary={primary}
                                onPressMedia={
                                  mediaItems[0]
                                    ? () => setMediaPreview(mediaItems[0])
                                    : undefined
                                }
                              />
                            </View>
                            <Text
                              style={styles.routineCardTitle}
                              numberOfLines={2}
                            >
                              {routine.name}
                            </Text>
                            {am || pm ? (
                              <View style={styles.routineCardMetaRow}>
                                <Text style={{ color: primary, fontSize: 12 }}>
                                  ★
                                </Text>
                                <Text
                                  style={styles.routineCardMeta}
                                  numberOfLines={1}
                                >
                                  {[am ? 'Mañana' : null, pm ? 'Noche' : null]
                                    .filter(Boolean)
                                    .join(' / ')}
                                </Text>
                              </View>
                            ) : null}
                          </Pressable>
                        </View>
                      );
                    })}
                  </ScrollView>
                  {selectedRoutine ? (
                    <RoutineDetail
                      styles={styles}
                      routine={selectedRoutine}
                      productCards={productCards}
                      primary={primary}
                      onDark={branding.colors.textOnDark}
                      onOpenMedia={setMediaPreview}
                      onOpenProduct={setDetail}
                    />
                  ) : null}
                </>
              ) : (
                <Text style={styles.catalogEmpty}>
                  {metricType === 'skin_age'
                    ? 'No hay rutinas en la regla de edad de piel para esta diferencia.'
                    : 'No hay rutinas configuradas para esta métrica.'}
                </Text>
              )}
            </RecoSection>

            <RecoSection
              styles={styles}
              title="Tratamientos"
              icon={Icons.needle}
              iconColor={primary}
              mutedColor={muted}
              open={sectionOpen.treatments}
              onToggle={() => toggleSection('treatments')}
              onSeeAll={() =>
                seeAll(
                  'Tratamientos',
                  treatmentCards.map((c) => c.title),
                )
              }
            >
              <CardCarousel
                styles={styles}
                cards={treatmentCards}
                emptyLabel={
                  metricType === 'skin_age'
                    ? 'No hay tratamientos en la regla de edad de piel para esta diferencia.'
                    : 'No hay tratamientos configurados para esta métrica.'
                }
                variant="treatment"
                onOpen={setDetail}
              />
            </RecoSection>

            <RecoSection
              styles={styles}
              title="Suplementos"
              icon={Icons.pill}
              iconColor={primary}
              mutedColor={muted}
              open={sectionOpen.supplements}
              onToggle={() => toggleSection('supplements')}
              onSeeAll={() =>
                seeAll(
                  'Suplementos',
                  supplementCards.map((c) => c.title),
                )
              }
            >
              <CardCarousel
                styles={styles}
                cards={supplementCards}
                emptyLabel={
                  metricType === 'skin_age'
                    ? 'No hay suplementos en la regla de edad de piel para esta diferencia.'
                    : 'No hay suplementos configurados para esta métrica.'
                }
                variant="supplement"
                onOpen={setDetail}
              />
            </RecoSection>
            <CatalogDetailModal
              detail={detail}
              onClose={() => setDetail(null)}
              primary={primary}
              onOpenMedia={setMediaPreview}
            />
            <RoutineMediaModal
              preview={mediaPreview}
              onClose={() => setMediaPreview(null)}
              onDark={branding.colors.textOnDark}
              primary={primary}
            />
          </View>
        )
      ) : null}
    </View>
  );
}

function RecoSection({
  styles,
  title,
  icon,
  iconColor,
  mutedColor,
  open,
  onToggle,
  onSeeAll,
  children,
}: {
  styles: ReturnType<typeof createYoucamResultsStyles>;
  title: string;
  icon: AppIconName;
  iconColor: string;
  mutedColor: string;
  open: boolean;
  onToggle: () => void;
  onSeeAll: () => void;
  children: ReactNode;
}) {
  return (
    <View style={styles.recSection}>
      <View style={styles.recSectionHead}>
        <Pressable
          style={styles.recSectionTitleRow}
          onPress={onToggle}
          accessibilityRole="button"
          accessibilityLabel={`${open ? 'Cerrar' : 'Abrir'} ${title}`}
        >
          <View
            style={[
              styles.recSectionIconCircle,
              { backgroundColor: `${iconColor}18` },
            ]}
          >
            <AppIcon icon={icon} size={16} color={iconColor} />
          </View>
          <Text style={styles.recSectionTitle}>{title}</Text>
          <View
            style={{
              transform: [{ rotate: open ? '90deg' : '-90deg' }],
            }}
          >
            <AppIcon icon={Icons.back} size={16} color={mutedColor} />
          </View>
        </Pressable>
        {open ? (
          <Pressable onPress={onSeeAll} hitSlop={8}>
            <Text style={styles.recSeeAll}>Ver todas</Text>
          </Pressable>
        ) : null}
      </View>
      <View style={[styles.recSectionRule, { backgroundColor: iconColor }]} />
      {open ? children : null}
    </View>
  );
}

function StackedThumbs({
  styles,
  urls,
  fallback,
  primary,
  onPressMedia,
}: {
  styles: ReturnType<typeof createYoucamResultsStyles>;
  urls: string[];
  fallback: string;
  primary: string;
  onPressMedia?: () => void;
}) {
  if (urls.length === 0) {
    return (
      <View style={styles.routineThumbEmpty}>
        <Text style={[styles.catalogCardPlaceholderText, { color: primary }]}>
          {fallback.slice(0, 1).toUpperCase()}
        </Text>
      </View>
    );
  }
  return (
    <Pressable
      style={styles.routineThumbs}
      onPress={(e) => {
        e?.stopPropagation?.();
        onPressMedia?.();
      }}
      disabled={!onPressMedia}
      accessibilityRole={onPressMedia ? 'button' : undefined}
      accessibilityLabel={onPressMedia ? 'Ampliar imagen de la rutina' : undefined}
    >
      {urls.slice(0, 3).map((uri, i) => (
        <Image
          key={`${uri}-${i}`}
          source={{ uri }}
          style={styles.routineThumb}
          contentFit="contain"
        />
      ))}
    </Pressable>
  );
}

function linkedProductsForRoutine(
  routine: RecommendedRoutine,
  productCards: CatalogCard[],
): CatalogCard[] {
  const byId = new Map(productCards.map((card) => [card.id, card]));
  const linked: CatalogCard[] = [];
  const seen = new Set<string>();
  for (const step of [...routine.steps].sort((a, b) => a.order - b.order)) {
    const productId = step.productId ?? step.product?.id ?? null;
    if (!productId || seen.has(productId)) continue;
    seen.add(productId);
    const fromCatalog = byId.get(productId);
    if (fromCatalog) {
      linked.push(fromCatalog);
      continue;
    }
    if (step.product) {
      linked.push({
        id: step.product.id,
        title: step.product.productName,
        subtitle: 'Producto vinculado',
        description: null,
        imageUrl: resolveMediaUrl(step.product.imageUrl),
        url: step.product.productUrl ?? null,
        kind:
          step.product.productType === 'supplement' ? 'supplement' : 'product',
      });
    }
  }
  return linked;
}

function RoutineDetail({
  styles,
  routine,
  productCards,
  primary,
  onDark,
  onOpenMedia,
  onOpenProduct,
}: {
  styles: ReturnType<typeof createYoucamResultsStyles>;
  routine: RecommendedRoutine;
  productCards: CatalogCard[];
  primary: string;
  onDark: string;
  onOpenMedia: (preview: MediaPreview) => void;
  onOpenProduct: (detail: CatalogDetail) => void;
}) {
  const am = routineHasMoment(routine, 'am');
  const pm = routineHasMoment(routine, 'pm');
  const mediaItems = routineMediaItems(routine);
  const linkedProducts = linkedProductsForRoutine(routine, productCards);
  const skinHint =
    routine.conditions.find((c) => c.metricType === 'hd_skin_type')
      ?.textValue ?? null;

  return (
    <View style={styles.routineDetail}>
      <View style={styles.routineDetailCopy}>
        <Text style={styles.routineDetailTitle}>{routine.name}</Text>
        {routine.description ? (
          <Text style={styles.routineDetailText}>{routine.description}</Text>
        ) : (
          <Text style={styles.routineDetailText}>
            Rutina recomendada según el resultado de este análisis.
          </Text>
        )}
        <View style={styles.routineMomentRow}>
          {am ? (
            <View style={styles.routineMoment}>
              <Text style={{ color: primary, fontSize: 13 }}>☀</Text>
              <Text style={styles.routineMomentText}>Mañana</Text>
            </View>
          ) : null}
          {pm ? (
            <View style={styles.routineMoment}>
              <Text style={{ color: primary, fontSize: 13 }}>☾</Text>
              <Text style={styles.routineMomentText}>Noche</Text>
            </View>
          ) : null}
        </View>
        {skinHint ? (
          <Text style={styles.routineSkinHint}>Ideal para: {skinHint}</Text>
        ) : null}
      </View>
      {mediaItems.length > 0 ? (
        <View style={styles.routineMediaCol}>
          <Text style={styles.routineMediaHeading}>
            ¿Cómo seguir esta rutina?
          </Text>
          <View style={styles.routineMediaRow}>
            {mediaItems.map((item) => (
              <Pressable
                key={`${item.kind}-${item.url}`}
                style={styles.routineMediaBtn}
                onPress={() => onOpenMedia(item)}
                accessibilityRole="button"
                accessibilityLabel={
                  item.kind === 'video'
                    ? 'Ver video de la rutina'
                    : 'Ampliar imagen de la rutina'
                }
              >
                <Image
                  source={{ uri: item.url }}
                  style={styles.routineMediaImg}
                  contentFit="cover"
                />
                {item.kind === 'video' ? (
                  <View style={styles.routinePlay}>
                    <AppIcon icon={Icons.video} size={18} color={onDark} />
                  </View>
                ) : null}
                <View style={styles.routineMediaScrim}>
                  <Text style={styles.routineMediaLabel}>
                    {item.kind === 'video' ? 'Ver video' : 'Ampliar imagen'}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}
      {linkedProducts.length > 0 ? (
        <View style={styles.routineMediaCol}>
          <Text style={styles.routineMediaHeading}>Productos vinculados</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.recCarousel}
          >
            {linkedProducts.map((card) => (
              <Pressable
                key={card.id}
                style={styles.recoCard}
                onPress={() =>
                  onOpenProduct({
                    title: card.title,
                    subtitle: card.subtitle,
                    description: card.description,
                    imageUrl: card.imageUrl,
                    url: card.url,
                    kind: card.kind,
                  })
                }
              >
                {card.imageUrl ? (
                  <Image
                    source={{ uri: card.imageUrl }}
                    style={styles.recoCardImage}
                    contentFit="cover"
                  />
                ) : (
                  <View style={styles.recoCardImagePlaceholder}>
                    <Text style={styles.catalogCardPlaceholderText}>
                      {card.title.slice(0, 1).toUpperCase()}
                    </Text>
                  </View>
                )}
                <Text style={styles.recoCardTitle} numberOfLines={2}>
                  {card.title}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}

function RoutineMediaModal({
  preview,
  onClose,
  onDark,
  primary,
}: {
  preview: MediaPreview | null;
  onClose: () => void;
  onDark: string;
  primary: string;
}) {
  const mediaHeight = Math.min(Dimensions.get('window').height * 0.62, 520);
  const videoHtml = preview
    ? `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1" />
<style>html,body{margin:0;height:100%;background:#0F172A;} video{width:100%;height:100%;object-fit:contain;background:#0F172A;}</style>
</head><body><video src="${preview.url.replace(/"/g, '&quot;')}" controls playsinline autoplay></video></body></html>`
    : '';

  return (
    <Modal
      visible={preview != null}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(15, 61, 115, 0.82)',
          justifyContent: 'center',
          padding: 16,
        }}
      >
        <View
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 22,
            overflow: 'hidden',
            maxHeight: '90%',
            borderWidth: 1,
            borderColor: 'rgba(30, 90, 158, 0.12)',
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 14,
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: 'rgba(30, 90, 158, 0.08)',
            }}
          >
            <Text
              style={{
                flex: 1,
                fontSize: 16,
                fontWeight: '800',
                color: primary,
              }}
              numberOfLines={1}
            >
              {preview?.kind === 'video' ? 'Video de la rutina' : 'Imagen guía'}
            </Text>
            <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Cerrar">
              <AppIcon icon={Icons.close} size={22} color="#64748B" />
            </Pressable>
          </View>
          {preview?.kind === 'image' ? (
            <Image
              source={{ uri: preview.url }}
              style={{
                width: '100%',
                height: mediaHeight,
                backgroundColor: '#0F172A',
              }}
              contentFit="contain"
            />
          ) : preview ? (
            <WebView
              originWhitelist={['*']}
              source={{ html: videoHtml }}
              style={{ height: mediaHeight, backgroundColor: '#0F172A' }}
              allowsInlineMediaPlayback
              mediaPlaybackRequiresUserAction={false}
            />
          ) : null}
          {preview?.title ? (
            <Text
              style={{
                paddingHorizontal: 14,
                paddingVertical: 12,
                fontSize: 13,
                color: '#64748B',
              }}
            >
              {preview.title}
            </Text>
          ) : null}
        </View>
        <Pressable
          onPress={onClose}
          style={{
            marginTop: 14,
            alignSelf: 'center',
            backgroundColor: primary,
            borderRadius: 14,
            paddingHorizontal: 22,
            paddingVertical: 11,
          }}
        >
          <Text style={{ color: onDark, fontWeight: '700' }}>Cerrar</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

function CatalogDetailModal({
  detail,
  onClose,
  primary,
  onOpenMedia,
}: {
  detail: CatalogDetail | null;
  onClose: () => void;
  primary: string;
  onOpenMedia: (preview: MediaPreview) => void;
}) {
  const kindLabel =
    detail?.kind === 'routine'
      ? 'Rutina'
      : detail?.kind === 'treatment'
        ? 'Tratamiento'
        : detail?.kind === 'supplement'
          ? 'Suplemento'
          : 'Producto';

  const enlargeTarget =
    detail?.mediaItems?.[0] ??
    (detail?.imageUrl
      ? {
          kind: 'image' as const,
          url: detail.imageUrl,
          title: detail.title,
        }
      : null);

  return (
    <Modal
      visible={detail != null}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(15, 61, 115, 0.72)',
          justifyContent: 'center',
          padding: 16,
        }}
      >
        <View
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 22,
            overflow: 'hidden',
            maxHeight: '86%',
            borderWidth: 1,
            borderColor: 'rgba(30, 90, 158, 0.12)',
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 14,
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: 'rgba(30, 90, 158, 0.08)',
            }}
          >
            <Text
              style={{ flex: 1, fontSize: 16, fontWeight: '800', color: primary }}
              numberOfLines={1}
            >
              {kindLabel}
            </Text>
            <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Cerrar">
              <AppIcon icon={Icons.close} size={22} color="#64748B" />
            </Pressable>
          </View>
          <ScrollView>
            {detail?.imageUrl ? (
              <Pressable
                onPress={() => {
                  if (enlargeTarget) onOpenMedia(enlargeTarget);
                }}
                disabled={!enlargeTarget}
                accessibilityRole="button"
                accessibilityLabel="Ampliar imagen"
              >
                <Image
                  source={{ uri: detail.imageUrl }}
                  style={{
                    width: '100%',
                    height: 280,
                    backgroundColor: '#F8FAFC',
                  }}
                  contentFit="contain"
                />
                <View
                  style={{
                    position: 'absolute',
                    right: 12,
                    bottom: 12,
                    backgroundColor: 'rgba(15, 61, 115, 0.88)',
                    borderRadius: 999,
                    paddingHorizontal: 12,
                    paddingVertical: 7,
                  }}
                >
                  <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 12 }}>
                    Ampliar
                  </Text>
                </View>
              </Pressable>
            ) : (
              <View
                style={{
                  height: 180,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#F8FAFC',
                }}
              >
                <Text style={{ fontSize: 42, fontWeight: '800', color: primary }}>
                  {detail?.title.slice(0, 1).toUpperCase()}
                </Text>
              </View>
            )}
            {detail?.mediaItems && detail.mediaItems.length > 1 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{
                  paddingHorizontal: 14,
                  paddingTop: 12,
                  gap: 10,
                }}
              >
                {detail.mediaItems.map((item) => (
                  <Pressable
                    key={`${item.kind}-${item.url}`}
                    onPress={() => onOpenMedia(item)}
                    style={{
                      width: 88,
                      height: 88,
                      borderRadius: 12,
                      overflow: 'hidden',
                      backgroundColor: '#0F172A',
                    }}
                  >
                    <Image
                      source={{ uri: item.url }}
                      style={{ width: '100%', height: '100%' }}
                      contentFit="cover"
                    />
                    {item.kind === 'video' ? (
                      <View
                        style={{
                          position: 'absolute',
                          top: 0,
                          right: 0,
                          bottom: 0,
                          left: 0,
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: 'rgba(15,23,42,0.35)',
                        }}
                      >
                        <AppIcon icon={Icons.video} size={18} color="#FFFFFF" />
                      </View>
                    ) : null}
                  </Pressable>
                ))}
              </ScrollView>
            ) : null}
            <View style={{ padding: 14, gap: 8 }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: '#0F172A' }}>
                {detail?.title}
              </Text>
              {detail?.subtitle ? (
                <Text style={{ fontSize: 13, fontWeight: '700', color: primary }}>
                  {detail.subtitle}
                </Text>
              ) : null}
              {detail?.description ? (
                <Text style={{ fontSize: 14, lineHeight: 20, color: '#475569' }}>
                  {detail.description}
                </Text>
              ) : null}
              {detail?.extras?.map((line) => (
                <Text key={line} style={{ fontSize: 13, color: '#334155' }}>
                  {line}
                </Text>
              ))}
              {detail?.url ? (
                <Pressable
                  onPress={() => openUrl(detail.url)}
                  style={{
                    marginTop: 8,
                    alignSelf: 'flex-start',
                    backgroundColor: primary,
                    borderRadius: 14,
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                  }}
                >
                  <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>
                    Ver más
                  </Text>
                </Pressable>
              ) : null}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function CardCarousel({
  styles,
  cards,
  emptyLabel,
  variant,
  onOpen,
}: {
  styles: ReturnType<typeof createYoucamResultsStyles>;
  cards: CatalogCard[];
  emptyLabel: string;
  variant: 'product' | 'treatment' | 'supplement';
  onOpen: (detail: CatalogDetail) => void;
}) {
  if (cards.length === 0) {
    return <Text style={styles.catalogEmpty}>{emptyLabel}</Text>;
  }
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.recCarousel}
    >
      {cards.map((card) => (
        <View key={card.id} style={styles.recoCardWrap}>
          <Pressable
            style={[
              styles.recoCard,
              variant === 'supplement' && styles.recoCardTint,
            ]}
            onPress={() =>
              onOpen({
                title: card.title,
                subtitle: card.subtitle,
                description: card.description,
                imageUrl: card.imageUrl,
                url: card.url,
                kind: card.kind,
              })
            }
          >
            {card.imageUrl ? (
              <Image
                source={{ uri: card.imageUrl }}
                style={styles.recoCardImage}
                contentFit="cover"
              />
            ) : (
              <View style={styles.recoCardImagePlaceholder}>
                <Text style={styles.catalogCardPlaceholderText}>
                  {card.title.slice(0, 1).toUpperCase()}
                </Text>
              </View>
            )}
            <Text style={styles.recoCardTitle} numberOfLines={2}>
              {card.title}
            </Text>
            {card.subtitle ? (
              <Text
                style={[
                  styles.recoCardSub,
                  variant === 'treatment' && styles.recoCardTag,
                ]}
                numberOfLines={1}
              >
                {card.subtitle}
              </Text>
            ) : null}
          </Pressable>
        </View>
      ))}
    </ScrollView>
  );
}
