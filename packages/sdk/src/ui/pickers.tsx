import {useMemo, type ComponentType} from 'react';
import {StyleSheet, Text, View, type StyleProp, type ViewStyle} from 'react-native';
import {SvgXml} from 'react-native-svg';
import {
  accountTypes,
  billerCategories,
  currencies,
  getProvider,
  providerKindLabels,
  useBillers,
  useFinancialProviders,
  useTransactionCategories,
  type AccountType,
  type CatalogIcon,
  type CatalogTone,
  type ProviderKind,
  type TransactionCategoryGroup,
} from '../catalogs';
import {useCatalogStore} from '../stores/catalog';
import {logos} from '../logos';
import {radius, useTheme, useToneColors, type Tone} from '../theme';
import type {IconProps} from '../manifest';
import {
  IconBank,
  IconCard,
  IconCash,
  IconChart,
  IconEducation,
  IconFood,
  IconGlobe,
  IconGovernment,
  IconHealth,
  IconHome,
  IconOther,
  IconSend,
  IconTransport,
  IconUtilities,
  IconWallet,
} from '../icons';
import {Select, type SelectOption} from './select';

/** Every catalog glyph name, drawn with the icon set and a fixed tone. */
const CATALOG_ICONS: Record<CatalogIcon, {icon: ComponentType<IconProps>; tone: Tone}> = {
  bank: {icon: IconBank, tone: 'blue'},
  wallet: {icon: IconWallet, tone: 'emerald'},
  card: {icon: IconCard, tone: 'violet'},
  cash: {icon: IconCash, tone: 'emerald'},
  globe: {icon: IconGlobe, tone: 'sky'},
  send: {icon: IconSend, tone: 'sky'},
  chart: {icon: IconChart, tone: 'emerald'},
  food: {icon: IconFood, tone: 'amber'},
  transport: {icon: IconTransport, tone: 'sky'},
  home: {icon: IconHome, tone: 'violet'},
  utilities: {icon: IconUtilities, tone: 'amber'},
  health: {icon: IconHealth, tone: 'rose'},
  education: {icon: IconEducation, tone: 'violet'},
  government: {icon: IconGovernment, tone: 'slate'},
  other: {icon: IconOther, tone: 'slate'},
};

/** The tinted square that stands for a category wherever a row needs one. */
export function CategoryMark({
  icon,
  size = 36,
  style,
}: {
  icon: CatalogIcon;
  size?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const {icon: Glyph, tone} = CATALOG_ICONS[icon] ?? CATALOG_ICONS.other;
  const colors = useToneColors(tone);
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.mark, {width: size, height: size, backgroundColor: colors.bg}, style]}>
      <Glyph size={size * 0.5} color={colors.fg} />
    </View>
  );
}

const providerOrder: readonly ProviderKind[] = [
  'cash',
  'ewallet',
  'digital_bank',
  'bank',
  'international',
  'remittance',
  'investment',
  'crypto',
  'cooperative',
  'other',
];

/** Catalog tones are a subset of the theme's tones. */
function toTone(tone: CatalogTone | undefined): Tone {
  return (tone ?? 'slate') as Tone;
}

/**
 * An institution's or biller's mark: its bundled logo when one is reviewed
 * in, otherwise a two-character monogram in the catalog tone. Something is
 * always drawn, so a row never renders a hole.
 */
export function ProviderMark({
  providerId,
  mark,
  tone = 'slate',
  size = 36,
  style,
}: {
  providerId?: string;
  mark?: string;
  tone?: CatalogTone;
  size?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const t = useTheme();
  const provider = providerId ? getProvider(providerId) : undefined;
  const resolvedMark = provider?.mark ?? mark ?? '?';
  const colors = useToneColors(toTone(provider?.tone ?? tone));
  const logo = providerId ? logos[providerId] : undefined;

  if (logo) {
    // Logos carry their own colours, so they sit on the card surface, not a tint.
    return (
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={[
          styles.mark,
          styles.logo,
          {width: size, height: size, backgroundColor: t.card, borderColor: t.line},
          style,
        ]}>
        <SvgXml xml={logo} width={size * 0.72} height={size * 0.72} />
      </View>
    );
  }

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.mark,
        {width: size, height: size, backgroundColor: colors.bg},
        style,
      ]}>
      <Text style={[styles.markText, {color: colors.fg, fontSize: size * 0.3}]}>
        {resolvedMark}
      </Text>
    </View>
  );
}

// -- Catalog-backed selects -------------------------------------------

export function ProviderPicker({
  value,
  onChange,
  kinds,
  label = 'Financial institution',
  style,
}: {
  value: string;
  onChange: (value: string) => void;
  kinds?: readonly ProviderKind[];
  label?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const visibleKinds = kinds ?? providerOrder;
  const providers = useFinancialProviders();
  const addEntry = useCatalogStore(state => state.addEntry);
  const options = useMemo<SelectOption[]>(
    () =>
      // The user's own institutions always show, whatever kinds the caller
      // asked for; the legacy free-text 'custom' row is replaced by Add new.
      [...new Set<ProviderKind>([...visibleKinds, 'other'])].flatMap(kind =>
        providers
          .filter(provider => provider.kind === kind && provider.id !== 'custom')
          .map(provider => ({
            value: provider.id,
            label: provider.name,
            group: kind === 'other' ? 'Added by you' : providerKindLabels[kind],
            hint: provider.shortName === provider.name ? undefined : provider.shortName,
            icon: <ProviderMark providerId={provider.id} size={28} />,
          })),
      ),
    [providers, visibleKinds],
  );

  return (
    <Select
      label={label}
      value={value}
      onChange={onChange}
      options={options}
      placeholder="Select institution"
      onCreate={name => addEntry({kind: 'institution', label: name})}
      createLabel="Add"
      style={style}
    />
  );
}

export function AccountTypePicker({
  value,
  onChange,
  style,
}: {
  value: AccountType;
  onChange: (value: AccountType) => void;
  style?: StyleProp<ViewStyle>;
}) {
  const options = useMemo<SelectOption[]>(
    () =>
      accountTypes.map(type => ({
        value: type.id,
        label: type.label,
        hint: type.nature === 'liability' ? 'Liability' : undefined,
      })),
    [],
  );
  return (
    <Select
      label="Account type"
      value={value}
      onChange={next => onChange(next as AccountType)}
      options={options}
      style={style}
    />
  );
}

export function CurrencyPicker({
  value,
  onChange,
  style,
}: {
  value: string;
  onChange: (value: string) => void;
  style?: StyleProp<ViewStyle>;
}) {
  const options = useMemo<SelectOption[]>(
    () =>
      currencies.map(currency => ({
        value: currency.code,
        label: `${currency.code} — ${currency.name}`,
        hint: currency.symbol,
      })),
    [],
  );
  return (
    <Select label="Currency" value={value} onChange={onChange} options={options} style={style} />
  );
}

export function CategorySelect({
  group,
  value,
  onChange,
  style,
}: {
  group: TransactionCategoryGroup;
  value: string;
  onChange: (value: string) => void;
  style?: StyleProp<ViewStyle>;
}) {
  const categories = useTransactionCategories(group);
  const addEntry = useCatalogStore(state => state.addEntry);
  const options = useMemo<SelectOption[]>(
    () =>
      categories.map(category => ({
        value: category.id,
        label: category.label,
        icon: <CategoryMark icon={category.icon} size={28} />,
      })),
    [categories],
  );
  const createGroup = group === 'income' ? 'income' : 'expense';
  return (
    <Select
      label="Category"
      value={value}
      onChange={onChange}
      options={options}
      onCreate={name => addEntry({kind: 'category', label: name, group: createGroup})}
      createLabel="Add"
      style={style}
    />
  );
}

export function BillerCategoryPicker({
  value,
  onChange,
  style,
}: {
  value: string;
  onChange: (value: string) => void;
  style?: StyleProp<ViewStyle>;
}) {
  const options = useMemo<SelectOption[]>(
    () => billerCategories.map(category => ({value: category.id, label: category.label})),
    [],
  );
  return (
    <Select
      label="Bill category"
      value={value}
      onChange={onChange}
      options={options}
      style={style}
    />
  );
}

export function BillerPicker({
  categoryId,
  value,
  onChange,
  style,
}: {
  categoryId?: string;
  value: string;
  onChange: (value: string) => void;
  style?: StyleProp<ViewStyle>;
}) {
  const billers = useBillers();
  const addEntry = useCatalogStore(state => state.addEntry);
  const options = useMemo<SelectOption[]>(
    () =>
      billers
        .filter(biller => biller.id !== 'custom' && (!categoryId || biller.categoryId === categoryId))
        .map(biller => ({
          value: biller.id,
          label: biller.name,
          icon: <ProviderMark providerId={biller.id} mark={biller.mark} tone={biller.tone} size={28} />,
        })),
    [billers, categoryId],
  );
  return (
    <Select
      label="Biller"
      value={value}
      onChange={onChange}
      options={options}
      onCreate={name => addEntry({kind: 'biller', label: name, categoryId})}
      createLabel="Add"
      style={style}
    />
  );
}

export function AccountPicker({
  accounts,
  value,
  onChange,
  label = 'Account',
  emptyLabel = 'Choose account',
  style,
}: {
  accounts: readonly {id: string; name: string; currency: string}[];
  value: string;
  onChange: (value: string) => void;
  label?: string;
  emptyLabel?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const options = useMemo<SelectOption[]>(
    () => [
      {value: '', label: emptyLabel},
      ...accounts.map(account => ({
        value: account.id,
        label: account.name,
        hint: account.currency,
      })),
    ],
    [accounts, emptyLabel],
  );
  return (
    <Select
      label={label}
      value={value}
      onChange={onChange}
      options={options}
      placeholder={emptyLabel}
      style={style}
    />
  );
}

export function defaultAccountTypeForProvider(providerId: string): AccountType {
  return getProvider(providerId)?.accountTypes[0] ?? 'other';
}

const styles = StyleSheet.create({
  mark: {
    borderRadius: radius.control,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  markText: {fontWeight: '700', letterSpacing: -0.3},
  logo: {borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden'},
});
