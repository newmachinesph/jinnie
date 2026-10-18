import {useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {
  AccountPicker,
  ActionSheet,
  Badge,
  BillerCategoryPicker,
  BillerPicker,
  Button,
  ConfirmDialog,
  EmptyState,
  IconPlus,
  IconCheck,
  IconEdit,
  IconReceipt,
  IconTransfer,
  IconTrash,
  Input,
  parseInputNumber,
  PressableCard,
  PrivateText,
  ProviderMark,
  Row,
  Sheet,
  Stack,
  Stat,
  billerCategories,
  getBiller,
  useBillers,
  monthKey,
  peso,
  space,
  useBillsStore,
  useHost,
  useTheme,
  type Bill,
} from '@jinnie/sdk';

/** Days until this bill's due day this month. Negative means past due. */
function daysUntilDue(dueDay: number): number {
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const due = new Date(now.getFullYear(), now.getMonth(), Math.min(dueDay, lastDay));
  return Math.ceil((due.getTime() - now.getTime()) / 86400000);
}

function ordinal(day: number): string {
  const lastTwo = day % 100;
  if (lastTwo >= 11 && lastTwo <= 13) return `${day}th`;
  if (day % 10 === 1) return `${day}st`;
  if (day % 10 === 2) return `${day}nd`;
  if (day % 10 === 3) return `${day}rd`;
  return `${day}th`;
}

function StatusBadge({bill}: {bill: Bill}) {
  if (bill.lastPaidPeriod === monthKey()) return <Badge tone="positive">Paid</Badge>;
  const days = daysUntilDue(bill.dueDay);
  if (days < 0) return <Badge tone="negative">Past due</Badge>;
  if (days <= 3) {
    return <Badge tone="warning">{days === 0 ? 'Due today' : `Due in ${days}d`}</Badge>;
  }
  return <Badge>{`Due in ${days}d`}</Badge>;
}

export default function BillsApp() {
  const t = useTheme();
  const [adding, setAdding] = useState(false);
  const host = useHost();

  const bills = useBillsStore(state => state.bills);
  const addBill = useBillsStore(state => state.addBill);
  const updateBill = useBillsStore(state => state.updateBill);
  const deleteBill = useBillsStore(state => state.deleteBill);
  const markPaid = useBillsStore(state => state.markPaid);
  const markUnpaid = useBillsStore(state => state.markUnpaid);

  const [categoryId, setCategoryId] = useState('electricity');
  const [billerId, setBillerId] = useState('meralco');
  const [paymentAccountId, setPaymentAccountId] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDay, setDueDay] = useState('15');
  const [selected, setSelected] = useState<Bill | null>(null);
  const [deleting, setDeleting] = useState<Bill | null>(null);
  const [editing, setEditing] = useState<Bill | null>(null);

  const billers = useBillers();
  const handleCategory = (nextCategoryId: string) => {
    setCategoryId(nextCategoryId);
    setBillerId(billers.find(biller => biller.categoryId === nextCategoryId)?.id ?? '');
  };

  const formAmount = parseInputNumber(amount);
  const formDueDay = Number(dueDay);
  const canAdd = Boolean(
    billerId &&
      Number.isFinite(formAmount) &&
      formAmount > 0 &&
      Number.isInteger(formDueDay) &&
      formDueDay >= 1 &&
      formDueDay <= 31,
  );

  const closeForm = () => {
    setAmount('');
    setAdding(false);
    setEditing(null);
  };

  const startEdit = (bill: Bill) => {
    setCategoryId(bill.categoryId ?? 'other');
    setBillerId(bill.billerId ?? '');
    setPaymentAccountId(bill.paymentAccountId ?? '');
    setAmount(String(bill.amount));
    setDueDay(String(bill.dueDay));
    setEditing(bill);
  };

  const handleAdd = () => {
    // Bills made before billers were user-extensible keep their typed name.
    const name = editing && billerId === editing.billerId ? editing.name : getBiller(billerId)?.name;
    if (!name || !canAdd) return;
    const draft = {
      name,
      billerId,
      categoryId,
      paymentAccountId: paymentAccountId || undefined,
      amount: formAmount,
      dueDay: formDueDay,
    };
    if (editing) updateBill(editing.id, draft);
    else addBill(draft);
    closeForm();
  };

  const handlePay = (bill: Bill) => {
    if (!host.finance) return;
    const period = monthKey();
    const existing = host.finance.transactions.find(
      transaction => transaction.billId === bill.id && transaction.billPeriod === period,
    );
    const activeAccountId = host.finance.accounts.some(
      account => account.id === bill.paymentAccountId,
    )
      ? bill.paymentAccountId
      : undefined;
    const transactionId =
      existing?.id ??
      host.finance.addTransaction({
        type: 'expense',
        amount: bill.amount,
        description: `${bill.name} — bill payment`,
        category:
          billerCategories.find(category => category.id === bill.categoryId)
            ?.transactionCategoryId ?? 'bills_utilities',
        accountId: activeAccountId,
        billId: bill.id,
        billPeriod: period,
      });
    if (transactionId) markPaid(bill.id, period, transactionId);
  };

  const handleUndoPayment = (bill: Bill) => {
    const period = monthKey();
    const transactionId =
      bill.lastPaymentTransactionId ??
      host.finance?.transactions.find(
        transaction => transaction.billId === bill.id && transaction.billPeriod === period,
      )?.id;
    if (transactionId) host.finance?.deleteTransaction(transactionId);
    markUnpaid(bill.id, period);
  };

  const monthlyTotal = bills.reduce((sum, bill) => sum + bill.amount, 0);
  const unpaid = bills.filter(bill => bill.lastPaidPeriod !== monthKey());
  const sorted = [...bills].sort((a, b) => {
    const paidDifference =
      Number(a.lastPaidPeriod === monthKey()) - Number(b.lastPaidPeriod === monthKey());
    return paidDifference || daysUntilDue(a.dueDay) - daysUntilDue(b.dueDay);
  });

  return (
    <Stack gap={space.lg}>
      <Row gap={space.sm}>
        <Stat label="Monthly commitment" value={peso(monthlyTotal)} />
        <Stat
          label="Unpaid this month"
          value={`${unpaid.length} of ${bills.length}`}
          tone={unpaid.length ? 'negative' : 'ink'}
        />
      </Row>

      <Button icon={<IconPlus size={16} color={t.onPrimary} />} onPress={() => setAdding(true)}>
        Add bill
      </Button>

      {adding || editing ? (
        <Sheet eyebrow="Bills" title={editing ? 'Edit bill' : 'Add bill'} onClose={closeForm}>
          <Stack gap={space.md}>
            <BillerCategoryPicker value={categoryId} onChange={handleCategory} />
            <BillerPicker categoryId={categoryId} value={billerId} onChange={setBillerId} />
            <Input min={0.01} required
              money
              value={amount}
              onChangeText={setAmount}
              placeholder="Amount"
              accessibilityLabel="Amount"
            />
            <Input min={1} max={31} maxLength={2} required
              value={dueDay}
              onChangeText={setDueDay}
              keyboardType="number-pad"
              placeholder="Due day of month"
              accessibilityLabel="Due day of month"
            />
            {(host.finance?.accounts.length ?? 0) > 0 ? (
              <AccountPicker
                label="Payment account"
                accounts={host.finance?.accounts ?? []}
                value={paymentAccountId}
                onChange={setPaymentAccountId}
                emptyLabel="Choose payment account later"
              />
            ) : null}
            <Button disabled={!canAdd} onPress={handleAdd}>
              {editing ? 'Save changes' : 'Add bill'}
            </Button>
          </Stack>
        </Sheet>
      ) : null}

      {bills.length === 0 ? (
        <EmptyState
          icon={<IconReceipt size={20} color={t.primary} />}
          title="No bills tracked"
          description="Add your recurring dues and their cutoff days. Payments post straight to your Wallet."
        />
      ) : (
        <Stack gap={space.sm}>
          {sorted.map(bill => (
            <PressableCard
              key={bill.id}
              label={`Open actions for ${bill.name}`}
              onPress={() => setSelected(bill)}>
              <View style={styles.row}>
                <ProviderMark
                  providerId={bill.billerId}
                  mark={getBiller(bill.billerId ?? '')?.mark ?? bill.name.slice(0, 2).toUpperCase()}
                  tone={getBiller(bill.billerId ?? '')?.tone}
                />
                <View style={styles.flexMin}>
                  <View style={styles.titleRow}>
                    <Text style={[styles.title, {color: t.ink}]} numberOfLines={1}>
                      {bill.name}
                    </Text>
                    <StatusBadge bill={bill} />
                  </View>
                  <Text style={[styles.meta, {color: t.muted}]}>
                    {billerCategories.find(category => category.id === bill.categoryId)?.label ??
                      'Bill'}
                    {' · '}
                    <PrivateText>{peso(bill.amount)}</PrivateText>
                    {` · due on the ${ordinal(bill.dueDay)}`}
                  </Text>
                </View>
              </View>
            </PressableCard>
          ))}
        </Stack>
      )}

      {selected ? (
        <ActionSheet
          title={selected.name}
          description={`Due monthly on day ${selected.dueDay}`}
          onClose={() => setSelected(null)}
          items={[
            {
              label: 'Edit bill',
              description: 'Change the biller, amount, due day, or payment account',
              icon: <IconEdit size={20} color={t.primary} />,
              onSelect: () => {
                startEdit(selected);
                setSelected(null);
              },
            },
            ...(selected.lastPaidPeriod !== monthKey()
              ? [
                  {
                    label: 'Mark paid',
                    description:
                      selected.paymentAccountId &&
                      !host.finance?.accounts.some(
                        account => account.id === selected.paymentAccountId,
                      )
                        ? 'The saved account is archived; this Wallet entry will be unassigned'
                        : 'Record this bill as paid for the current month',
                    icon: <IconCheck size={20} color={t.primary} />,
                    tone: 'primary' as const,
                    onSelect: () => {
                      handlePay(selected);
                      setSelected(null);
                    },
                  },
                ]
              : [
                  {
                    label: 'Undo payment',
                    description: 'Mark this month unpaid and reverse its Wallet entry',
                    icon: <IconTransfer size={20} color={t.muted} />,
                    onSelect: () => {
                      handleUndoPayment(selected);
                      setSelected(null);
                    },
                  },
                ]),
            {
              label: 'Delete bill',
              description: 'Remove this recurring bill from your list',
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
          title="Delete bill?"
          description={`Remove “${deleting.name}” and its monthly reminder?`}
          confirmLabel="Delete"
          onClose={() => setDeleting(null)}
          onConfirm={() => {
            deleteBill(deleting.id);
            setDeleting(null);
          }}
        />
      ) : null}
    </Stack>
  );
}

const styles = StyleSheet.create({
  row: {flexDirection: 'row', alignItems: 'flex-start', gap: space.md},
  titleRow: {flexDirection: 'row', alignItems: 'center', gap: 6},
  title: {fontSize: 14, fontWeight: '500', flexShrink: 1},
  meta: {fontSize: 11, lineHeight: 16},
  flexMin: {flex: 1, minWidth: 0},
});
