import {useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {
  ActionSheet,
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  IconCheck,
  IconEdit,
  IconPlus,
  IconTrash,
  IconUsers,
  Input,
  parseInputNumber,
  PrivateText,
  PrivateValue,
  Select,
  Sheet,
  Stack,
  Textarea,
  formatDate,
  peso,
  poolBalances,
  settlementPlan,
  space,
  useSharedStore,
  useTheme,
  withAlpha,
  type SharedExpense,
  type SharedPool,
} from '@jinnie/sdk';

/*
 * Community app: shared expense pools. Self-contained — no access to the
 * shared Wallet, by design.
 */

function splitMembers(text: string): string[] {
  return [...new Set(text.split(/[,\n]/).map(member => member.trim()).filter(Boolean))];
}

/** Member chips that toggle in and out of an expense's split. */
function MemberToggles({
  members,
  value,
  onChange,
}: {
  members: string[];
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const t = useTheme();
  return (
    <View style={styles.chips}>
      {members.map(member => {
        const on = value.includes(member);
        return (
          <Pressable
            key={member}
            accessibilityRole="checkbox"
            accessibilityState={{checked: on}}
            accessibilityLabel={`Split with ${member}`}
            onPress={() => onChange(on ? value.filter(item => item !== member) : [...value, member])}
            style={[
              styles.chip,
              {borderColor: on ? t.primary : t.line, backgroundColor: on ? withAlpha(t.primary, 0.1) : 'transparent'},
            ]}>
            {on ? <IconCheck size={12} color={t.primary} /> : null}
            <Text style={[styles.chipText, {color: on ? t.primary : t.muted}]}>{member}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function ExpenseSheet({
  pool,
  expense,
  onClose,
  onSave,
}: {
  pool: SharedPool;
  expense: SharedExpense | null;
  onClose: () => void;
  onSave: (draft: {description: string; amount: number; paidBy: string; splitAmong: string[]}) => void;
}) {
  const [description, setDescription] = useState(expense?.description ?? '');
  const [amount, setAmount] = useState(expense ? String(expense.amount) : '');
  const [paidBy, setPaidBy] = useState(expense?.paidBy ?? pool.members[0]);
  const [splitAmong, setSplitAmong] = useState<string[]>(expense?.splitAmong ?? pool.members);
  const parsed = parseInputNumber(amount);
  const canSave = Boolean(description.trim() && Number.isFinite(parsed) && parsed > 0 && splitAmong.length > 0);

  return (
    <Sheet eyebrow={pool.name} title={expense ? 'Edit expense' : 'Add expense'} onClose={onClose}>
      <Stack gap={space.md}>
        <Input min={0.01} required
          money
          value={amount}
          onChangeText={setAmount}
          placeholder="Amount"
          accessibilityLabel="Amount"
        />
        <Input required
          value={description}
          onChangeText={setDescription}
          placeholder="What was it for?"
          accessibilityLabel="Description"
        />
        <Select
          label="Paid by"
          value={paidBy}
          onChange={setPaidBy}
          options={pool.members.map(member => ({value: member, label: member}))}
        />
        <MemberToggles members={pool.members} value={splitAmong} onChange={setSplitAmong} />
        <Button
          disabled={!canSave}
          onPress={() => onSave({description: description.trim(), amount: parsed, paidBy, splitAmong})}>
          {expense ? 'Save changes' : 'Add expense'}
        </Button>
      </Stack>
    </Sheet>
  );
}

function SettleSheet({
  pool,
  onClose,
  onSettle,
}: {
  pool: SharedPool;
  onClose: () => void;
  onSettle: (from: string, to: string, amount: number) => void;
}) {
  const plan = settlementPlan(poolBalances(pool));
  const first = plan[0];
  const [from, setFrom] = useState(first?.from ?? pool.members[0]);
  const [to, setTo] = useState(first?.to ?? pool.members[1]);
  const [amount, setAmount] = useState(first ? first.amount.toFixed(2) : '');
  const parsed = parseInputNumber(amount);
  const canSettle = Boolean(from && to && from !== to && Number.isFinite(parsed) && parsed > 0);
  const options = pool.members.map(member => ({value: member, label: member}));

  return (
    <Sheet
      eyebrow={pool.name}
      title="Settle up"
      description={plan.length === 0 ? 'Everyone is square.' : `${plan.length} ${plan.length === 1 ? 'transfer' : 'transfers'} would square the group`}
      onClose={onClose}>
      <Stack gap={space.md}>
        <Select label="Who paid" value={from} onChange={setFrom} options={options} />
        <Select label="Paid to" value={to} onChange={setTo} options={options.filter(o => o.value !== from)} />
        <Input min={0.01} required
          money
          value={amount}
          onChangeText={setAmount}
          placeholder="Amount"
          accessibilityLabel="Settlement amount"
        />
        <Button disabled={!canSettle} onPress={() => onSettle(from, to, parsed)}>
          Record settlement
        </Button>
      </Stack>
    </Sheet>
  );
}

function PoolCard({
  pool,
  onEdit,
}: {
  pool: SharedPool;
  onEdit: (pool: SharedPool) => void;
}) {
  const t = useTheme();
  const addExpense = useSharedStore(state => state.addExpense);
  const updateExpense = useSharedStore(state => state.updateExpense);
  const deleteExpense = useSharedStore(state => state.deleteExpense);
  const settleUp = useSharedStore(state => state.settleUp);
  const deletePool = useSharedStore(state => state.deletePool);

  const [actionsOpen, setActionsOpen] = useState(false);
  const [addingExpense, setAddingExpense] = useState(false);
  const [editingExpense, setEditingExpense] = useState<SharedExpense | null>(null);
  const [selectedExpense, setSelectedExpense] = useState<SharedExpense | null>(null);
  const [settling, setSettling] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const balances = poolBalances(pool);
  const plan = settlementPlan(balances);
  const spent = pool.expenses.filter(e => !e.settlement).reduce((sum, e) => sum + e.amount, 0);
  const visibleExpenses = showAll ? pool.expenses : pool.expenses.slice(0, 4);

  return (
    <Card>
      <Stack gap={space.md}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Open actions for ${pool.name}`}
          onPress={() => setActionsOpen(true)}
          style={styles.header}>
          <View style={styles.flexMin}>
            <View style={styles.titleRow}>
              <Text style={[styles.name, {color: t.ink}]} numberOfLines={1}>
                {pool.name}
              </Text>
              {plan.length === 0 ? <Badge tone="positive">Settled</Badge> : <Badge tone="accent">{`${plan.length} to settle`}</Badge>}
            </View>
            <Text style={[styles.meta, {color: t.muted}]}>
              {`${pool.members.length} members · spent `}
              <PrivateText>{peso(spent)}</PrivateText>
            </Text>
          </View>
        </Pressable>

        <View style={styles.balances}>
          {pool.members.map(member => {
            const net = balances[member] ?? 0;
            const color = net > 0.005 ? t.positive : net < -0.005 ? t.negative : t.muted;
            return (
              <View key={member} style={styles.balanceRow}>
                <Text style={[styles.balanceName, {color: t.ink}]} numberOfLines={1}>
                  {member}
                </Text>
                <PrivateValue style={[styles.balanceValue, {color}]}>
                  {net > 0.005 ? `gets ${peso(net)}` : net < -0.005 ? `owes ${peso(-net)}` : 'square'}
                </PrivateValue>
              </View>
            );
          })}
        </View>

        {plan.length > 0 ? (
          <View style={[styles.plan, {backgroundColor: withAlpha(t.primary, 0.08)}]}>
            {plan.map(step => (
              <Text key={`${step.from}-${step.to}`} style={[styles.planText, {color: t.primary}]}>
                {`${step.from} pays ${step.to} `}
                <PrivateText>{peso(step.amount)}</PrivateText>
              </Text>
            ))}
          </View>
        ) : null}

        {pool.expenses.length > 0 ? (
          <View style={styles.expenses}>
            {visibleExpenses.map(expense => (
              <Pressable
                key={expense.id}
                accessibilityRole="button"
                accessibilityLabel={`Open actions for ${expense.description}`}
                onPress={() => setSelectedExpense(expense)}
                style={styles.expenseRow}>
                <View style={styles.flexMin}>
                  <Text style={[styles.expenseTitle, {color: t.ink}]} numberOfLines={1}>
                    {expense.description}
                  </Text>
                  <Text style={[styles.expenseMeta, {color: t.muted}]} numberOfLines={1}>
                    {expense.settlement
                      ? `settlement · ${formatDate(expense.date)}`
                      : `${expense.paidBy} paid · split ${expense.splitAmong.length} ways · ${formatDate(expense.date)}`}
                  </Text>
                </View>
                <PrivateValue style={[styles.expenseAmount, {color: expense.settlement ? t.muted : t.ink}]}>
                  {peso(expense.amount)}
                </PrivateValue>
              </Pressable>
            ))}
            {pool.expenses.length > 4 ? (
              <Button variant="secondary" onPress={() => setShowAll(!showAll)}>
                {showAll ? 'Show fewer' : `Show all ${pool.expenses.length} entries`}
              </Button>
            ) : null}
          </View>
        ) : null}

        <Button
          variant="secondary"
          icon={<IconPlus size={16} color={t.ink} />}
          onPress={() => setAddingExpense(true)}>
          Add expense
        </Button>
      </Stack>

      {actionsOpen ? (
        <ActionSheet
          title={pool.name}
          description={`${pool.members.join(', ')}`}
          onClose={() => setActionsOpen(false)}
          items={[
            {
              label: 'Settle up',
              description: plan.length === 0 ? 'Everyone is square' : 'Record who paid whom',
              icon: <IconCheck size={20} color={t.primary} />,
              tone: 'primary' as const,
              onSelect: () => {
                setActionsOpen(false);
                setSettling(true);
              },
            },
            {
              label: 'Edit group',
              description: 'Rename the group or add members',
              icon: <IconEdit size={20} color={t.muted} />,
              onSelect: () => {
                setActionsOpen(false);
                onEdit(pool);
              },
            },
            {
              label: 'Delete group',
              description: 'Remove the group and every expense in it',
              icon: <IconTrash size={20} color={t.negative} />,
              tone: 'danger' as const,
              onSelect: () => {
                setActionsOpen(false);
                setConfirmingDelete(true);
              },
            },
          ]}
        />
      ) : null}

      {selectedExpense ? (
        <ActionSheet
          title={selectedExpense.description}
          description={`${peso(selectedExpense.amount)} · ${selectedExpense.paidBy} paid`}
          onClose={() => setSelectedExpense(null)}
          items={[
            ...(!selectedExpense.settlement
              ? [
                  {
                    label: 'Edit expense',
                    description: 'Change the amount, payer, or split',
                    icon: <IconEdit size={20} color={t.primary} />,
                    onSelect: () => {
                      setEditingExpense(selectedExpense);
                      setSelectedExpense(null);
                    },
                  },
                ]
              : []),
            {
              label: 'Delete entry',
              description: 'Remove it and recompute every balance',
              icon: <IconTrash size={20} color={t.negative} />,
              tone: 'danger' as const,
              onSelect: () => {
                deleteExpense(pool.id, selectedExpense.id);
                setSelectedExpense(null);
              },
            },
          ]}
        />
      ) : null}

      {addingExpense || editingExpense ? (
        <ExpenseSheet
          pool={pool}
          expense={editingExpense}
          onClose={() => {
            setAddingExpense(false);
            setEditingExpense(null);
          }}
          onSave={draft => {
            if (editingExpense) updateExpense(pool.id, editingExpense.id, draft);
            else addExpense(pool.id, draft);
            setAddingExpense(false);
            setEditingExpense(null);
          }}
        />
      ) : null}

      {settling ? (
        <SettleSheet
          pool={pool}
          onClose={() => setSettling(false)}
          onSettle={(from, to, amount) => {
            settleUp(pool.id, from, to, amount);
            setSettling(false);
          }}
        />
      ) : null}

      {confirmingDelete ? (
        <ConfirmDialog
          title="Delete group?"
          description={`Remove “${pool.name}” and its ${pool.expenses.length} entries?`}
          confirmLabel="Delete"
          onClose={() => setConfirmingDelete(false)}
          onConfirm={() => {
            deletePool(pool.id);
            setConfirmingDelete(false);
          }}
        />
      ) : null}
    </Card>
  );
}

export default function SharedApp() {
  const t = useTheme();
  const pools = useSharedStore(state => state.pools);
  const addPool = useSharedStore(state => state.addPool);
  const updatePool = useSharedStore(state => state.updatePool);

  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<SharedPool | null>(null);
  const [name, setName] = useState('');
  const [membersText, setMembersText] = useState('');

  const members = splitMembers(membersText);
  const canSave = Boolean(name.trim() && members.length >= 2);

  const closeForm = () => {
    setName('');
    setMembersText('');
    setAdding(false);
    setEditing(null);
  };

  const startEdit = (pool: SharedPool) => {
    setName(pool.name);
    setMembersText(pool.members.join(', '));
    setEditing(pool);
  };

  return (
    <Stack gap={space.lg}>
      <Button icon={<IconPlus size={16} color={t.onPrimary} />} onPress={() => setAdding(true)}>
        New group
      </Button>

      {adding || editing ? (
        <Sheet
          eyebrow="Shared"
          title={editing ? 'Edit group' : 'New group'}
          description={editing ? 'Members with expenses stay on the list.' : undefined}
          onClose={closeForm}>
          <Stack gap={space.md}>
            <Input required
              value={name}
              onChangeText={setName}
              placeholder="Group name (Baguio trip, Unit 4B…)"
              accessibilityLabel="Group name"
            />
            <Textarea
              value={membersText}
              onChangeText={setMembersText}
              placeholder="Members, separated by commas — include yourself"
              accessibilityLabel="Members"
            />
            {membersText.trim() && members.length < 2 ? (
              <Text style={[styles.note, {color: t.muted}]}>A group needs at least two members.</Text>
            ) : null}
            <Button
              disabled={!canSave}
              onPress={() => {
                if (editing) updatePool(editing.id, {name: name.trim(), members});
                else addPool({name: name.trim(), members});
                closeForm();
              }}>
              {editing ? 'Save changes' : 'Create group'}
            </Button>
          </Stack>
        </Sheet>
      ) : null}

      {pools.length === 0 ? (
        <EmptyState
          icon={<IconUsers size={20} color={t.primary} />}
          title="No shared groups yet"
          description="Start one for a trip, a flat, or a family fund. Add what each person paid and Jinnie keeps the score."
        />
      ) : (
        <Stack gap={space.md}>
          {pools.map(pool => (
            <PoolCard key={pool.id} pool={pool} onEdit={startEdit} />
          ))}
        </Stack>
      )}
    </Stack>
  );
}

const styles = StyleSheet.create({
  header: {flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 44},
  titleRow: {flexDirection: 'row', alignItems: 'center', gap: 6},
  name: {fontSize: 14, fontWeight: '600', flexShrink: 1},
  meta: {fontSize: 11, lineHeight: 16},
  balances: {gap: 4},
  balanceRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm},
  balanceName: {fontSize: 12, flexShrink: 1},
  balanceValue: {fontSize: 12, fontWeight: '600'},
  plan: {borderRadius: 4, paddingHorizontal: 10, paddingVertical: 8, gap: 2},
  planText: {fontSize: 12, fontWeight: '500'},
  expenses: {gap: 2},
  expenseRow: {flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 44},
  expenseTitle: {fontSize: 13, fontWeight: '500'},
  expenseMeta: {fontSize: 11},
  expenseAmount: {fontSize: 13, fontWeight: '600'},
  chips: {flexDirection: 'row', flexWrap: 'wrap', gap: 6},
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    minHeight: 32,
  },
  chipText: {fontSize: 12, fontWeight: '500'},
  note: {fontSize: 11},
  flexMin: {flex: 1, minWidth: 0},
});
