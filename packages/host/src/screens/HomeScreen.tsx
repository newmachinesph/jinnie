import {useMemo} from 'react';
import {Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {
  Card,
  CategoryMark,
  EmptyState,
  IconArrowDownLeft,
  IconArrowUpRight,
  IconTransfer,
  IconButton,
  IconSettings,
  IconWallet,
  PrivacyToggle,
  PrivateValue,
  ProviderMark,
  accountValueInPhp,
  formatDate,
  getProvider,
  getTransactionCategory,
  money,
  monthKey,
  peso,
  radius,
  space,
  tnum,
  useAccountsStore,
  useProfileStore,
  useTheme,
  useWalletStore,
  withAlpha,
} from '@jinnie/sdk';

function greeting(name: string, now = new Date()): string {
  const hour = now.getHours();
  const time = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  return name ? `${time}, ${name}` : time;
}

export function HomeScreen({onOpenApp}: {onOpenApp: (id: string) => void}) {
  const t = useTheme();
  const insets = useSafeAreaInsets();

  const accounts = useAccountsStore(state => state.accounts);
  const transactions = useWalletStore(state => state.transactions);
  const name = useProfileStore(state => state.name);

  const {activeAccounts, totals} = useMemo(() => {
    const active = accounts.filter(account => !account.archivedAt);
    const assets = active
      .filter(account => account.nature === 'asset')
      .reduce((sum, account) => sum + accountValueInPhp(account), 0);
    const liabilities = active
      .filter(account => account.nature === 'liability')
      .reduce((sum, account) => sum + accountValueInPhp(account), 0);
    return {
      activeAccounts: active,
      totals: {assets, liabilities, netWorth: assets - liabilities},
    };
  }, [accounts]);

  const recent = useMemo(
    () => [...transactions].sort((a, b) => Date.parse(b.date) - Date.parse(a.date)).slice(0, 5),
    [transactions],
  );

  // This month's movement per account, signed the way the owner feels it:
  // money in is up for an asset and a payment is up for a liability — the
  // same sum once a transfer is read as an expense leaving and an income
  // arriving, which is exactly how the ledger posts it.
  const monthDelta = useMemo(() => {
    const month = monthKey();
    const delta = new Map<string, number>();
    const add = (id: string | undefined, amount: number) => {
      if (id) delta.set(id, (delta.get(id) ?? 0) + amount);
    };
    for (const transaction of transactions) {
      if (!transaction.date.startsWith(month)) continue;
      if (transaction.type === 'transfer') {
        add(transaction.accountId, -transaction.amount);
        add(transaction.toAccountId, transaction.amount);
      } else {
        add(transaction.accountId, transaction.type === 'income' ? transaction.amount : -transaction.amount);
      }
    }
    return delta;
  }, [transactions]);

  return (
    <ScrollView
      style={{backgroundColor: t.surface}}
      contentContainerStyle={[styles.content, {paddingTop: insets.top + space.lg}]}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={[styles.eyebrow, {color: t.primary}]}>
            {formatDate(new Date()).toUpperCase()}
          </Text>
          <Text style={[styles.title, {color: t.ink}]} numberOfLines={2}>
            {greeting(name)}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable
            onPress={() => onOpenApp('accounts')}
            accessibilityRole="button"
            accessibilityLabel="Add account"
            style={({pressed}) => [
              styles.headerButton,
              {backgroundColor: t.card, borderColor: t.line},
              pressed && {borderColor: t.primary},
            ]}>
            <Text style={[styles.headerButtonText, {color: t.ink}]}>Add account</Text>
          </Pressable>
          <IconButton
            label="Settings"
            icon={<IconSettings size={18} color={t.muted} />}
            onPress={() => onOpenApp('settings')}
          />
        </View>
      </View>

      {/* Net worth on the night ground; the privacy switch sits with the figures it hides. */}
      <View
        accessibilityLabel="Net worth"
        style={[styles.netWorth, {backgroundColor: t.night}]}>
        <View style={styles.netWorthTop}>
          <View style={styles.flexMin}>
            <Text style={[styles.netWorthLabel, {color: t.onNightMuted}]}>
              Net worth in PHP
            </Text>
            <PrivateValue
              style={[styles.netWorthValue, tnum, {color: t.onNight}]}
              minimumFontScale={0.5}>
              {peso(totals.netWorth)}
            </PrivateValue>
          </View>
          <PrivacyToggle
            size={22}
            color={t.onNight}
            style={[styles.lamp, {backgroundColor: withAlpha(t.onNight, 0.1)}]}
          />
        </View>
        <View style={[styles.netWorthSplit, {borderTopColor: withAlpha(t.onNight, 0.16)}]}>
          <View style={styles.flex1}>
            <Text style={[styles.netWorthSubLabel, {color: t.onNightMuted}]}>Assets</Text>
            <PrivateValue style={[styles.netWorthSubValue, tnum, {color: t.onNight}]}>
              {peso(totals.assets)}
            </PrivateValue>
          </View>
          <View style={styles.flex1}>
            <Text style={[styles.netWorthSubLabel, {color: t.onNightMuted}]}>Liabilities</Text>
            <PrivateValue style={[styles.netWorthSubValue, tnum, {color: t.onNight}]}>
              {peso(totals.liabilities)}
            </PrivateValue>
          </View>
        </View>
      </View>

      {activeAccounts.length > 0 ? (
        <View>
          <View style={styles.sectionHead}>
            <Text style={[styles.sectionTitle, {color: t.ink}]}>Accounts</Text>
            <Pressable
              onPress={() => onOpenApp('accounts')}
              accessibilityRole="button"
              accessibilityLabel="View all accounts">
              <Text style={[styles.link, {color: t.primary}]}>View all</Text>
            </Pressable>
          </View>
          <View style={styles.accountGrid}>
            {activeAccounts.slice(0, 6).map(account => {
              const delta = monthDelta.get(account.id) ?? 0;
              const Trend = delta > 0 ? IconArrowUpRight : delta < 0 ? IconArrowDownLeft : null;
              return (
              <Card key={account.id} style={styles.accountCard}>
                <View style={styles.accountTop}>
                  <ProviderMark providerId={account.providerId} size={32} />
                  <View style={styles.flexMin}>
                    <Text
                      style={[styles.accountName, {color: t.ink}]}
                      numberOfLines={1}>
                      {account.name}
                    </Text>
                    <Text style={[styles.accountMeta, {color: t.muted}]} numberOfLines={1}>
                      {getProvider(account.providerId)?.shortName ?? account.currency}
                    </Text>
                  </View>
                </View>
                <View style={styles.accountBottom}>
                  <View
                    accessibilityLabel={
                      Trend ? `${delta > 0 ? 'Up' : 'Down'} this month` : 'No movement this month'
                    }
                    style={styles.accountTrend}>
                    {Trend ? <Trend size={14} color={delta > 0 ? t.positive : t.negative} /> : null}
                  </View>
                  <PrivateValue
                    style={[
                      styles.accountBalance,
                      tnum,
                      {color: account.nature === 'liability' ? t.negative : t.ink},
                    ]}>
                    {money(account.balance, account.currency)}
                  </PrivateValue>
                </View>
              </Card>
              );
            })}
          </View>
        </View>
      ) : null}

      <View>
        <View style={styles.sectionHead}>
          <Text style={[styles.sectionTitle, {color: t.ink}]}>Recent activity</Text>
          <Pressable
            onPress={() => onOpenApp('wallet')}
            accessibilityRole="button"
            accessibilityLabel="Open Wallet">
            <Text style={[styles.link, {color: t.primary}]}>Open Wallet</Text>
          </Pressable>
        </View>
        {transactions.length === 0 ? (
          <EmptyState
            illustration="payslip"
            title="Nothing recorded yet"
            description="Add an account, then record income, an expense, or a transfer in Wallet."
          />
        ) : (
          <Card padded={false}>
            {recent.map((transaction, index) => {
              const transfer = transaction.type === 'transfer';
              const income = transaction.type === 'income';
              const category = getTransactionCategory(transaction.category);
              return (
                <View
                  key={transaction.id}
                  style={[
                    styles.activityRow,
                    index > 0 && {borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.line},
                  ]}>
                  {transfer ? (
                    <View style={[styles.activityIcon, {backgroundColor: withAlpha(t.primary, 0.12)}]}>
                      <IconTransfer size={16} color={t.primary} />
                    </View>
                  ) : (
                    <CategoryMark icon={category?.icon ?? 'other'} size={32} />
                  )}
                  <View style={styles.flexMin}>
                    <Text
                      style={[styles.activityTitle, {color: t.ink}]}
                      numberOfLines={1}>
                      {transaction.description}
                    </Text>
                    <Text style={[styles.activityMeta, {color: t.muted}]} numberOfLines={1}>
                      {category?.label ?? transaction.category}{' '}
                      · {formatDate(transaction.date)}
                    </Text>
                  </View>
                  <PrivateValue
                    style={[
                      styles.activityAmount,
                      tnum,
                      {color: transfer ? t.primary : income ? t.positive : t.ink},
                    ]}>
                    {`${transfer ? '' : income ? '+' : '−'}${peso(transaction.amount)}`}
                  </PrivateValue>
                </View>
              );
            })}
          </Card>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {padding: space.lg, paddingBottom: 40, gap: space.xl},

  header: {flexDirection: 'row', alignItems: 'flex-end', gap: space.md},
  headerText: {flex: 1, minWidth: 0},
  eyebrow: {fontSize: 11, fontWeight: '700', letterSpacing: 1},
  title: {fontSize: 21, fontWeight: '700', letterSpacing: -0.4, marginTop: 3},
  headerActions: {flexDirection: 'row', alignItems: 'center', gap: space.xs},
  headerButton: {
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: space.md,
    borderRadius: radius.control,
    borderWidth: StyleSheet.hairlineWidth,
  },
  headerButtonText: {fontSize: 12, fontWeight: '600'},

  netWorth: {borderRadius: 16, padding: space.xl},
  netWorthTop: {flexDirection: 'row', alignItems: 'flex-start', gap: space.lg},
  netWorthLabel: {fontSize: 12, fontWeight: '500'},
  netWorthValue: {fontSize: 30, fontWeight: '700', letterSpacing: -0.8, marginTop: 4},
  lamp: {
    width: 52,
    height: 52,
    borderRadius: radius.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  netWorthSplit: {
    flexDirection: 'row',
    gap: space.lg,
    marginTop: space.xl,
    paddingTop: space.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  netWorthSubLabel: {fontSize: 11},
  netWorthSubValue: {fontSize: 13, fontWeight: '600', marginTop: 2},

  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: space.md,
  },
  sectionTitle: {fontSize: 14, fontWeight: '600'},
  link: {fontSize: 12, fontWeight: '600', paddingVertical: space.sm},

  // See LauncherScreen: percentage columns and `gap` do not mix.
  accountGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: space.md,
  },
  accountCard: {width: '48%', padding: 14},
  accountTop: {flexDirection: 'row', alignItems: 'center', gap: space.sm},
  accountName: {fontSize: 12, fontWeight: '600'},
  accountMeta: {fontSize: 10, marginTop: 1},
  accountBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.sm,
    marginTop: space.md,
  },
  accountTrend: {width: 14, height: 14, flexShrink: 0},
  accountBalance: {fontSize: 14, fontWeight: '700', flexShrink: 1, textAlign: 'right'},

  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.control,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityTitle: {fontSize: 12, fontWeight: '600'},
  activityMeta: {fontSize: 10, marginTop: 2},
  activityAmount: {fontSize: 12, fontWeight: '700'},

  flex1: {flex: 1},
  flexMin: {flex: 1, minWidth: 0},
});
