import {useContext, useMemo, useState, type ReactNode} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {
  BillerCategoryPicker,
  Button,
  Card,
  CategoryMark,
  IconEdit,
  IconPlus,
  IconTrash,
  Input,
  PressableCard,
  ProviderMark,
  Row,
  SearchInput,
  Segmented,
  Sheet,
  SheetPagesContext,
  Stack,
  billerCategories,
  isUserEntry,
  providerKindLabels,
  space,
  useAccountsStore,
  useBillers,
  useBillsStore,
  useBudgetStore,
  useCatalogStore,
  useFinancialProviders,
  useRemitStore,
  useTheme,
  useTransactionCategories,
  useWalletStore,
  type UserEntry,
} from '@jinnie/sdk';

type Kind = UserEntry['kind'];

const TABS: readonly {value: Kind; label: string}[] = [
  {value: 'category', label: 'Categories'},
  {value: 'institution', label: 'Institutions'},
  {value: 'biller', label: 'Billers'},
];

const ADDED = 'Added by you';

const KIND_NOUN: Record<Kind, string> = {
  category: 'category',
  institution: 'institution',
  biller: 'biller',
};

interface CatalogRow {
  id: string;
  label: string;
  group: string;
  mark: ReactNode;
}

/**
 * The whole catalog on one screen: every built-in the pickers offer and every
 * name the user added, side by side, per kind. Additions can be renamed;
 * deleted only while no record refers to them.
 */
export function CatalogScreen({onClose}: {onClose: () => void}) {
  const t = useTheme();
  const [kind, setKind] = useState<Kind>('category');
  const [query, setQuery] = useState('');
  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newGroup, setNewGroup] = useState<'expense' | 'income'>('expense');
  const [newBillerCategory, setNewBillerCategory] = useState('other');

  const entries = useCatalogStore(state => state.entries);
  const addEntry = useCatalogStore(state => state.addEntry);
  const renameEntry = useCatalogStore(state => state.renameEntry);
  const removeEntry = useCatalogStore(state => state.removeEntry);
  const categories = useTransactionCategories();
  const providers = useFinancialProviders();
  const billers = useBillers();

  const transactions = useWalletStore(state => state.transactions);
  const limits = useBudgetStore(state => state.limits);
  const accounts = useAccountsStore(state => state.accounts);
  const bills = useBillsStore(state => state.bills);
  const remittances = useRemitStore(state => state.entries);

  const rows = useMemo<CatalogRow[]>(() => {
    switch (kind) {
      case 'category':
        return categories.map(category => ({
          id: category.id,
          label: category.label,
          group: category.group === 'income' ? 'Income' : category.group === 'transfer' ? 'Transfer' : 'Expense',
          mark: <CategoryMark icon={category.icon} size={32} />,
        }));
      case 'institution':
        return providers
          .filter(provider => provider.id !== 'custom')
          .map(provider => ({
            id: provider.id,
            label: provider.name,
            group: providerKindLabels[provider.kind],
            mark: <ProviderMark providerId={provider.id} size={32} />,
          }));
      case 'biller':
        return billers
          .filter(biller => biller.id !== 'custom')
          .map(biller => ({
            id: biller.id,
            label: biller.name,
            group: billerCategories.find(c => c.id === biller.categoryId)?.label ?? 'Other',
            mark: <ProviderMark providerId={biller.id} mark={biller.mark} tone={biller.tone} size={32} />,
          }));
    }
  }, [kind, categories, providers, billers]);

  const visible = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    const matching = needle ? rows.filter(row => `${row.label} ${row.group}`.toLocaleLowerCase().includes(needle)) : rows;
    // The user's own entries lead, as one group, so they are never hunted
    // for among sixty built-ins.
    const groups: {name: string; items: CatalogRow[]}[] = [{name: ADDED, items: []}];
    for (const row of matching) {
      const name = isUserEntry(row.id) ? ADDED : row.group;
      const existing = groups.find(g => g.name === name);
      if (existing) existing.items.push(row);
      else groups.push({name, items: [row]});
    }
    return groups.filter(group => group.items.length > 0);
  }, [rows, query]);

  const added = entries.filter(entry => entry.kind === kind).length;
  const builtIn = rows.length - added;

  const usage = (entry: UserEntry): number => {
    switch (entry.kind) {
      case 'category':
        return (
          transactions.filter(item => item.category === entry.id).length +
          limits.filter(item => item.categoryId === entry.id).length
        );
      case 'institution':
        return (
          accounts.filter(item => item.providerId === entry.id).length +
          remittances.filter(item => item.channel === entry.id).length
        );
      case 'biller':
        return bills.filter(item => item.billerId === entry.id).length;
    }
  };

  const create = () => {
    const label = newLabel.trim();
    if (!label) return;
    addEntry(
      kind === 'category'
        ? {kind, label, group: newGroup}
        : kind === 'biller'
          ? {kind, label, categoryId: newBillerCategory}
          : {kind, label},
    );
    setNewLabel('');
    setAdding(false);
  };

  return (
    <>
      <Sheet
        eyebrow="Settings"
        title="Catalog"
        description={`${builtIn} built-in · ${added} added by you`}
        onClose={onClose}>
        <Segmented label="Catalog section" value={kind} onChange={next => { setKind(next); setQuery(''); }} options={TABS} />

        {adding ? (
          <Stack gap={space.md}>
            <Text style={[styles.addTitle, {color: t.ink}]}>New {KIND_NOUN[kind]}</Text>
            <Input
              value={newLabel}
              onChangeText={setNewLabel}
              placeholder="Name"
              accessibilityLabel={`New ${KIND_NOUN[kind]} name`}
              autoCapitalize="words"
              maxLength={40}
              returnKeyType="done"
              onSubmitEditing={create}
            />
            {kind === 'category' ? (
              <Segmented
                label="Ledger side"
                value={newGroup}
                onChange={setNewGroup}
                options={[
                  {value: 'expense', label: 'Expense'},
                  {value: 'income', label: 'Income'},
                ]}
              />
            ) : null}
            {kind === 'biller' ? (
              <BillerCategoryPicker value={newBillerCategory} onChange={setNewBillerCategory} />
            ) : null}
            <Row gap={space.md}>
              <Button variant="secondary" onPress={() => setAdding(false)} style={styles.flex1}>
                Cancel
              </Button>
              <Button disabled={!newLabel.trim()} onPress={create} style={styles.flex1}>
                Save
              </Button>
            </Row>
          </Stack>
        ) : (
          <>
            <Row gap={space.sm}>
              <View style={styles.flex1}>
                <SearchInput value={query} onChange={setQuery} label={`Search ${TABS.find(tab => tab.value === kind)?.label.toLowerCase()}`} placeholder="Search" />
              </View>
              <Button
                variant="secondary"
                icon={<IconPlus size={16} color={t.ink} />}
                accessibilityLabel={`Add ${KIND_NOUN[kind]}`}
                onPress={() => setAdding(true)}>
                Add
              </Button>
            </Row>

            {visible.length === 0 ? (
              <Text style={[styles.empty, {color: t.muted}]}>Nothing matches “{query.trim()}”.</Text>
            ) : (
              visible.map(group => (
                <View key={group.name} style={styles.group}>
                  <Text style={[styles.groupLabel, {color: t.muted}]}>{group.name.toUpperCase()}</Text>
                  {group.items.map(row => {
                    const entry = isUserEntry(row.id) ? entries.find(item => item.id === row.id) : undefined;
                    const content = (
                      <>
                        {row.mark}
                        <Text style={[styles.rowLabel, {color: t.ink}]} numberOfLines={1}>
                          {row.label}
                        </Text>
                      </>
                    );
                    // Built-ins are plain rows: nothing to do to them, so no
                    // tap target and none of the disabled dimming.
                    return entry ? (
                      <EntryRow key={row.id} entry={entry} usage={usage(entry)} onRename={renameEntry} onRemove={removeEntry}>
                        {content}
                      </EntryRow>
                    ) : (
                      <Card key={row.id} padded={false} style={styles.rowCard}>
                        <View style={[styles.row, styles.rowPadding]}>{content}</View>
                      </Card>
                    );
                  })}
                </View>
              ))
            )}
          </>
        )}
      </Sheet>

    </>
  );
}

/**
 * A user entry's row. Tapping it pushes an editor page onto the Catalog
 * sheet — rename, or delete while nothing refers to it — rather than opening
 * a second sheet on top of the first.
 */
function EntryRow({
  entry,
  usage,
  onRename,
  onRemove,
  children,
}: {
  entry: UserEntry;
  usage: number;
  onRename: (id: string, label: string) => void;
  onRemove: (id: string) => void;
  children: ReactNode;
}) {
  const pages = useContext(SheetPagesContext);
  if (!pages) return null;
  return (
    <PressableCard
      label={`Edit ${entry.label}`}
      onPress={() =>
        pages.push({
          title: entry.label,
          description:
            usage > 0
              ? `${KIND_NOUN[entry.kind]} · used by ${usage} ${usage === 1 ? 'record' : 'records'}`
              : `${KIND_NOUN[entry.kind]} · not used by any record yet`,
          content: (
            <EntryEditor
              entry={entry}
              usage={usage}
              onRename={label => {
                onRename(entry.id, label);
                pages.pop();
              }}
              onRemove={() => {
                onRemove(entry.id);
                pages.pop();
              }}
            />
          ),
        })
      }
      style={styles.rowCard}
      contentStyle={styles.row}>
      {children}
    </PressableCard>
  );
}

function EntryEditor({
  entry,
  usage,
  onRename,
  onRemove,
}: {
  entry: UserEntry;
  usage: number;
  onRename: (label: string) => void;
  onRemove: () => void;
}) {
  const t = useTheme();
  const [draft, setDraft] = useState(entry.label);
  const changed = draft.trim().length > 0 && draft.trim() !== entry.label;
  return (
    <Stack gap={space.md}>
      <Input
        value={draft}
        onChangeText={setDraft}
        placeholder="Name"
        accessibilityLabel="Name"
        autoCapitalize="words"
        maxLength={40}
        returnKeyType="done"
        onSubmitEditing={() => changed && onRename(draft)}
      />
      <Button disabled={!changed} icon={<IconEdit size={16} color={t.onPrimary} />} onPress={() => onRename(draft)}>
        Save name
      </Button>
      <Button
        variant="danger"
        disabled={usage > 0}
        icon={<IconTrash size={16} color={t.negative} />}
        onPress={onRemove}>
        {usage > 0 ? 'Delete — reassign its records first' : 'Delete'}
      </Button>
    </Stack>
  );
}

const styles = StyleSheet.create({
  addTitle: {fontSize: 14, fontWeight: '600'},
  group: {gap: 4},
  groupLabel: {fontSize: 10, fontWeight: '700', letterSpacing: 0.9, marginTop: space.sm, marginBottom: 2},
  rowCard: {borderRadius: 4},
  row: {flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 48},
  rowPadding: {padding: space.md},
  rowLabel: {fontSize: 14, fontWeight: '500', flex: 1, minWidth: 0},
  empty: {fontSize: 12, textAlign: 'center', paddingVertical: space.xl},
  flex1: {flex: 1},
});
