import {useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {
  AccountPicker,
  ActionSheet,
  Badge,
  BillerPicker,
  Button,
  ConfirmDialog,
  EmptyState,
  IconCheck,
  IconEdit,
  IconPlus,
  IconRepeat,
  IconTransfer,
  IconTrash,
  Input,
  isCalendarDate,
  parseInputNumber,
  PressableCard,
  PrivateText,
  ProviderMark,
  Row,
  Segmented,
  Sheet,
  Stack,
  Stat,
  formatDate,
  getBiller,
  monthlyCost,
  nextRenewalAfter,
  peso,
  space,
  useHost,
  useSubscriptionsStore,
  useTheme,
  type Subscription,
  type SubscriptionCycle,
} from '@jinnie/sdk';


function today(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12).toISOString().slice(0, 10);
}

/** Whole days from today to the renewal date. Negative means it slipped past. */
function daysUntil(date: string): number {
  return Math.round((Date.parse(`${date}T12:00:00`) - Date.parse(`${today()}T12:00:00`)) / 86400000);
}

function RenewalBadge({subscription}: {subscription: Subscription}) {
  if (subscription.pausedAt) return <Badge>Paused</Badge>;
  const days = daysUntil(subscription.nextRenewal);
  if (days < 0) return <Badge tone="negative">Renewal passed</Badge>;
  if (days === 0) return <Badge tone="warning">Renews today</Badge>;
  if (days <= 7) return <Badge tone="warning">{`Renews in ${days}d`}</Badge>;
  return <Badge>{`Renews in ${days}d`}</Badge>;
}

export default function SubscriptionsApp() {
  const t = useTheme();
  const host = useHost();
  const subscriptions = useSubscriptionsStore(state => state.subscriptions);
  const addSubscription = useSubscriptionsStore(state => state.addSubscription);
  const updateSubscription = useSubscriptionsStore(state => state.updateSubscription);
  const markRenewed = useSubscriptionsStore(state => state.markRenewed);
  const pauseSubscription = useSubscriptionsStore(state => state.pauseSubscription);
  const resumeSubscription = useSubscriptionsStore(state => state.resumeSubscription);
  const deleteSubscription = useSubscriptionsStore(state => state.deleteSubscription);

  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Subscription | null>(null);
  const [selected, setSelected] = useState<Subscription | null>(null);
  const [deleting, setDeleting] = useState<Subscription | null>(null);

  const [name, setName] = useState('');
  const [billerId, setBillerId] = useState('');
  const [amount, setAmount] = useState('');
  const [cycle, setCycle] = useState<SubscriptionCycle>('monthly');
  const [nextRenewal, setNextRenewal] = useState('');
  const [paymentAccountId, setPaymentAccountId] = useState('');

  const accounts = host.finance?.accounts ?? [];
  const formAmount = parseInputNumber(amount);
  const validDate = isCalendarDate(nextRenewal);
  const canSave = Boolean(name.trim() && Number.isFinite(formAmount) && formAmount > 0 && validDate);

  const closeForm = () => {
    setName('');
    setBillerId('');
    setAmount('');
    setNextRenewal('');
    setAdding(false);
    setEditing(null);
  };

  const startEdit = (item: Subscription) => {
    setName(item.name);
    setBillerId(item.billerId ?? '');
    setAmount(String(item.amount));
    setCycle(item.cycle);
    setNextRenewal(item.nextRenewal);
    setPaymentAccountId(item.paymentAccountId ?? '');
    setEditing(item);
  };

  const handleBiller = (id: string) => {
    setBillerId(id);
    const biller = getBiller(id);
    if (biller && !name.trim()) setName(biller.name);
  };

  const handleSave = () => {
    if (!canSave) return;
    const draft = {
      name: name.trim(),
      billerId: billerId || undefined,
      amount: formAmount,
      cycle,
      nextRenewal,
      paymentAccountId: paymentAccountId || undefined,
    };
    if (editing) updateSubscription(editing.id, draft);
    else addSubscription(draft);
    closeForm();
  };

  const handleRenewed = (item: Subscription) => {
    const accountId = accounts.some(account => account.id === item.paymentAccountId)
      ? item.paymentAccountId
      : undefined;
    const transactionId = host.finance?.addTransaction({
      type: 'expense',
      amount: item.amount,
      description: `${item.name} — ${item.cycle} renewal`,
      category: 'subscriptions',
      accountId,
    });
    markRenewed(item.id, transactionId || undefined);
  };

  const active = subscriptions.filter(item => !item.pausedAt);
  const monthly = active.reduce((sum, item) => sum + monthlyCost(item), 0);
  const dueSoon = active.filter(item => {
    const days = daysUntil(item.nextRenewal);
    return days >= 0 && days <= 7;
  });
  const sorted = [...subscriptions].sort((a, b) => {
    const pausedDifference = Number(Boolean(a.pausedAt)) - Number(Boolean(b.pausedAt));
    return pausedDifference || a.nextRenewal.localeCompare(b.nextRenewal);
  });

  return (
    <Stack gap={space.lg}>
      <Row gap={space.sm}>
        <Stat label="Per month" value={peso(monthly)} />
        <Stat label="Per year" value={peso(monthly * 12)} />
        <Stat
          label="Due in 7 days"
          value={String(dueSoon.length)}
          tone={dueSoon.length ? 'negative' : 'ink'}
        />
      </Row>

      <Button icon={<IconPlus size={16} color={t.onPrimary} />} onPress={() => setAdding(true)}>
        Add subscription
      </Button>

      {adding || editing ? (
        <Sheet
          eyebrow="Subscriptions"
          title={editing ? 'Edit subscription' : 'Add subscription'}
          onClose={closeForm}>
          <Stack gap={space.md}>
            <BillerPicker
              categoryId="subscriptions"
              value={billerId}
              onChange={handleBiller}
            />
            <Input required
              value={name}
              onChangeText={setName}
              placeholder="Name (Netflix, gym, cloud storage…)"
              accessibilityLabel="Subscription name"
            />
            <Input min={0.01} required
              money
              value={amount}
              onChangeText={setAmount}
              placeholder="Amount per charge"
              accessibilityLabel="Amount per charge"
            />
            <Segmented
              label="Billing cycle"
              value={cycle}
              onChange={setCycle}
              options={[
                {value: 'monthly', label: 'Monthly'},
                {value: 'yearly', label: 'Yearly'},
              ]}
            />
            <Input date required
              value={nextRenewal}
              onChangeText={setNextRenewal}
              placeholder="Next renewal YYYY-MM-DD"
              accessibilityLabel="Next renewal date"
              autoCapitalize="none"
              keyboardType="numbers-and-punctuation"
            />
            {nextRenewal && !validDate ? (
              <Text style={[styles.note, {color: t.negative}]}>
                Use the format YYYY-MM-DD, for example {today()}.
              </Text>
            ) : null}
            {accounts.length > 0 ? (
              <AccountPicker
                label="Charged to"
                accounts={accounts}
                value={paymentAccountId}
                onChange={setPaymentAccountId}
                emptyLabel="Choose account later"
              />
            ) : null}
            <Button disabled={!canSave} onPress={handleSave}>
              {editing ? 'Save changes' : 'Add subscription'}
            </Button>
          </Stack>
        </Sheet>
      ) : null}

      {subscriptions.length === 0 ? (
        <EmptyState
          icon={<IconRepeat size={20} color={t.primary} />}
          title="No subscriptions tracked"
          description="Add streaming, cloud, gym, and app plans. Each renewal can post straight to your Wallet."
        />
      ) : (
        <Stack gap={space.sm}>
          {sorted.map(item => (
            <PressableCard
              key={item.id}
              label={`Open actions for ${item.name}`}
              onPress={() => setSelected(item)}
              style={item.pausedAt ? styles.paused : undefined}>
              <View style={styles.row}>
                <ProviderMark
                  providerId={item.billerId ?? item.id}
                  mark={getBiller(item.billerId ?? '')?.mark ?? item.name.slice(0, 2).toUpperCase()}
                  tone={getBiller(item.billerId ?? '')?.tone}
                />
                <View style={styles.flexMin}>
                  <View style={styles.titleRow}>
                    <Text style={[styles.title, {color: t.ink}]} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <RenewalBadge subscription={item} />
                  </View>
                  <Text style={[styles.meta, {color: t.muted}]}>
                    <PrivateText>{peso(item.amount)}</PrivateText>
                    {` ${item.cycle}`}
                    {item.cycle === 'yearly' ? (
                      <>
                        {' · '}
                        <PrivateText>{peso(monthlyCost(item))}</PrivateText>
                        {'/mo'}
                      </>
                    ) : null}
                    {item.pausedAt
                      ? ''
                      : ` · ${formatDate(`${item.nextRenewal}T12:00:00`)}`}
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
          description={`${peso(selected.amount)} ${selected.cycle}${
            selected.pausedAt ? ' · paused' : ` · next ${formatDate(`${selected.nextRenewal}T12:00:00`)}`
          }`}
          onClose={() => setSelected(null)}
          items={[
            {
              label: 'Edit subscription',
              description: 'Change the name, amount, cycle, renewal date, or account',
              icon: <IconEdit size={20} color={t.primary} />,
              onSelect: () => {
                startEdit(selected);
                setSelected(null);
              },
            },
            ...(selected.pausedAt
              ? [
                  {
                    label: 'Resume',
                    description: 'Expect the next charge one cycle from today',
                    icon: <IconTransfer size={20} color={t.primary} />,
                    tone: 'primary' as const,
                    onSelect: () => {
                      resumeSubscription(selected.id, nextRenewalAfter(today(), selected.cycle));
                      setSelected(null);
                    },
                  },
                ]
              : [
                  {
                    label: 'Mark renewed',
                    description: host.finance
                      ? 'Post this charge to Wallet and move the renewal one cycle ahead'
                      : 'Move the renewal one cycle ahead',
                    icon: <IconCheck size={20} color={t.primary} />,
                    tone: 'primary' as const,
                    onSelect: () => {
                      handleRenewed(selected);
                      setSelected(null);
                    },
                  },
                  {
                    label: 'Pause',
                    description: 'Keep it on the list without counting it in totals',
                    icon: <IconTransfer size={20} color={t.muted} />,
                    onSelect: () => {
                      pauseSubscription(selected.id);
                      setSelected(null);
                    },
                  },
                ]),
            {
              label: 'Delete subscription',
              description: 'Remove it from your list; Wallet history stays',
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
          title="Delete subscription?"
          description={`Remove “${deleting.name}” from your list?`}
          confirmLabel="Delete"
          onClose={() => setDeleting(null)}
          onConfirm={() => {
            deleteSubscription(deleting.id);
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
  note: {fontSize: 11},
  paused: {opacity: 0.55},
  flexMin: {flex: 1, minWidth: 0},
});
