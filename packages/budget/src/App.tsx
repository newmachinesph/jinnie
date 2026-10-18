import {useMemo, useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {
  ActionSheet,
  Badge,
  Button,
  CategoryMark,
  CategorySelect,
  ConfirmDialog,
  EmptyState,
  IconPlus,
  IconBudget,
  IconEdit,
  IconTrash,
  InlineAlert,
  Input,
  parseInputNumber,
  PressableCard,
  PrivateValue,
  Progress,
  SectionHeader,
  Sheet,
  Stack,
  formatPeriod,
  getTransactionCategory,
  monthKey,
  peso,
  space,
  tnum,
  useBudgetStore,
  useHost,
  useTheme,
  withAlpha,
  type BudgetLimit,
} from '@jinnie/sdk';

export default function BudgetApp() {
  const t = useTheme();
  const [adding, setAdding] = useState(false);
  const host = useHost();

  const limits = useBudgetStore(state => state.limits);
  const upsertLimit = useBudgetStore(state => state.upsertLimit);
  const deleteLimit = useBudgetStore(state => state.deleteLimit);

  const [categoryId, setCategoryId] = useState('food_dining');
  const [amount, setAmount] = useState('');
  const [selected, setSelected] = useState<BudgetLimit | null>(null);
  const [editing, setEditing] = useState<BudgetLimit | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [deleting, setDeleting] = useState<BudgetLimit | null>(null);

  const finance = host.finance;
  const period = monthKey();
  const monthLabel = formatPeriod(period);

  const expenseTransactions = useMemo(
    () =>
      (finance?.transactions ?? []).filter(
        transaction => transaction.type === 'expense' && transaction.date.startsWith(period),
      ),
    [finance?.transactions, period],
  );

  const spentByCategory = useMemo(() => {
    const totals = new Map<string, number>();
    for (const transaction of expenseTransactions) {
      totals.set(
        transaction.category,
        (totals.get(transaction.category) ?? 0) + transaction.amount,
      );
    }
    return totals;
  }, [expenseTransactions]);

  const orderedLimits = [...limits].sort((a, b) => {
    const ratioA = (spentByCategory.get(a.categoryId) ?? 0) / a.limit;
    const ratioB = (spentByCategory.get(b.categoryId) ?? 0) / b.limit;
    return ratioB - ratioA;
  });

  const totalLimit = limits.reduce((sum, item) => sum + item.limit, 0);
  const budgetedSpend = limits.reduce(
    (sum, item) => sum + (spentByCategory.get(item.categoryId) ?? 0),
    0,
  );
  const totalSpend = expenseTransactions.reduce((sum, transaction) => sum + transaction.amount, 0);
  const unbudgetedSpend = Math.max(0, totalSpend - budgetedSpend);
  const remaining = totalLimit - budgetedSpend;

  const existingCategory = limits.find(item => item.categoryId === categoryId);
  const formAmount = parseInputNumber(amount);
  const canSet = Number.isFinite(formAmount) && formAmount > 0;
  const formEditAmount = parseInputNumber(editAmount);
  const canSaveEdit = Number.isFinite(formEditAmount) && formEditAmount > 0;

  if (!finance) {
    return (
      <InlineAlert
        tone="danger"
        title="Budget is unavailable"
        description="This core app needs access to the shared Wallet ledger."
      />
    );
  }

  return (
    <Stack gap={space.lg}>
      <View style={[styles.plan, {backgroundColor: t.night}]}>
        <Text style={[styles.planEyebrow, {color: t.onNightMuted}]}>
          {monthLabel.toUpperCase()} PLAN
        </Text>
        <View style={styles.planRow}>
          <View style={styles.flexMin}>
            <Text style={[styles.planLabel, {color: t.onNightMuted}]}>
              {remaining >= 0 ? 'Left to spend' : 'Over plan'}
            </Text>
            <PrivateValue style={[styles.planValue, tnum, {color: t.onNight}]}>
              {peso(Math.abs(remaining))}
            </PrivateValue>
          </View>
          <View style={styles.planUsed}>
            <PrivateValue style={[styles.planUsedText, tnum, {color: t.onNightMuted}]}>
              {`${peso(budgetedSpend)} used`}
            </PrivateValue>
            <PrivateValue style={[styles.planUsedText, tnum, {color: t.onNightMuted}]}>
              {`of ${peso(totalLimit)}`}
            </PrivateValue>
          </View>
        </View>
        <Progress
          value={totalLimit > 0 ? (budgetedSpend / totalLimit) * 100 : 0}
          trackColor={withAlpha(t.onNight, 0.18)}
          color={remaining < 0 ? t.negative : t.accent}
          style={styles.planProgress}
        />
      </View>

      <Button icon={<IconPlus size={16} color={t.onPrimary} />} onPress={() => setAdding(true)}>
        Set limit
      </Button>

      {adding ? (
        <Sheet
          eyebrow="Budget"
          title="Set a category limit"
          description={
            existingCategory
              ? 'This updates the existing monthly limit.'
              : 'Limits repeat every month.'
          }
          onClose={() => setAdding(false)}>
          <Stack gap={space.md}>
            <CategorySelect group="expense" value={categoryId} onChange={setCategoryId} />
            <Input min={0.01} required
              money
              value={amount}
              onChangeText={setAmount}
              placeholder={
                existingCategory ? `Current ${peso(existingCategory.limit)}` : 'Monthly limit'
              }
              accessibilityLabel="Monthly budget limit"
            />
            <Button
              disabled={!canSet}
              onPress={() => {
                upsertLimit(categoryId, formAmount);
                setAmount('');
                setAdding(false);
              }}>
              {existingCategory ? 'Update limit' : 'Add limit'}
            </Button>
          </Stack>
        </Sheet>
      ) : null}

      <SectionHeader
        title="Category plan"
        description={
          unbudgetedSpend > 0
            ? `${peso(unbudgetedSpend)} spent outside your plan`
            : 'Every expense is covered by a limit'
        }
      />

      {orderedLimits.length === 0 ? (
        <EmptyState
          icon={<IconBudget size={20} color={t.primary} />}
          title="No category limits yet"
          description="Start with the categories that change most from month to month."
        />
      ) : (
        <Stack gap={space.sm}>
          {orderedLimits.map(item => {
            const spent = spentByCategory.get(item.categoryId) ?? 0;
            const itemRemaining = item.limit - spent;
            const ratio = item.limit > 0 ? (spent / item.limit) * 100 : 0;
            const category = getTransactionCategory(item.categoryId);
            return (
              <PressableCard
                key={item.id}
                label={`Open actions for ${category?.label ?? item.categoryId} budget`}
                onPress={() => setSelected(item)}
                contentStyle={styles.limitContent}>
                <View style={styles.limitTop}>
                  <CategoryMark icon={category?.icon ?? 'other'} size={32} />
                  <View style={styles.flexMin}>
                    <Text style={[styles.limitName, {color: t.ink}]} numberOfLines={1}>
                      {category?.label ?? item.categoryId}
                    </Text>
                    <PrivateValue style={[styles.limitMeta, tnum, {color: t.muted}]}>
                      {`${peso(spent)} of ${peso(item.limit)}`}
                    </PrivateValue>
                  </View>
                  <Badge
                    tone={itemRemaining < 0 ? 'negative' : ratio >= 80 ? 'warning' : 'positive'}>
                    {`${peso(Math.abs(itemRemaining))} ${itemRemaining < 0 ? 'over' : 'left'}`}
                  </Badge>
                </View>
                <Progress
                  value={ratio}
                  color={itemRemaining < 0 ? t.negative : ratio >= 80 ? t.accent : t.primary}
                />
              </PressableCard>
            );
          })}
        </Stack>
      )}

      {selected ? (
        <ActionSheet
          title={getTransactionCategory(selected.categoryId)?.label ?? 'Category budget'}
          description={`Monthly limit ${peso(selected.limit)}`}
          onClose={() => setSelected(null)}
          items={[
            {
              label: 'Change limit',
              description: 'Set a new monthly amount',
              icon: <IconEdit size={20} color={t.primary} />,
              tone: 'primary' as const,
              onSelect: () => {
                setEditing(selected);
                setEditAmount(String(selected.limit));
                setSelected(null);
              },
            },
            {
              label: 'Delete budget',
              description: 'Stop tracking this category against a limit',
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

      {editing ? (
        <Sheet
          eyebrow="Monthly budget"
          title={getTransactionCategory(editing.categoryId)?.label ?? 'Change limit'}
          onClose={() => setEditing(null)}>
          <Input min={0.01} required
            money
            value={editAmount}
            onChangeText={setEditAmount}
            accessibilityLabel="Updated monthly limit"
          />
          <Button
            disabled={!canSaveEdit}
            onPress={() => {
              upsertLimit(editing.categoryId, formEditAmount);
              setEditing(null);
              setEditAmount('');
            }}>
            Save limit
          </Button>
        </Sheet>
      ) : null}

      {deleting ? (
        <ConfirmDialog
          title="Delete budget?"
          description={`Remove the ${peso(deleting.limit)} monthly limit for ${
            getTransactionCategory(deleting.categoryId)?.label ?? 'this category'
          }?`}
          confirmLabel="Delete"
          onClose={() => setDeleting(null)}
          onConfirm={() => {
            deleteLimit(deleting.id);
            setDeleting(null);
          }}
        />
      ) : null}
    </Stack>
  );
}

const styles = StyleSheet.create({
  plan: {borderRadius: 14, padding: space.xl},
  planEyebrow: {fontSize: 10, fontWeight: '700', letterSpacing: 1.4},
  planRow: {flexDirection: 'row', alignItems: 'flex-end', gap: space.lg, marginTop: space.sm},
  planLabel: {fontSize: 12},
  planValue: {fontSize: 26, fontWeight: '700', letterSpacing: -0.6, marginTop: 2},
  planUsed: {alignItems: 'flex-end'},
  planUsedText: {fontSize: 11, lineHeight: 16},
  planProgress: {marginTop: space.lg},

  limitContent: {padding: space.lg, gap: space.md},
  limitTop: {flexDirection: 'row', alignItems: 'center', gap: space.md},
  limitName: {fontSize: 14, fontWeight: '600'},
  limitMeta: {fontSize: 11, marginTop: 2},

  flexMin: {flex: 1, minWidth: 0},
});
