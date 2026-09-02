import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { AppIcon } from '../../../../components/AppIcon';
import { Icons, type AppIconName } from '../../../../components/icons';
import { useBranding } from '../../../../context/BrandingContext';
import {
  analysisCareService,
  type AnalysisCareRecommendations,
  type CareRecoItem,
} from '../../../../services/analysis-care.service';
import type { RecommendedRoutine } from '../../../../services/routines.service';
import { resolveMediaUrl } from '../../../../utils/mediaUrl';
import { createYoucamResultsStyles } from '../styles/youcamResults.styles';

type YoucamCatalogSectionProps = {
  styles: ReturnType<typeof createYoucamResultsStyles>;
  analysisId: string;
  metricType: string | null;
};

type CatalogCard = {
  id: string;
  title: string;
  subtitle?: string;
  imageUrl: string | null;
  url?: string | null;
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

function firstMedia(
  routine: RecommendedRoutine,
  type: 'video' | 'image',
): { url: string; title: string } | null {
  const step = [...routine.steps]
    .sort((a, b) => a.order - b.order)
    .find((s) => {
      const url = resolveMediaUrl(s.mediaUrl);
      if (!url) return false;
      if (type === 'video') return s.mediaType === 'video';
      return s.mediaType === 'image' || s.mediaType === 'gif' || !s.mediaType;
    });
  const url = step ? resolveMediaUrl(step.mediaUrl) : null;
  if (!step || !url) return null;
  return { url, title: step.title };
}

function routineImages(routine: RecommendedRoutine): string[] {
  return [...routine.steps]
    .sort((a, b) => a.order - b.order)
    .map((s) => resolveMediaUrl(s.mediaUrl))
    .filter((u): u is string => Boolean(u))
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

function firstNonEmpty<T>(...lists: T[][]): T[] {
  for (const list of lists) {
    if (list.length > 0) return list;
  }
  return [];
}

function careItemToCard(item: CareRecoItem): CatalogCard {
  return {
    id: item.id,
    title: item.name,
    subtitle:
      item.description ??
      item.categoryName ??
      (item.stepsCount != null
        ? `${item.stepsCount} paso${item.stepsCount === 1 ? '' : 's'}`
        : item.items?.map((i) => i.productName).join(' · ')) ??
      undefined,
    imageUrl: resolveMediaUrl(
      item.imageUrl ?? item.items?.[0]?.imageUrl ?? null,
    ),
    url: item.productUrl ?? item.items?.[0]?.productUrl,
  };
}

function careRoutineToRecommended(item: CareRecoItem): RecommendedRoutine {
  return {
    id: item.id,
    doctorId: '',
    name: item.name,
    description: item.description,
    isActive: true,
    conditions: [],
    steps: (item.steps ?? []).map((step) => ({
      id: step.id,
      routineId: item.id,
      order: step.order,
      title: step.title,
      description: step.description,
      mediaUrl: step.mediaUrl,
      mediaType: (step.mediaType as 'image' | 'video' | 'gif' | null) ?? null,
      productId: null,
    })),
  };
}

function openUrl(url?: string | null) {
  if (url) void Linking.openURL(url);
}

type RecoKind = 'routines' | 'products' | 'treatments' | 'supplements';

export function YoucamCatalogSection({
  styles,
  analysisId,
}: YoucamCatalogSectionProps) {
  const branding = useBranding();
  const primary = branding.colors.primary;
  const muted = branding.colors.muted;
  const [open, setOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [care, setCare] = useState<AnalysisCareRecommendations | null>(null);
  const [selectedRoutineId, setSelectedRoutineId] = useState<string | null>(
    null,
  );
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
      try {
        const data = await analysisCareService.getCareRecommendations(analysisId);
        if (cancelled) return;
        setCare(data);
      } catch {
        if (!cancelled) setCare(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [analysisId]);

  const visibleRoutines = useMemo(() => {
    const preferred = firstNonEmpty(
      care?.recommendations.routines ?? [],
      care?.catalog.routines ?? [],
    );
    return preferred.map(careRoutineToRecommended);
  }, [care]);

  const productCards = useMemo(
    () =>
      uniqueCards(
        firstNonEmpty(
          care?.recommendations.products ?? [],
          care?.catalog.products ?? [],
        ).map(careItemToCard),
      ),
    [care],
  );

  const treatmentCards = useMemo(
    () =>
      uniqueCards(
        firstNonEmpty(
          care?.recommendations.treatments ?? [],
          care?.catalog.treatments ?? [],
        ).map(careItemToCard),
      ),
    [care],
  );

  const supplementCards = useMemo(
    () =>
      uniqueCards(
        firstNonEmpty(
          care?.recommendations.supplements ?? [],
          care?.catalog.supplements ?? [],
        ).map(careItemToCard),
      ),
    [care],
  );

  const fallbackRoutineCards = useMemo(
    () => uniqueCards((care?.catalog.routines ?? []).map(careItemToCard)),
    [care],
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
        <Text style={styles.recToggleText}>Recomendaciones</Text>
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
            <RecoSection
              styles={styles}
              title="Rutinas"
              icon={Icons.calendarDay}
              iconColor={primary}
              mutedColor={muted}
              open={sectionOpen.routines}
              onToggle={() => toggleSection('routines')}
              onSeeAll={() =>
                seeAll(
                  'Rutinas',
                  visibleRoutines.length
                    ? visibleRoutines.map((r) => r.name)
                    : fallbackRoutineCards.map((c) => c.title),
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
                      const am = routineHasMoment(routine, 'am');
                      const pm = routineHasMoment(routine, 'pm');
                      return (
                        <View key={routine.id} style={styles.recoCardWrap}>
                          <Pressable
                            style={[
                              styles.routineCard,
                              active && styles.routineCardOn,
                            ]}
                            onPress={() => setSelectedRoutineId(routine.id)}
                          >
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
                            />
                            <Text
                              style={styles.routineCardTitle}
                              numberOfLines={2}
                            >
                              {routine.name}
                            </Text>
                            {am || pm ? (
                              <Text
                                style={styles.routineCardMeta}
                                numberOfLines={1}
                              >
                                {[am ? 'Mañana' : null, pm ? 'Noche' : null]
                                  .filter(Boolean)
                                  .join(' / ')}
                              </Text>
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
                      primary={primary}
                      onDark={branding.colors.textOnDark}
                    />
                  ) : null}
                </>
              ) : (
                <CardCarousel
                  styles={styles}
                  cards={fallbackRoutineCards}
                  emptyLabel="No hay rutinas configuradas todavía."
                  variant="product"
                />
              )}
            </RecoSection>

            <RecoSection
              styles={styles}
              title="Productos"
              icon={Icons.shopping}
              iconColor={primary}
              mutedColor={muted}
              open={sectionOpen.products}
              onToggle={() => toggleSection('products')}
              onSeeAll={() =>
                seeAll(
                  'Productos',
                  productCards.map((c) => c.title),
                )
              }
            >
              <CardCarousel
                styles={styles}
                cards={productCards}
                emptyLabel="No hay productos configurados todavía."
                variant="product"
              />
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
                emptyLabel="No hay tratamientos configurados todavía."
                variant="treatment"
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
                emptyLabel="No hay suplementos configurados todavía."
                variant="supplement"
              />
            </RecoSection>
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
          <AppIcon icon={icon} size={18} color={iconColor} />
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
      {open ? children : null}
    </View>
  );
}

function StackedThumbs({
  styles,
  urls,
  fallback,
  primary,
}: {
  styles: ReturnType<typeof createYoucamResultsStyles>;
  urls: string[];
  fallback: string;
  primary: string;
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
    <View style={styles.routineThumbs}>
      {urls.slice(0, 3).map((uri, i) => (
        <Image
          key={`${uri}-${i}`}
          source={{ uri }}
          style={[
            styles.routineThumb,
            { marginLeft: i === 0 ? 0 : -12, zIndex: 3 - i },
          ]}
          contentFit="cover"
        />
      ))}
    </View>
  );
}

function RoutineDetail({
  styles,
  routine,
  primary,
  onDark,
}: {
  styles: ReturnType<typeof createYoucamResultsStyles>;
  routine: RecommendedRoutine;
  primary: string;
  onDark: string;
}) {
  const am = routineHasMoment(routine, 'am');
  const pm = routineHasMoment(routine, 'pm');
  const video = firstMedia(routine, 'video');
  const image = firstMedia(routine, 'image');
  const skinHint =
    routine.conditions.find((c) => c.metricType === 'hd_skin_type')
      ?.textValue ?? null;

  return (
    <View style={styles.routineDetail}>
      <View style={styles.routineDetailCopy}>
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
              <AppIcon icon={Icons.weatherSunny} size={14} color={primary} />
              <Text style={styles.routineMomentText}>Mañana</Text>
            </View>
          ) : null}
          {pm ? (
            <View style={styles.routineMoment}>
              <AppIcon icon={Icons.weatherNight} size={14} color={primary} />
              <Text style={styles.routineMomentText}>Noche</Text>
            </View>
          ) : null}
        </View>
        {skinHint ? (
          <Text style={styles.routineSkinHint}>
            Pensada para piel {skinHint}.
          </Text>
        ) : null}
      </View>
      <View style={styles.routineMediaCol}>
        {video ? (
          <Pressable
            style={styles.routineMediaBtn}
            onPress={() => openUrl(video.url)}
          >
            <Image
              source={{ uri: video.url }}
              style={styles.routineMediaImg}
              contentFit="cover"
            />
            <View style={styles.routineMediaScrim}>
              <AppIcon icon={Icons.video} size={16} color={onDark} />
              <Text style={styles.routineMediaLabel}>Ver video</Text>
            </View>
          </Pressable>
        ) : null}
        {image ? (
          <Pressable
            style={styles.routineMediaBtn}
            onPress={() => openUrl(image.url)}
          >
            <Image
              source={{ uri: image.url }}
              style={styles.routineMediaImg}
              contentFit="cover"
            />
            <View style={styles.routineMediaScrim}>
              <AppIcon icon={Icons.image} size={16} color={onDark} />
              <Text style={styles.routineMediaLabel}>Ver imagen guía</Text>
            </View>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function CardCarousel({
  styles,
  cards,
  emptyLabel,
  variant,
}: {
  styles: ReturnType<typeof createYoucamResultsStyles>;
  cards: CatalogCard[];
  emptyLabel: string;
  variant: 'product' | 'treatment' | 'supplement';
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
            onPress={() => openUrl(card.url)}
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
              <Text style={styles.recoCardSub} numberOfLines={1}>
                {card.subtitle}
              </Text>
            ) : null}
          </Pressable>
        </View>
      ))}
    </ScrollView>
  );
}
