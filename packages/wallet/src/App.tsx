import {useMemo, useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {
  AccountPicker,
  ActionSheet,
  Badge,
  Button,
  CategoryMark,
  CategorySelect,
  ConfirmDialog,
  EmptyState,
  IconPlus,
  IconEdit,
  IconTransfer,
  IconTrash,
  IconWallet,
  Input,
  parseInputNumber,
  PressableCard,
  PrivateValue,
  Row,
  SearchInput,
  SectionHeader,
  Segmented,
  Select,
  Sheet,
  Stack,
  Stat,
  formatDate,
  formatPeriod,
  getTransactionCategory,
  monthKey,
  peso,
  radius,
  space,
  tnum,
  transactionCategories,
  useHost,
  useTheme,
  useWalletStore,
  withAlpha,
  type HostFinance,
  type Transaction,
} from '@jinnie/sdk';

const DEFAULT_EXPENSE_CATEGORY =
  transactionCategories.find(category => category.group === 'expense')?.id ?? 'other_expense';
const DEFAULT_INCOME_CATEGORY =
  transactionCategories.find(category => category.group === 'income')?.id ?? 'other_income';
const EMPTY_ACCOUNTS: HostFinance['accounts'] = [];

type EntryType = 'expense' | 'income' | 'transfer';

type EditableChanges = {
  type: 'expense' | 'income';
  amount: number;
  description: string;
  category: string;
  accountId?: string;
};

function TransactionRow({
  transaction,
  accountNames,
  onOpen,
}: {
  transaction: Transaction;
  accountNames: ReadonlyMap<string, string>;
  onOpen: () => void;
}) {
  const t = useTheme();
  const transfer = transaction.type === 'transfer';
  const income = transaction.type === 'income';
  const source = transaction.accountId ? accountNames.get(transaction.accountId) : undefined;
  const destination = transaction.toAccountId
    ? accountNames.get(transaction.toAccountId)
    : undefined;
  const category = transfer ? undefined : getTransactionCategory(transaction.category);
  const detail = transfer
    ? `${source ?? 'Archived account'} → ${destination ?? 'Archived account'}`
    : (category?.label ?? transaction.category);

  return (
    <PressableCard
      label={`Open actions for ${transaction.description}`}
      onPress={onOpen}
      contentStyle={styles.row}>
      {transfer ? (
        <View style={[styles.rowIcon, {backgroundColor: withAlpha(t.primary, 0.12)}]}>
          <IconTransfer size={16} color={t.primary} />
        </View>
      ) : (
        <CategoryMark icon={category?.icon ?? 'other'} size={32} />
      )}
      <View style={styles.flexMin}>
        <View style={styles.rowTop}>
          <Text style={[styles.rowTitle, {color: t.ink}]} numberOfLines={1}>
            {transaction.description}
          </Text>
          <PrivateValue
            style={[
              styles.rowAmount,
              tnum,
              {color: transfer ? t.primary : income ? t.positive : t.ink},
            ]}>
            {`${transfer ? '' : income ? '+' : '−'}${peso(transaction.amount)}`}
          </PrivateValue>
        </View>
        <Text style={[styles.rowMeta, {color: t.muted}]} numberOfLines={1}>
          {detail} · {formatDate(transaction.date)}
        </Text>
      </View>
    </PressableCard>
  );
}

function EditTransactionSheet({
  transaction,
  accounts,
  onClose,
  onSave,
}: {
  transaction: Transaction;
  accounts: readonly {id: string; name: string; currency: string}[];
  onClose: () => void;
  onSave: (changes: EditableChanges) => void;
}) {
  const [type, setType] = useState<'expense' | 'income'>(
    transaction.type === 'income' ? 'income' : 'expense',
  );
  const [description, setDescription] = useState(transaction.description);
  const [amount, setAmount] = useState(String(transaction.amount));
  const [category, setCategory] = useState(transaction.category);
  const [accountId, setAccountId] = useState(transaction.accountId ?? '');

  const handleType = (next: 'expense' | 'income') => {
    setType(next);
    setCategory(next === 'expense' ? DEFAULT_EXPENSE_CATEGORY : DEFAULT_INCOME_CATEGORY);
  };

  const parsedAmount = parseInputNumber(amount);
  const canSave = Boolean(description.trim()) && Number.isFinite(parsedAmount) && parsedAmount > 0;

  return (
    <Sheet eyebrow="Wallet entry" title="Edit transaction" onClose={onClose}>
      <Segmented
        label="Transaction type"
        value={type}
        onChange={handleType}
        options={[
          {value: 'expense', label: 'Expense'},
          {value: 'income', label: 'Income'},
        ]}
      />
      <Input required
        value={description}
        onChangeText={setDescription}
        accessibilityLabel="Description"
        placeholder="Description"
      />
      <Input min={0.01} required
        money
        value={amount}
        onChangeText={setAmount}
        accessibilityLabel="Amount in pesos"
        placeholder="0.00"
      />
      <CategorySelect group={type} value={category} onChange={setCategory} />
      {accounts.length > 0 ? (
        <AccountPicker
          accounts={accounts}
          value={accountId}
          onChange={setAccountId}
          emptyLabel="Unassigned account"
        />
      ) : null}
      <Row gap={space.md}>
        <Button variant="secondary" onPress={onClose} style={styles.flex1}>
          Cancel
        </Button>
        <Button
          disabled={!canSave}
          style={styles.flex1}
          onPress={() =>
            onSave({
              type,
              amount: parsedAmount,
              description: description.trim(),
              category,
              accountId: accountId || undefined,
            })
          }>
          Save changes
        </Button>
      </Row>
    </Sheet>
  );
}

export default function WalletApp() {
  const t = useTheme();
  const [adding, setAdding] = useState(false);
  const host = useHost();
  const transactions = useWalletStore(state => state.transactions);
  const accounts = host.finance?.accounts ?? EMPTY_ACCOUNTS;

  const accountNames = useMemo(
    () => new Map(accounts.map(account => [account.id, account.name])),
    [accounts],
  );

  const [selected, setSelected] = useState<Transaction | null>(null);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [deleting, setDeleting] = useState<Transaction | null>(null);

  const [type, setType] = useState<EntryType>('expense');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(DEFAULT_EXPENSE_CATEGORY);
  const [accountId, setAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');

  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | EntryType>('all');
  const [periodFilter, setPeriodFilter] = useState('all');

  // Quick add: the form opens on whatever was used last for this kind of
  // entry, so a repeat purchase is amount + Record.
  const lastUsed = (kind: 'expense' | 'income') =>
    transactions.find(transaction => transaction.type === kind && !transaction.billId);

  const applyLastUsed = (kind: 'expense' | 'income') => {
    const last = lastUsed(kind);
    setCategory(last?.category ?? (kind === 'expense' ? DEFAULT_EXPENSE_CATEGORY : DEFAULT_INCOME_CATEGORY));
    if (last?.accountId && accountNames.has(last.accountId)) setAccountId(last.accountId);
  };

  const openForm = () => {
    if (type !== 'transfer') applyLastUsed(type);
    setAdding(true);
  };

  const handleType = (next: EntryType) => {
    setType(next);
    if (next !== 'transfer') applyLastUsed(next);
  };

  const handleAdd = () => {
    const parsedAmount = parseInputNumber(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) return;

    if (type === 'transfer') {
      if (!accountId || !toAccountId || accountId === toAccountId) return;
      const source = accountNames.get(accountId) ?? 'Account';
      const destination = accountNames.get(toAccountId) ?? 'Account';
      host.finance?.transferBetweenAccounts({
        amount: parsedAmount,
        description: description.trim() || `${source} to ${destination}`,
        fromAccountId: accountId,
        toAccountId,
      });
      setDescription('');
      setAmount('');
      setAdding(false);
      return;
    }

    host.finance?.addTransaction({
      type,
      amount: parsedAmount,
      description: description.trim() || (getTransactionCategory(category)?.label ?? 'Expense'),
      category,
      accountId: accountId || undefined,
    });
    setAmount('');
    setDescription('');
    setAdding(false);
  };

  const month = monthKey();
  const thisMonth = transactions.filter(transaction => transaction.date.startsWith(month));
  const monthIn = thisMonth
    .filter(transaction => transaction.type === 'income')
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const monthOut = thisMonth
    .filter(transaction => transaction.type === 'expense')
    .reduce((sum, transaction) => sum + transaction.amount, 0);

  const availablePeriods = useMemo(
    () => [...new Set(transactions.map(transaction => transaction.date.slice(0, 7)))].sort().reverse(),
    [transactions],
  );

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    return transactions
      .filter(transaction => {
        if (typeFilter !== 'all' && transaction.type !== typeFilter) return false;
        if (periodFilter !== 'all' && !transaction.date.startsWith(periodFilter)) return false;
        if (!normalized) return true;
        const searchable = [
          transaction.description,
          getTransactionCategory(transaction.category)?.label,
          transaction.accountId ? accountNames.get(transaction.accountId) : undefined,
          transaction.toAccountId ? accountNames.get(transaction.toAccountId) : undefined,
        ]
          .filter(Boolean)
          .join(' ')
          .toLocaleLowerCase();
        return searchable.includes(normalized);
      })
      .sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
  }, [accountNames, periodFilter, query, transactions, typeFilter]);

  const handleDelete = (transaction: Transaction) => {
    if (host.finance) host.finance.deleteTransaction(transaction.id);
    else useWalletStore.getState().deleteTransaction(transaction.id);
    setDeleting(null);
  };

  const handleUpdate = (changes: EditableChanges) => {
    if (!editing) return;
    if (host.finance) host.finance.updateTransaction(editing.id, changes);
    else useWalletStore.getState().updateTransaction(editing.id, changes);
    setEditing(null);
  };

  const formAmount = parseInputNumber(amount);
  const validAmount = Number.isFinite(formAmount) && formAmount > 0;
  const canSubmit =
    type === 'transfer'
      ? Boolean(
          validAmount &&
            accountId &&
            toAccountId &&
            accountId !== toAccountId &&
            accounts.length >= 2,
        )
      : validAmount;

  return (
    <Stack gap={space.lg}>
      <Row gap={space.sm}>
        <Stat
          label={accounts.length > 0 ? 'Net worth' : 'Balance'}
          value={peso(host.finance?.balance ?? 0)}
        />
        <Stat label="In · month" value={peso(monthIn)} tone="positive" />
        <Stat label="Out · month" value={peso(monthOut)} tone="negative" />
      </Row>

      <Button icon={<IconPlus size={16} color={t.onPrimary} />} onPress={openForm}>
        Record
      </Button>

      {adding ? (
        <Sheet eyebrow="Wallet" title="Record activity" onClose={() => setAdding(false)}>
          <Stack gap={space.md}>
            <Segmented
              label="Transaction type"
              value={type}
              onChange={handleType}
              options={[
                {value: 'expense', label: 'Expense'},
                {value: 'income', label: 'Income'},
                {value: 'transfer', label: 'Transfer'},
              ]}
            />

            {type === 'transfer' ? (
              <>
                {accounts.length < 2 ? (
                  <Text style={[styles.note, {color: t.muted}]}>
                    Add at least two active accounts before recording a transfer.
                  </Text>
                ) : (
                  <>
                    <AccountPicker
                      label="From account"
                      accounts={accounts}
                      value={accountId}
                      onChange={setAccountId}
                      emptyLabel="From account"
                    />
                    <AccountPicker
                      label="To account"
                      accounts={accounts.filter(account => account.id !== accountId)}
                      value={toAccountId}
                      onChange={setToAccountId}
                      emptyLabel="To account"
                    />
                  </>
                )}
                <Input
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Note (optional)"
                  accessibilityLabel="Transfer note"
                />
                <Input min={0.01} required
                  money
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="0.00"
                  accessibilityLabel="Transfer amount in pesos"
                />
                <Text style={[styles.note, {color: t.muted}]}>
                  Transfers use PHP as the common value. Foreign-currency accounts apply their
                  saved conversion rate.
                </Text>
                <Button disabled={!canSubmit} onPress={handleAdd}>
                  Transfer between accounts
                </Button>
              </>
            ) : (
              <>
                <Input min={0.01} required
                  money
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="0.00"
                  accessibilityLabel="Amount in pesos"
                />
                <Input
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Description (optional)"
                  accessibilityLabel="Description"
                />
                <CategorySelect group={type} value={category} onChange={setCategory} />
                {accounts.length > 0 ? (
                  <AccountPicker
                    accounts={accounts}
                    value={accountId}
                    onChange={setAccountId}
                    emptyLabel="Unassigned account"
                  />
                ) : null}
                <Button disabled={!canSubmit} onPress={handleAdd}>
                  Record
                </Button>
              </>
            )}
          </Stack>
        </Sheet>
      ) : null}

      <SectionHeader
        title="Activity"
        description={`${filtered.length} of ${transactions.length} entries`}
      />

      <Stack gap={space.sm}>
        <SearchInput
          value={query}
          onChange={setQuery}
          label="Search transactions"
          placeholder="Search activity"
        />
        <Row gap={space.sm}>
          <Select
            label="Type"
            value={typeFilter}
            onChange={next => setTypeFilter(next as 'all' | EntryType)}
            style={styles.flex1}
            options={[
              {value: 'all', label: 'All types'},
              {value: 'expense', label: 'Expenses'},
              {value: 'income', label: 'Income'},
              {value: 'transfer', label: 'Transfers'},
            ]}
          />
          <Select
            label="Period"
            value={periodFilter}
            onChange={setPeriodFilter}
            style={styles.flex1}
            options={[
              {value: 'all', label: 'All dates'},
              ...availablePeriods.map(period => ({
                value: period,
                label: formatPeriod(period),
              })),
            ]}
          />
        </Row>
      </Stack>

      {transactions.length === 0 ? (
        <EmptyState
          icon={<IconWallet size={20} color={t.primary} />}
          title="No transactions yet"
          description="Record income, an expense, or a transfer above. Everything stays on this device."
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<IconWallet size={20} color={t.primary} />}
          title="No matching activity"
          description="Try a different search term or transaction type."
        />
      ) : (
        <Stack gap={space.sm}>
          {filtered.slice(0, 100).map(transaction => (
            <TransactionRow
              key={transaction.id}
              transaction={transaction}
              accountNames={accountNames}
              onOpen={() => setSelected(transaction)}
            />
          ))}
          {filtered.length > 100 ? <Badge>Showing the 100 most recent matches</Badge> : null}
        </Stack>
      )}

      {selected ? (
        <ActionSheet
          title={selected.description}
          description={`${
            selected.type === 'transfer'
              ? 'Account transfer'
              : (getTransactionCategory(selected.category)?.label ?? selected.category)
          } · ${formatDate(selected.date)}`}
          onClose={() => setSelected(null)}
          items={[
            ...(selected.type !== 'transfer' && !selected.billId
              ? [
                  {
                    label: 'Edit transaction',
                    description: 'Change its details, amount, category, or account',
                    icon: <IconEdit size={20} color={t.primary} />,
                    tone: 'primary' as const,
                    onSelect: () => {
                      setEditing(selected);
                      setSelected(null);
                    },
                  },
                ]
              : []),
            {
              label: selected.type === 'transfer' ? 'Delete transfer' : 'Delete transaction',
              description:
                selected.type === 'transfer'
                  ? 'Reverse both linked account balances'
                  : 'Remove this entry and reconcile its linked account',
              icon: <IconTrash size={20} color={t.negative} />,
              tone: 'danger' as const,
              onSelect: () => {
                setDeleting(selected);
                setSelected(null);
              },
            },
          ]}
        />
      ) : null}

      {deleting ? (
        <ConfirmDialog
          title={deleting.type === 'transfer' ? 'Delete transfer?' : 'Delete transaction?'}
          description={`Delete “${deleting.description}”? ${
            deleting.type === 'transfer'
              ? 'Both account balances will be reversed.'
              : 'Its linked account and bill status will be reconciled.'
          }`}
          confirmLabel="Delete"
          onClose={() => setDeleting(null)}
          onConfirm={() => handleDelete(deleting)}
        />
      ) : null}

      {editing ? (
        <EditTransactionSheet
          transaction={editing}
          accounts={accounts}
          onClose={() => setEditing(null)}
          onSave={handleUpdate}
        />
      ) : null}
    </Stack>
  );
}

const styles = StyleSheet.create({
  row: {flexDirection: 'row', alignItems: 'center', gap: space.md},
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.control,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTop: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md},
  rowTitle: {fontSize: 14, fontWeight: '500', flex: 1, minWidth: 0},
  rowAmount: {fontSize: 14, fontWeight: '600'},
  rowMeta: {fontSize: 11, marginTop: 2},
  note: {fontSize: 11, lineHeight: 16},
  flex1: {flex: 1},
  flexMin: {flex: 1, minWidth: 0},
});
