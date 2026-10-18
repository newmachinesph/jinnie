import {useState} from 'react';
import {Alert, StyleSheet, Text, View} from 'react-native';
import {
  ActionSheet,
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  IconPlus,
  IconCheck,
  IconEdit,
  IconScale,
  IconTransfer,
  IconTrash,
  Input,
  parseInputNumber,
  PressableCard,
  PrivateText,
  Row,
  Segmented,
  Sheet,
  Stack,
  Stat,
  formatDate,
  peso,
  space,
  useDebtsStore,
  useHost,
  useTheme,
  type Debt,
  type DebtDirection,
} from '@jinnie/sdk';

export default function DebtsApp() {
  const t = useTheme();
  const [adding, setAdding] = useState(false);
  const host = useHost();
  const debts = useDebtsStore(state => state.debts);
  const addDebt = useDebtsStore(state => state.addDebt);
  const settleDebt = useDebtsStore(state => state.settleDebt);
  const reopenDebt = useDebtsStore(state => state.reopenDebt);
  const updateDebt = useDebtsStore(state => state.updateDebt);
  const deleteDebt = useDebtsStore(state => state.deleteDebt);

  const [direction, setDirection] = useState<DebtDirection>('receivable');
  const [person, setPerson] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [selected, setSelected] = useState<Debt | null>(null);
  const [deleting, setDeleting] = useState<Debt | null>(null);
  const [editing, setEditing] = useState<Debt | null>(null);

  const closeForm = () => {
    setPerson('');
    setAmount('');
    setNote('');
    setAdding(false);
    setEditing(null);
  };

  const startEdit = (debt: Debt) => {
    setDirection(debt.direction);
    setPerson(debt.person);
    setAmount(String(debt.amount));
    setNote(debt.note ?? '');
    setEditing(debt);
  };

  const open = debts.filter(debt => !debt.settledAt);
  const receivable = open
    .filter(debt => debt.direction === 'receivable')
    .reduce((sum, debt) => sum + debt.amount, 0);
  const payable = open
    .filter(debt => debt.direction === 'payable')
    .reduce((sum, debt) => sum + debt.amount, 0);

  const formAmount = parseInputNumber(amount);
  const canAdd = Boolean(person.trim() && Number.isFinite(formAmount) && formAmount > 0);

  const sorted = [...debts].sort((a, b) => {
    const settledDifference = Number(Boolean(a.settledAt)) - Number(Boolean(b.settledAt));
    return settledDifference || Date.parse(b.date) - Date.parse(a.date);
  });

  return (
    <Stack gap={space.lg}>
      <Row gap={space.sm}>
        <Stat label="Owed to you" value={peso(receivable)} tone="positive" />
        <Stat label="You owe" value={peso(payable)} tone="negative" />
      </Row>

      <Button icon={<IconPlus size={16} color={t.onPrimary} />} onPress={() => setAdding(true)}>
        Record
      </Button>

      {adding || editing ? (
        <Sheet eyebrow="Debts" title={editing ? 'Edit debt' : 'Record a debt'} onClose={closeForm}>
          <Stack gap={space.md}>
            <Segmented
              label="Direction"
              value={direction}
              onChange={setDirection}
              options={[
                {value: 'receivable', label: 'Owed to me'},
                {value: 'payable', label: 'I owe'},
              ]}
            />
            <Input required
              value={person}
              onChangeText={setPerson}
              placeholder="Name"
              accessibilityLabel="Person"
            />
            <Input min={0.01} required
              money
              value={amount}
              onChangeText={setAmount}
              placeholder="Amount"
              accessibilityLabel="Amount"
            />
            <Input
              value={note}
              onChangeText={setNote}
              placeholder="Reference (optional)"
              accessibilityLabel="Reference note"
            />
            <Button
              disabled={!canAdd}
              onPress={() => {
                // An empty note clears it on edit; the store keeps the old
                // note only when the field is left out entirely.
                if (editing) {
                  updateDebt(editing.id, {person: person.trim(), amount: formAmount, direction, note: note.trim()});
                } else {
                  addDebt({
                    person: person.trim(),
                    amount: formAmount,
                    direction,
                    note: note.trim() || undefined,
                  });
                }
                closeForm();
              }}>
              {editing ? 'Save changes' : 'Record'}
            </Button>
          </Stack>
        </Sheet>
      ) : null}

      {debts.length === 0 ? (
        <EmptyState
          icon={<IconScale size={20} color={t.primary} />}
          title="No open debts"
          description="Track money owed in both directions and mark repayments when they are settled."
        />
      ) : (
        <Stack gap={space.sm}>
          {sorted.map(debt => (
            <PressableCard
              key={debt.id}
              label={`Open actions for ${debt.person}`}
              onPress={() => setSelected(debt)}
              style={debt.settledAt ? styles.settled : undefined}>
              <View style={styles.flexMin}>
                <View style={styles.titleRow}>
                  <Text style={[styles.person, {color: t.ink}]} numberOfLines={1}>
                    {debt.person}
                  </Text>
                  {debt.settledAt ? (
                    <Badge tone="positive">Settled</Badge>
                  ) : debt.direction === 'receivable' ? (
                    <Badge tone="accent">Owes you</Badge>
                  ) : (
                    <Badge tone="warning">You owe</Badge>
                  )}
                </View>
                <Text style={[styles.meta, {color: t.muted}]}>
                  <PrivateText>{peso(debt.amount)}</PrivateText>
                  {debt.note ? ` · ${debt.note}` : ''}
                  {` · ${formatDate(debt.date)}`}
                </Text>
              </View>
            </PressableCard>
          ))}
        </Stack>
      )}

      {selected ? (
        <ActionSheet
          title={selected.person}
          description={`${peso(selected.amount)}${selected.note ? ` · ${selected.note}` : ''}`}
          onClose={() => setSelected(null)}
          items={[
            {
              label: 'Edit entry',
              description: 'Change the person, amount, direction, or reference',
              icon: <IconEdit size={20} color={t.primary} />,
              onSelect: () => {
                startEdit(selected);
                setSelected(null);
              },
            },
            ...(!selected.settledAt
              ? [
                  ...(host.wallet
                    ? [
                        {
                          label: 'Settle and post to Wallet',
                          description:
                            selected.direction === 'receivable'
                              ? `Records ${peso(selected.amount)} as income`
                              : `Records ${peso(selected.amount)} as an expense`,
                          icon: <IconCheck size={20} color={t.primary} />,
                          tone: 'primary' as const,
                          onSelect: () => {
                            const receivable = selected.direction === 'receivable';
                            const id = host.wallet?.post({
                              type: receivable ? 'income' : 'expense',
                              amount: selected.amount,
                              description: `${receivable ? 'Repaid by' : 'Paid to'} ${selected.person}`,
                              category: receivable ? 'debt_repayment' : 'debt_payment',
                              accountId: selected.accountId,
                            });
                            if (!id) {
                              Alert.alert(
                                'Wallet did not accept the entry',
                                'The debt stays open. Check the account and try again.',
                              );
                              return;
                            }
                            settleDebt(selected.id);
                            setSelected(null);
                          },
                        },
                      ]
                    : []),
                  {
                    label: 'Mark settled',
                    description: 'Close this debt without posting to Wallet',
                    icon: <IconCheck size={20} color={t.primary} />,
                    tone: host.wallet ? undefined : ('primary' as const),
                    onSelect: () => {
                      settleDebt(selected.id);
                      setSelected(null);
                    },
                  },
                ]
              : [
                  {
                    label: 'Reopen debt',
                    description: 'Return this record to the open list',
                    icon: <IconTransfer size={20} color={t.muted} />,
                    onSelect: () => {
                      reopenDebt(selected.id);
                      setSelected(null);
                    },
                  },
                ]),
            {
              label: 'Delete entry',
              description: 'Remove this debt record',
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
          title="Delete debt entry?"
          description={`Remove the ${peso(deleting.amount)} record for “${deleting.person}”?`}
          confirmLabel="Delete"
          onClose={() => setDeleting(null)}
          onConfirm={() => {
            deleteDebt(deleting.id);
            setDeleting(null);
          }}
        />
      ) : null}
    </Stack>
  );
}

const styles = StyleSheet.create({
  titleRow: {flexDirection: 'row', alignItems: 'center', gap: 6},
  person: {fontSize: 14, fontWeight: '500', flexShrink: 1},
  meta: {fontSize: 11, lineHeight: 16},
  settled: {opacity: 0.55},
  flexMin: {flex: 1, minWidth: 0},
});
