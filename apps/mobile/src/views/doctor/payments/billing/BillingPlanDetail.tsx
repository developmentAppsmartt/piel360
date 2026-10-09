import type { ReactNode } from 'react';
import { Alert, Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { AppIcon } from '../../../../components/AppIcon';
import { Icons, type AppIconName } from '../../../../components/icons';
import type { Subscription } from '../../../../types/subscription';
import type { BillingStyles } from '../styles/billing.styles';
import { useBranding } from '../../../../context/BrandingContext';
import { DEFAULT_BRANDING } from '../../../../config/branding.defaults';
import { CreditsBar, PlanAvatar, StatusPill } from './BillingPlanCard';
import {
  amountPaid,
  billingCategory,
  CATEGORY_THEME,
  creditsOf,
  formatCop,
  formatDate,
  formatUpdated,
  planIncludes,
  planSubtitle,
  PLANS_WEB_URL,
  purchaseDate,
  SUPPORT_EMAIL,
} from './billingModel';

type BillingPlanDetailProps = {
  styles: BillingStyles;
  sub: Subscription;
  primaryColor: string;
  onOpenHistory: () => void;
};

function InfoRow({
  styles,
  icon,
  label,
  primaryColor,
  last,
  children,
}: {
  styles: BillingStyles;
  icon: AppIconName;
  label: string;
  primaryColor: string;
  last?: boolean;
  children: ReactNode;
}) {
  return (
    <View style={[styles.infoRow, last && styles.infoRowLast]}>
      <View style={styles.infoIcon}>
        <AppIcon icon={icon} size={17} color={primaryColor} />
      </View>
      <View style={styles.infoBody}>
        <Text style={styles.metaLabel}>{label}</Text>
        {children}
      </View>
    </View>
  );
}

function openInvoice(sub: Subscription) {
  const reference = sub.wompiTransactionId?.trim() || `SUB-${sub.id}`;
  const iva = Number(sub.invoice?.ivaAmount ?? 0);
  const lines = [
    `Plan: ${sub.plan.name}`,
    `Fecha de compra: ${formatDate(purchaseDate(sub))}`,
    `Valor: ${formatCop(amountPaid(sub))}`,
    iva > 0 ? `IVA incluido: ${formatCop(iva)}` : null,
    `Referencia: ${reference}`,
  ].filter(Boolean);
  Alert.alert('Comprobante de compra', lines.join('\n'), [
    { text: 'Cerrar', style: 'cancel' },
    {
      text: 'Solicitar factura',
      onPress: () => {
        const subject = encodeURIComponent(`Factura ${sub.plan.name} (${reference})`);
        const body = encodeURIComponent(
          `Hola, solicito la factura de mi compra.\n\n${lines.join('\n')}`,
        );
        void Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`);
      },
    },
  ]);
}

export function BillingPlanDetail({
  styles,
  sub,
  primaryColor,
  onOpenHistory,
}: BillingPlanDetailProps) {
  const branding = useBranding();
  const category = billingCategory(sub);
  const theme = CATEGORY_THEME[category];
  const { left, total } = creditsOf(sub);
  const limits = sub.plan.analysisLimits ?? {};
  const breakdown = [
    (limits.aesthetic ?? 0) > 0 ? `${limits.aesthetic} estéticos` : null,
    (limits.skiniver ?? 0) > 0 ? `${limits.skiniver} dermatológicos` : null,
  ].filter(Boolean);
  const iva = Number(sub.invoice?.ivaAmount ?? 0);

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.panel}>
        <View style={styles.heroTop}>
          <PlanAvatar styles={styles} sub={sub} size={64} iconColor={DEFAULT_BRANDING.colors.primary} />
          <View style={{ flex: 1, gap: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <Text style={styles.heroName}>{sub.plan.name}</Text>
              <StatusPill styles={styles} sub={sub} />
            </View>
            <Text style={styles.planSubtitle}>{planSubtitle(sub)}</Text>
          </View>
        </View>

        <View style={[styles.creditsBox, { backgroundColor: theme.bg }]}>
          <Text style={[styles.creditsLabel, { color: theme.fg }]}>
            Créditos disponibles
          </Text>
          <Text style={styles.creditsBig}>
            {left} / {total}
          </Text>
          <CreditsBar styles={styles} sub={sub} showNumbers={false} />
        </View>

        <View style={styles.heroMeta}>
          <View style={styles.heroMetaCol}>
            <AppIcon icon={Icons.calendarDay} size={18} color={primaryColor} />
            <View>
              <Text style={styles.metaLabel}>Vigencia</Text>
              <Text style={styles.metaValue}>{formatDate(sub.endsAt)}</Text>
            </View>
          </View>
          <View style={styles.heroMetaDivider} />
          <View style={styles.heroMetaCol}>
            <AppIcon icon={Icons.clock} size={18} color={primaryColor} />
            <View style={{ flexShrink: 1 }}>
              <Text style={styles.metaLabel}>Última actualización</Text>
              <Text style={styles.metaValue}>
                {formatUpdated(sub.updatedAt ?? sub.createdAt)}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.panel}>
        <View style={styles.panelHeader}>
          <AppIcon icon={Icons.clipboardList} size={20} color={primaryColor} />
          <Text style={styles.panelTitle}>Información del plan</Text>
        </View>
        <View style={styles.panelBody}>
          <InfoRow styles={styles} icon={Icons.skin} label="Incluye" primaryColor={primaryColor}>
            <Text style={styles.metaValue}>{planIncludes(sub)}</Text>
          </InfoRow>
          <InfoRow styles={styles} icon={Icons.file} label="Número de análisis" primaryColor={primaryColor}>
            <Text style={styles.metaValue}>{total}</Text>
            {breakdown.length > 1 ? (
              <Text style={styles.metaLabel}>{breakdown.join(' · ')}</Text>
            ) : null}
          </InfoRow>
          <InfoRow styles={styles} icon={Icons.calendarDay} label="Vigencia" primaryColor={primaryColor}>
            <Text style={styles.metaValue}>
              {formatDate(sub.endsAt)}
              {sub.plan.durationDays ? `  ·  ${sub.plan.durationDays} días` : ''}
            </Text>
          </InfoRow>
          <InfoRow styles={styles} icon={Icons.clipboardCheck} label="Estado" primaryColor={primaryColor} last>
            <View style={{ alignSelf: 'flex-start' }}>
              <StatusPill styles={styles} sub={sub} />
            </View>
          </InfoRow>
        </View>
      </View>

      <View style={styles.panel}>
        <View style={styles.panelHeader}>
          <AppIcon icon={Icons.document} size={20} color={primaryColor} />
          <Text style={styles.panelTitle}>Detalle de facturación</Text>
        </View>
        <View style={styles.panelBody}>
          <View style={styles.billRow}>
            <AppIcon icon={Icons.creditCard} size={16} color={branding.colors.icon} />
            <Text style={styles.billLabel}>Valor del plan</Text>
            <Text style={styles.billValue}>{formatCop(amountPaid(sub))}</Text>
          </View>
          {iva > 0 ? (
            <View style={styles.billRow}>
              <AppIcon icon={Icons.file} size={16} color={branding.colors.icon} />
              <Text style={styles.billLabel}>IVA incluido</Text>
              <Text style={styles.billValue}>{formatCop(iva)}</Text>
            </View>
          ) : null}
          <View style={styles.billRow}>
            <AppIcon icon={Icons.calendarDay} size={16} color={branding.colors.icon} />
            <Text style={styles.billLabel}>Fecha de compra</Text>
            <Text style={styles.billValue}>{formatDate(purchaseDate(sub))}</Text>
          </View>
          <View style={[styles.billRow, { borderBottomWidth: 0 }]}>
            <AppIcon icon={Icons.file} size={16} color={branding.colors.icon} />
            <Text style={styles.billLabel}>Factura</Text>
            <Pressable style={styles.invoiceBtn} onPress={() => openInvoice(sub)}>
              <Text style={styles.invoiceBtnText}>Ver factura</Text>
              <AppIcon icon={Icons.download} size={16} color={primaryColor} />
            </Pressable>
          </View>
        </View>
      </View>

      <View style={styles.panel}>
        <View style={styles.panelHeader}>
          <AppIcon icon={Icons.settings} size={20} color={primaryColor} />
          <Text style={styles.panelTitle}>Acciones</Text>
        </View>
        <View style={[styles.panelBody, { paddingVertical: 8 }]}>
          <Pressable style={styles.actionRow} onPress={onOpenHistory}>
            <AppIcon icon={Icons.creditCard} size={18} color={primaryColor} />
            <Text style={styles.actionText}>Ver historial de facturación</Text>
            <AppIcon icon={Icons.chevronRight} size={20} color={branding.colors.icon} />
          </Pressable>
          <Pressable
            style={styles.actionRow}
            onPress={() => void Linking.openURL(PLANS_WEB_URL)}
          >
            <AppIcon icon={Icons.clipboardList} size={18} color={primaryColor} />
            <Text style={styles.actionText}>Gestionar plan</Text>
            <AppIcon icon={Icons.chevronRight} size={20} color={branding.colors.icon} />
          </Pressable>
        </View>
      </View>

      <View style={styles.moreCredits}>
        <View style={styles.moreCreditsTop}>
          <AppIcon icon={Icons.information} size={22} color={primaryColor} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.moreCreditsTitle}>¿Necesitas más créditos?</Text>
            <Text style={styles.subtitle}>
              Puedes adquirir un nuevo plan o recargar créditos según tu
              necesidad.
            </Text>
          </View>
        </View>
        <Pressable
          style={({ pressed }) => [styles.primaryBtn, pressed && { backgroundColor: branding.colors.buttonHover }]}
          onPress={() => void Linking.openURL(PLANS_WEB_URL)}
        >
          <AppIcon icon={Icons.shopping} size={18} color={branding.colors.buttonText} />
          <Text style={styles.primaryBtnText}>Comprar créditos</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
