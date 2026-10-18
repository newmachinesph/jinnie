import {useState, type ReactNode} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import * as Application from 'expo-application';
import {
  ActionSheet,
  Badge,
  Button,
  CATALOG_VERSION,
  Card,
  DEMO_PROFILE,
  IconChevronRight,
  IconDownload,
  IconFootprints,
  IconTransfer,
  IconTrash,
  InlineAlert,
  PressableCard,
  SectionHeader,
  Stack,
  loadDemoData,
  preferences,
  removeDemoData,
  space,
  useCatalogStore,
  useDemoActive,
  useHost,
  useTheme,
} from '@jinnie/sdk';
import {CatalogScreen} from './CatalogScreen';

/**
 * The sample profile: a row that says whether it is loaded, and a sheet with
 * the actions. Nothing sits on top of the screen any more.
 */
function SampleDataRow() {
  const t = useTheme();
  const active = useDemoActive();
  const [open, setOpen] = useState(false);
  return (
    <>
      <PressableCard
        label={active ? `Sample data loaded: ${DEMO_PROFILE.label}` : 'Load sample data'}
        onPress={() => setOpen(true)}
        contentStyle={styles.catalogRow}>
        <View style={styles.flexMin}>
          <Text style={[styles.rowLabel, {color: t.ink}]}>Sample data</Text>
          <Text style={[styles.rowDescription, {color: t.muted}]}>
            {active
              ? `${DEMO_PROFILE.label} · ${DEMO_PROFILE.location} · loaded across every app`
              : `Preview every app with the ${DEMO_PROFILE.label}. Your own records are untouched.`}
          </Text>
        </View>
        {active ? <Badge tone="accent">Loaded</Badge> : null}
        <IconChevronRight size={16} color={t.muted} />
      </PressableCard>
      {open ? (
        <ActionSheet
          title="Sample data"
          description={
            active
              ? 'Sample rows sit beside your own and are refreshed on every launch.'
              : `The ${DEMO_PROFILE.label} in ${DEMO_PROFILE.location}: accounts, bills, budgets, goals, and history.`
          }
          onClose={() => setOpen(false)}
          items={
            active
              ? [
                  {
                    label: 'Reset sample data',
                    description: 'Put every sample row back the way it started',
                    icon: <IconTransfer size={20} color={t.primary} />,
                    tone: 'primary' as const,
                    onSelect: () => {
                      loadDemoData();
                      setOpen(false);
                    },
                  },
                  {
                    label: 'Remove sample data',
                    description: 'Delete the sample rows; your own records stay',
                    icon: <IconTrash size={20} color={t.negative} />,
                    tone: 'danger' as const,
                    onSelect: () => {
                      removeDemoData();
                      setOpen(false);
                    },
                  },
                ]
              : [
                  {
                    label: 'Load sample data',
                    description: 'Adds the sample household on top of what you have',
                    icon: <IconDownload size={20} color={t.primary} />,
                    tone: 'primary' as const,
                    onSelect: () => {
                      loadDemoData();
                      setOpen(false);
                    },
                  },
                ]
          }
        />
      ) : null}
    </>
  );
}

/** One row into the catalog screen: what the pickers offer, and what the user added. */
function CatalogCard() {
  const t = useTheme();
  const added = useCatalogStore(state => state.entries.length);
  const [open, setOpen] = useState(false);
  return (
    <>
      <PressableCard label="Open the catalog" onPress={() => setOpen(true)} contentStyle={styles.catalogRow}>
        <View style={styles.flexMin}>
          <Text style={[styles.rowLabel, {color: t.ink}]}>Categories, institutions & billers</Text>
          <Text style={[styles.rowDescription, {color: t.muted}]}>
            {added === 0
              ? 'The built-in lists. Anything you add from a picker appears here.'
              : `The built-in lists and ${added} ${added === 1 ? 'name' : 'names'} you added.`}
          </Text>
        </View>
        <IconChevronRight size={16} color={t.muted} />
      </PressableCard>
      {open ? <CatalogScreen onClose={() => setOpen(false)} /> : null}
    </>
  );
}

function SettingsRow({
  label,
  description,
  value,
  first,
}: {
  label: string;
  description: string;
  value: ReactNode;
  /** The divider belongs between rows, not under the card's own heading. */
  first?: boolean;
}) {
  const t = useTheme();
  return (
    <View
      style={[styles.row, !first && {borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.line}]}>
      <View style={styles.flexMin}>
        <Text style={[styles.rowLabel, {color: t.ink}]}>{label}</Text>
        <Text style={[styles.rowDescription, {color: t.muted}]}>{description}</Text>
      </View>
      <View style={styles.rowValue}>{value}</View>
    </View>
  );
}

/**
 * General settings for the shell: sample data, the catalogs, the walkthrough
 * and build details. Opened from the gear on Home, not from the launcher.
 * Privacy, the app lock and backups live in the Security app.
 */
export default function SettingsApp() {
  const t = useTheme();
  const host = useHost();
  const [walkthroughNotice, setWalkthroughNotice] = useState('');

  const replayOnboarding = async () => {
    await preferences.remove('onboarding.completed');
    setWalkthroughNotice('The walkthrough will run the next time you open Jinnie.');
  };

  return (
    <Stack gap={space.lg}>
      <Card>
        <SectionHeader
          title="Help & setup"
          description="Try the app with sample data, or replay the introduction."
        />
        <View style={styles.spaced}>
          <SampleDataRow />
        </View>
        <Button
          variant="secondary"
          style={styles.spaced}
          icon={<IconFootprints size={16} color={t.ink} />}
          onPress={() => void replayOnboarding()}>
          Show the walkthrough again
        </Button>
        {walkthroughNotice ? (
          <InlineAlert style={styles.spaced} tone="success" title={walkthroughNotice} />
        ) : null}
      </Card>

      <CatalogCard />

      <Card>
        <SectionHeader title="This build" description="Version and packaging details." />
        <View style={styles.rows}>
          <SettingsRow
            label="App version"
            description="The installed host shell."
            value={<Badge>{Application.nativeApplicationVersion ?? '1.0.0'}</Badge>}
            first
          />
          <SettingsRow
            label="Build number"
            description="Increments with every native release."
            value={<Badge>{Application.nativeBuildVersion ?? '—'}</Badge>}
          />
          <SettingsRow
            label="This app"
            description="Delivered as its own bundle, updated independently of the host."
            value={
              <Badge tone="accent">
                {`${host.app.id} v${host.app.version}`}
              </Badge>
            }
          />
          <SettingsRow
            label="Catalog version"
            description="Providers, currencies, categories, and billers."
            value={<Badge>{CATALOG_VERSION}</Badge>}
          />
        </View>
      </Card>

      <Text style={[styles.footer, {color: t.muted}]}>
        Jinnie v1.0.0 · Offline-first personal finance
      </Text>
    </Stack>
  );
}

const styles = StyleSheet.create({
  rows: {marginTop: space.sm},
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.lg,
    minHeight: 44,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  rowLabel: {fontSize: 14, fontWeight: '500'},
  rowDescription: {fontSize: 11, lineHeight: 16, marginTop: 2},
  rowValue: {flexShrink: 0},
  spaced: {marginTop: space.md},
  catalogRow: {flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg},
  footer: {fontSize: 11, textAlign: 'center', lineHeight: 16},
  flexMin: {flex: 1, minWidth: 0},
});
