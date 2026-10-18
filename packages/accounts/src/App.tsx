import {useMemo, useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {
  AccountTypePicker,
  ActionSheet,
  Badge,
  Button,
  ConfirmDialog,
  CurrencyPicker,
  EmptyState,
  IconPlus,
  IconArchive,
  IconBank,
  IconCheck,
  IconEdit,
  IconTrash,
  Input,
  parseInputNumber,
  Label,
  PressableCard,
  PrivateValue,
  Progress,
  ProviderMark,
  ProviderPicker,
  Row,
  Segmented,
  Sheet,
  Stack,
  Stat,
  accountTypes,
  accountValueInPhp,
  getAccountType,
  getProvider,
  money,
  peso,
  space,
  tnum,
  useAccountsStore,
  useTheme,
  type AccountNature,
  type AccountType,
  type FinanceAccount,
} from '@jinnie/sdk';

function BalanceEditor({
  account,
  onClose,
  onSave,
}: {
  account: FinanceAccount;
  onClose: () => void;
  onSave: (balance: number, rateToPhp?: number) => void;
}) {
  const [nextBalance, setNextBalance] = useState(String(account.balance));
  const [nextRate, setNextRate] = useState(String(account.rateToPhp));

  const balance = parseInputNumber(nextBalance);
  const rate = account.currency === 'PHP' ? 1 : parseInputNumber(nextRate);
  const canSave = Number.isFinite(balance) && Number.isFinite(rate) && rate > 0;

  return (
    <Sheet
      eyebrow={`${account.currency} account`}
      title={`Update ${account.name}`}
      description={`Current balance: ${money(account.balance, account.currency)}`}
      onClose={onClose}>
      <View>
        <Label>{account.nature === 'liability' ? 'Amount currently owed' : 'New balance'}</Label>
        <Input signed
          money
          value={nextBalance}
          onChangeText={setNextBalance}
          accessibilityLabel="New balance"
          style={styles.spaced}
        />
      </View>
      {account.currency !== 'PHP' ? (
        <View>
          <Label>{`PHP value of 1 ${account.currency}`}</Label>
          <Input decimals={6} min={0.000001} required
            money
            value={nextRate}
            onChangeText={setNextRate}
            accessibilityLabel={`Philippine peso rate for ${account.currency}`}
            style={styles.spaced}
          />
        </View>
      ) : null}
      <Row gap={space.md}>
        <Button variant="secondary" onPress={onClose} style={styles.flex1}>
          Cancel
        </Button>
        <Button disabled={!canSave} onPress={() => onSave(balance, rate)} style={styles.flex1}>
          Save balance
        </Button>
      </Row>
    </Sheet>
  );
}

function AccountCard({account, onEdit}: {account: FinanceAccount; onEdit: (account: FinanceAccount) => void}) {
  const t = useTheme();
  const updateBalance = useAccountsStore(state => state.updateBalance);
  const archiveAccount = useAccountsStore(state => state.archiveAccount);
  const restoreAccount = useAccountsStore(state => state.restoreAccount);
  const deleteAccount = useAccountsStore(state => state.deleteAccount);

  const [editingBalance, setEditingBalance] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const provider = getProvider(account.providerId);
  const accountType = getAccountType(account.type);
  const providerName = account.customProviderName || provider?.shortName || 'Other institution';
  const phpValue = accountValueInPhp(account);
  const archived = Boolean(account.archivedAt);
  const creditUsed = account.creditLimit
    ? Math.min(100, Math.max(0, (account.balance / account.creditLimit) * 100))
    : 0;

  return (
    <>
      <PressableCard
        label={`Open actions for ${account.name}`}
        onPress={() => setActionsOpen(true)}
        style={archived ? styles.archived : undefined}
        contentStyle={styles.accountContent}>
        <View style={styles.accountTop}>
          <ProviderMark providerId={account.providerId} />
          <View style={styles.flexMin}>
            <View style={styles.accountTitleRow}>
              <Text style={[styles.accountName, {color: t.ink}]} numberOfLines={1}>
                {account.name}
              </Text>
              {archived ? <Badge>Archived</Badge> : null}
            </View>
            <Text style={[styles.accountMeta, {color: t.muted}]} numberOfLines={1}>
              {providerName} · {accountType?.label ?? account.type}
              {account.lastFour ? ` · •••• ${account.lastFour}` : ''} · {account.currency}
            </Text>
          </View>
          <View style={styles.accountBalanceCol}>
            <PrivateValue
              style={[
                styles.accountBalance,
                tnum,
                {color: account.nature === 'liability' ? t.negative : t.ink},
              ]}>
              {money(account.balance, account.currency)}
            </PrivateValue>
            {account.currency !== 'PHP' ? (
              <PrivateValue style={[styles.accountConverted, tnum, {color: t.muted}]}>
                {`≈ ${peso(phpValue)}`}
              </PrivateValue>
            ) : null}
          </View>
        </View>

        {account.type === 'credit_card' && account.creditLimit ? (
          <View style={styles.credit}>
            <View style={styles.creditLabels}>
              <Text style={[styles.creditText, {color: t.muted}]}>Used</Text>
              <PrivateValue style={[styles.creditText, {color: t.muted}]}>
                {`${creditUsed.toFixed(0)}% of limit`}
              </PrivateValue>
            </View>
            <Progress value={creditUsed} color={t.negative} />
          </View>
        ) : null}
      </PressableCard>

      {actionsOpen ? (
        <ActionSheet
          title={account.name}
          description={`${providerName} · ${account.currency}`}
          onClose={() => setActionsOpen(false)}
          items={[
            ...(!archived
              ? [
                  {
                    label: 'Update balance',
                    description: 'Enter the latest balance for this account',
                    icon: <IconEdit size={20} color={t.primary} />,
                    tone: 'primary' as const,
                    onSelect: () => {
                      setActionsOpen(false);
                      setEditingBalance(true);
                    },
                  },
                  {
                    label: 'Edit account',
                    description: 'Change the institution, type, name, currency, or limit',
                    icon: <IconEdit size={20} color={t.muted} />,
                    onSelect: () => {
                      setActionsOpen(false);
                      onEdit(account);
                    },
                  },
                ]
              : []),
            archived
              ? {
                  label: 'Restore account',
                  description: 'Return this account to totals and account pickers',
                  icon: <IconCheck size={20} color={t.primary} />,
                  tone: 'primary' as const,
                  onSelect: () => {
                    restoreAccount(account.id);
                    setActionsOpen(false);
                  },
                }
              : {
                  label: 'Archive account',
                  description: 'Hide it from totals and pickers without losing history',
                  icon: <IconArchive size={20} color={t.muted} />,
                  onSelect: () => {
                    archiveAccount(account.id);
                    setActionsOpen(false);
                  },
                },
            ...(archived
              ? [
                  {
                    label: 'Delete account permanently',
                    description: 'Wallet transactions will remain in your history',
                    icon: <IconTrash size={20} color={t.negative} />,
                    tone: 'danger' as const,
                    onSelect: () => {
                      setActionsOpen(false);
                      setConfirmingDelete(true);
                    },
                  },
                ]
              : []),
          ]}
        />
      ) : null}

      {confirmingDelete ? (
        <ConfirmDialog
          title="Delete archived account?"
          description={`Permanently delete “${account.name}”? Wallet transactions will remain in your history.`}
          confirmLabel="Delete permanently"
          onClose={() => setConfirmingDelete(false)}
          onConfirm={() => {
            deleteAccount(account.id);
            setConfirmingDelete(false);
          }}
        />
      ) : null}

      {editingBalance ? (
        <BalanceEditor
          account={account}
          onClose={() => setEditingBalance(false)}
          onSave={(balance, rate) => {
            updateBalance(account.id, balance, rate);
            setEditingBalance(false);
          }}
        />
      ) : null}
    </>
  );
}

export default function AccountsApp() {
  const t = useTheme();
  const [adding, setAdding] = useState(false);
  const accounts = useAccountsStore(state => state.accounts);
  const addAccount = useAccountsStore(state => state.addAccount);
  const updateAccount = useAccountsStore(state => state.updateAccount);
  const [editing, setEditing] = useState<FinanceAccount | null>(null);

  const [view, setView] = useState<'active' | 'archived'>('active');
  const [providerId, setProviderId] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('savings');
  const [currency, setCurrency] = useState('PHP');
  const [balance, setBalance] = useState('');
  const [rateToPhp, setRateToPhp] = useState('1');
  const [lastFour, setLastFour] = useState('');
  const [creditLimit, setCreditLimit] = useState('');

  const selectedType = getAccountType(type);

  const {activeAccounts, archivedAccounts, totals} = useMemo(() => {
    const active = accounts.filter(account => !account.archivedAt);
    const archived = accounts.filter(account => account.archivedAt);
    const assets = active
      .filter(account => account.nature === 'asset')
      .reduce((sum, account) => sum + accountValueInPhp(account), 0);
    const liabilities = active
      .filter(account => account.nature === 'liability')
      .reduce((sum, account) => sum + accountValueInPhp(account), 0);
    return {
      activeAccounts: active,
      archivedAccounts: archived,
      totals: {assets, liabilities, netWorth: assets - liabilities},
    };
  }, [accounts]);

  const visible = view === 'active' ? activeAccounts : archivedAccounts;

  const handleProvider = (id: string) => {
    setProviderId(id);
    const provider = getProvider(id);
    if (!provider) return;
    setType(provider.accountTypes[0] ?? 'other');
    setCurrency(provider.defaultCurrency);
    setRateToPhp(provider.defaultCurrency === 'PHP' ? '1' : '');
  };

  const formBalance = parseInputNumber(balance);
  const formRate = currency === 'PHP' ? 1 : parseInputNumber(rateToPhp);
  const formCreditLimit = creditLimit ? parseInputNumber(creditLimit) : undefined;
  const canCreate = Boolean(
    providerId &&
      (!lastFour || /^\d{4}$/.test(lastFour)) &&
      Number.isFinite(formBalance) &&
      Number.isFinite(formRate) &&
      formRate > 0 &&
      (type !== 'credit_card' ||
        formCreditLimit === undefined ||
        (Number.isFinite(formCreditLimit) && formCreditLimit > 0)),
  );

  const closeForm = () => {
    setProviderId('');
    setName('');
    setType('savings');
    setCurrency('PHP');
    setBalance('');
    setRateToPhp('1');
    setLastFour('');
    setCreditLimit('');
    setAdding(false);
    setEditing(null);
  };

  const startEdit = (account: FinanceAccount) => {
    setProviderId(account.providerId);
    setName(account.name);
    setType(account.type);
    setCurrency(account.currency);
    setBalance(String(account.balance));
    setRateToPhp(String(account.rateToPhp));
    setLastFour(account.lastFour ?? '');
    setCreditLimit(account.creditLimit ? String(account.creditLimit) : '');
    setEditing(account);
  };

  const handleCreate = () => {
    if (!canCreate) return;
    const accountType = accountTypes.find(item => item.id === type);
    const provider = getProvider(providerId);
    const nature: AccountNature = accountType?.nature ?? 'asset';
    const defaultName = `${provider?.shortName || 'Account'} ${accountType?.label ?? ''}`.trim();

    if (editing) {
      // Balance and rate stay with "Update balance"; a cleared limit is 0 so
      // the store knows to drop it.
      updateAccount(editing.id, {
        providerId,
        name: name.trim() || defaultName,
        type,
        nature,
        currency,
        lastFour: lastFour.trim() || undefined,
        creditLimit: type === 'credit_card' ? (formCreditLimit ?? 0) : 0,
      });
    } else {
      addAccount({
        providerId,
        name: name.trim() || defaultName,
        type,
        nature,
        currency,
        balance: formBalance,
        rateToPhp: formRate,
        lastFour: lastFour.trim() || undefined,
        creditLimit: type === 'credit_card' ? formCreditLimit : undefined,
      });
    }
    closeForm();
  };

  return (
    <Stack gap={space.lg}>
      <Row gap={space.sm}>
        <Stat label="Net worth" value={peso(totals.netWorth)} />
        <Stat label="Assets" value={peso(totals.assets)} tone="positive" />
        <Stat label="Liabilities" value={peso(totals.liabilities)} tone="negative" />
      </Row>

      <Button icon={<IconPlus size={16} color={t.onPrimary} />} onPress={() => setAdding(true)}>
        Add account
      </Button>

      {adding || editing ? (
        <Sheet eyebrow="Accounts" title={editing ? 'Edit account' : 'Add account'} onClose={closeForm}>
          <Stack gap={space.md}>
            <ProviderPicker value={providerId} onChange={handleProvider} />
            <AccountTypePicker value={type} onChange={setType} />
            <CurrencyPicker
              value={currency}
              onChange={next => {
                setCurrency(next);
                setRateToPhp(next === 'PHP' ? '1' : '');
              }}
            />
            <Input
              value={name}
              onChangeText={setName}
              placeholder="Account name (optional)"
              accessibilityLabel="Account name"
            />
            <Input digits={4}
              value={lastFour}
              onChangeText={next => setLastFour(next.replace(/\D/g, '').slice(0, 4))}
              keyboardType="number-pad"
              placeholder="Last 4 digits (optional)"
              accessibilityLabel="Last four digits"
            />
            {currency !== 'PHP' && !editing ? (
              <Input decimals={6} min={0.000001} required
                money
                value={rateToPhp}
                onChangeText={setRateToPhp}
                placeholder="PHP exchange rate"
                accessibilityLabel={`Philippine peso rate for ${currency}`}
              />
            ) : null}
            {type === 'credit_card' ? (
              <Input min={0.01}
                money
                value={creditLimit}
                onChangeText={setCreditLimit}
                placeholder="Credit limit (optional)"
                accessibilityLabel="Credit limit"
              />
            ) : null}
            {editing ? null : (
              <Input signed
                money
                value={balance}
                onChangeText={setBalance}
                placeholder={selectedType?.nature === 'liability' ? 'Amount owed' : 'Current balance'}
                accessibilityLabel="Current balance"
              />
            )}
            <Button disabled={!canCreate} onPress={handleCreate}>
              {editing ? 'Save changes' : 'Add account'}
            </Button>
            {editing ? (
              <Text style={[styles.note, {color: t.muted}]}>
                The balance and exchange rate are changed with “Update balance”.
              </Text>
            ) : null}
            {currency !== 'PHP' && !editing ? (
              <Text style={[styles.note, {color: t.muted}]}>
                Enter how many Philippine pesos one {currency} is worth. Jinnie keeps this manual
                so it still works offline.
              </Text>
            ) : null}
          </Stack>
        </Sheet>
      ) : null}

      {archivedAccounts.length > 0 ? (
        <Segmented
          label="Account status"
          value={view}
          onChange={setView}
          options={[
            {value: 'active', label: `Active (${activeAccounts.length})`},
            {value: 'archived', label: `Archived (${archivedAccounts.length})`},
          ]}
        />
      ) : null}

      {visible.length === 0 ? (
        <EmptyState
          icon={<IconBank size={20} color={t.primary} />}
          title={view === 'archived' ? 'No archived accounts' : 'Your accounts, one clear view'}
          description={
            view === 'archived'
              ? 'Archived accounts stay here until you restore or delete them.'
              : 'Add cash, banks, e-wallets, cards, and international balances. Each account keeps its own currency.'
          }
        />
      ) : (
        <Stack gap={space.md}>
          {visible.map(account => (
            <AccountCard key={account.id} account={account} onEdit={startEdit} />
          ))}
        </Stack>
      )}
    </Stack>
  );
}

const styles = StyleSheet.create({
  accountContent: {padding: space.lg, gap: space.md},
  accountTop: {flexDirection: 'row', alignItems: 'flex-start', gap: space.md},
  accountTitleRow: {flexDirection: 'row', alignItems: 'center', gap: 6},
  accountName: {fontSize: 14, fontWeight: '600', flexShrink: 1},
  accountMeta: {fontSize: 11, marginTop: 3},
  accountBalanceCol: {alignItems: 'flex-end', flexShrink: 0},
  accountBalance: {fontSize: 14, fontWeight: '700'},
  accountConverted: {fontSize: 10, marginTop: 2},
  archived: {opacity: 0.65},
  credit: {gap: 5},
  creditLabels: {flexDirection: 'row', justifyContent: 'space-between'},
  creditText: {fontSize: 10},
  note: {fontSize: 11, lineHeight: 16},
  spaced: {marginTop: 6},
  flex1: {flex: 1},
  flexMin: {flex: 1, minWidth: 0},
});
