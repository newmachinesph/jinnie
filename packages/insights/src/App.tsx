import {useMemo, useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {
  Badge,
  Card,
  CategoryMark,
  EmptyState,
  IconChart,
  InlineAlert,
  PrivateValue,
  Progress,
  Row,
  SectionHeader,
  Select,
  Stack,
  Stat,
  availableInsightPeriods,
  expenseBreakdown,
  formatPeriod,
  getTransactionCategory,
  peso,
  recentPeriods,
  space,
  summarizeCashFlow,
  tnum,
  transactionsForPeriod,
  useHost,
  useTheme,
  type HostFinance,
} from '@jinnie/sdk';

const EMPTY_TRANSACTIONS: HostFinance['transactions'] = [];

export default function InsightsApp() {
  const t = useTheme();
  const host = useHost();
  const transactions = host.finance?.transactions ?? EMPTY_TRANSACTIONS;

  const periods = useMemo(() => availableInsightPeriods(transactions), [transactions]);
  const chartPeriods = useMemo(() => recentPeriods(4).reverse(), []);
  const [selectedPeriod, setSelectedPeriod] = useState(() => recentPeriods(1)[0]);

  const selectedTransactions = useMemo(
    () => transactionsForPeriod(transactions, selectedPeriod),
    [selectedPeriod, transactions],
  );
  const {income, spending, net, savingsRate} = useMemo(
    () => summarizeCashFlow(selectedTransactions),
    [selectedTransactions],
  );
  const categories = useMemo(() => expenseBreakdown(selectedTransactions), [selectedTransactions]);

  const monthlyFlow = chartPeriods.map(period => ({
    period,
    ...summarizeCashFlow(transactionsForPeriod(transactions, period)),
  }));
  const maxFlow = Math.max(1, ...monthlyFlow.flatMap(item => [item.income, item.spending]));
  const topCategory = categories[0];

  if (!host.finance) {
    return (
      <InlineAlert
        tone="danger"
        title="Insights are unavailable"
        description="This core app needs access to the shared Wallet ledger."
      />
    );
  }

  return (
    <Stack gap={space.lg}>
      <View style={styles.header}>
        <View style={styles.flexMin}>
          <Text style={[styles.eyebrow, {color: t.primary}]}>LEDGER VIEW</Text>
          <Text style={[styles.headline, {color: t.ink}]}>What changed, and where</Text>
        </View>
        <Select
          label="Period"
          value={selectedPeriod}
          onChange={setSelectedPeriod}
          style={styles.periodSelect}
          options={periods.map(period => ({value: period, label: formatPeriod(period)}))}
        />
      </View>

      <Row gap={space.sm}>
        <Stat label="Income" value={peso(income)} tone="positive" />
        <Stat label="Spent" value={peso(spending)} tone="negative" />
        <Stat label="Net" value={peso(net)} tone={net >= 0 ? 'positive' : 'negative'} />
      </Row>

      <Card>
        <SectionHeader
          title="Money rhythm"
          description="Income and spending across the last four months"
          action={
            <View style={styles.legend}>
              <Text style={[styles.legendItem, {color: t.positive}]}>Income</Text>
              <Text style={[styles.legendItem, {color: t.negative}]}>Spent</Text>
            </View>
          }
        />
        <View
          style={styles.chart}
          accessibilityRole="image"
          accessibilityLabel="Monthly income and spending comparison">
          {monthlyFlow.map(item => (
            <View key={item.period} style={styles.chartRow}>
              <Text style={[styles.chartMonth, {color: t.muted}]}>
                {formatPeriod(item.period, true).toUpperCase()}
              </Text>
              <View style={styles.chartBars}>
                <View style={styles.chartBarRow}>
                  <Progress
                    value={(item.income / maxFlow) * 100}
                    color={t.positive}
                    style={styles.flexMin}
                  />
                  <PrivateValue style={[styles.chartValue, tnum, {color: t.positive}]}>
                    {peso(item.income)}
                  </PrivateValue>
                </View>
                <View style={styles.chartBarRow}>
                  <Progress
                    value={(item.spending / maxFlow) * 100}
                    color={t.negative}
                    style={styles.flexMin}
                  />
                  <PrivateValue style={[styles.chartValue, tnum, {color: t.negative}]}>
                    {peso(item.spending)}
                  </PrivateValue>
                </View>
              </View>
            </View>
          ))}
        </View>
      </Card>

      <SectionHeader title="Where it went" description={formatPeriod(selectedPeriod)} />

      {categories.length === 0 ? (
        <EmptyState
          icon={<IconChart size={20} color={t.primary} />}
          title="No spending in this period"
          description="Expense categories will appear after you record Wallet activity."
        />
      ) : (
        <Card>
          <Stack gap={space.lg}>
            {categories.slice(0, 6).map(item => {
              const category = getTransactionCategory(item.categoryId);
              const share = spending > 0 ? (item.amount / spending) * 100 : 0;
              return (
                <View key={item.categoryId}>
                  <View style={styles.categoryRow}>
                    <View style={styles.categoryLeft}>
                      <CategoryMark icon={category?.icon ?? 'other'} size={28} />
                      <Text style={[styles.categoryName, {color: t.ink}]} numberOfLines={1}>
                        {category?.label ?? item.categoryId}
                      </Text>
                    </View>
                    <View style={styles.categoryRight}>
                      <Badge>{`${Math.round(share)}%`}</Badge>
                      <PrivateValue style={[styles.categoryAmount, tnum, {color: t.ink}]}>
                        {peso(item.amount)}
                      </PrivateValue>
                    </View>
                  </View>
                  <Progress value={share} style={styles.categoryBar} />
                </View>
              );
            })}
          </Stack>
        </Card>
      )}

      <SectionHeader title="Signals" />
      <Stack gap={space.sm}>
        <InlineAlert
          tone={
            income === 0 ? 'warning' : savingsRate >= 20 ? 'success' : savingsRate >= 0 ? 'info' : 'danger'
          }
          title={income === 0 ? 'No income recorded' : `${Math.round(savingsRate)}% savings rate`}
          description={
            income === 0
              ? spending > 0
                ? `${peso(spending)} was spent without income recorded for this period.`
                : 'Add income in Wallet to calculate your savings rate.'
              : net >= 0
                ? `${peso(net)} remained after spending.`
                : `Spending exceeded income by ${peso(Math.abs(net))}.`
          }
        />
        {topCategory ? (
          <InlineAlert
            tone="info"
            title={`${
              getTransactionCategory(topCategory.categoryId)?.label ?? topCategory.categoryId
            } led spending`}
            description={`${peso(topCategory.amount)} across ${topCategory.entries} ${
              topCategory.entries === 1 ? 'entry' : 'entries'
            }.`}
          />
        ) : null}
      </Stack>
    </Stack>
  );
}

const styles = StyleSheet.create({
  header: {flexDirection: 'row', alignItems: 'flex-end', gap: space.md},
  eyebrow: {fontSize: 10, fontWeight: '700', letterSpacing: 1.3},
  headline: {fontSize: 14, fontWeight: '600', marginTop: 3},
  periodSelect: {width: 150},

  legend: {flexDirection: 'row', gap: space.sm},
  legendItem: {fontSize: 9, fontWeight: '700'},

  chart: {marginTop: space.lg, gap: space.md},
  chartRow: {flexDirection: 'row', alignItems: 'center', gap: space.md},
  chartMonth: {fontSize: 10, fontWeight: '700', letterSpacing: 0.6, width: 34},
  chartBars: {flex: 1, gap: 6},
  chartBarRow: {flexDirection: 'row', alignItems: 'center', gap: space.sm},
  chartValue: {fontSize: 10, fontWeight: '600', width: 78, textAlign: 'right'},

  categoryRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md},
  categoryLeft: {flexDirection: 'row', alignItems: 'center', gap: space.sm, flex: 1, minWidth: 0},
  categoryName: {fontSize: 12, fontWeight: '600', flex: 1, minWidth: 0},
  categoryRight: {flexDirection: 'row', alignItems: 'center', gap: space.sm},
  categoryAmount: {fontSize: 12, fontWeight: '700'},
  categoryBar: {marginTop: space.sm},

  flexMin: {flex: 1, minWidth: 0},
});
