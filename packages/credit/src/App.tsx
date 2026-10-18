import {useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {
  AccountPicker,
  ActionSheet,
  Badge,
  Button,
  Card,
  EmptyState,
  IconCard,
  IconEdit,
  IconTransfer,
  Input,
  parseInputNumber,
  InlineAlert,
  Label,
  PressableCard,
  PrivateValue,
  Progress,
  ProviderMark,
  Row,
  Sheet,
  Stack,
  Stat,
  accountValueInPhp,
  daysUntilDay,
  getProvider,
  money,
  peso,
  space,
  tnum,
  useAccountsStore,
  useCreditStore,
  useHost,
  useTheme,
  utilisation,
  type CreditTerms,
  type FinanceAccount,
} from '@jinnie/sdk';

/*
 * Core app: credit monitoring. Cards and loans are Accounts records; this app
 * adds statement terms and reads them together with balances and limits.
 */

function utilisationTone(pct: number): 'positive' | 'warning' | 'negative' {
  if (pct <= 30) return 'positive';
  if (pct <= 60) return 'warning';
  return 'negative';
}

function TermsSheet({
  card,
  terms,
  onClose,
  onSave,
}: {
  card: FinanceAccount;
  terms?: CreditTerms;
  onClose: () => void;
  onSave: (terms: CreditTerms) => void;
}) {
  const t = useTheme();
  const [statementDay, setStatementDay] = useState(terms ? String(terms.statementDay) : '');
  const [dueDay, setDueDay] = useState(terms ? String(terms.dueDay) : '');
  const [rate, setRate] = useState(terms?.interestRate !== undefined ? String(terms.interestRate) : '');

  const statement = Number(statementDay);
  const due = Number(dueDay);
  const interest = rate ? parseInputNumber(rate) : undefined;
  const validDay = (day: number) => Number.isInteger(day) && day >= 1 && day <= 31;
  const canSave =
    validDay(statement) &&
    validDay(due) &&
    (interest === undefined || (Number.isFinite(interest) && interest >= 0));

  return (
    <Sheet eyebrow={card.name} title="Statement terms" onClose={onClose}>
      <Stack gap={space.md}>
        <Input min={1} max={31} maxLength={2} required
          value={statementDay}
          onChangeText={setStatementDay}
          keyboardType="number-pad"
          placeholder="Statement day of month"
          accessibilityLabel="Statement day of month"
        />
        <Input min={1} max={31} maxLength={2} required
          value={dueDay}
          onChangeText={setDueDay}
          keyboardType="number-pad"
          placeholder="Payment due day of month"
          accessibilityLabel="Payment due day of month"
        />
        <Input min={0}
          money
          value={rate}
          onChangeText={setRate}
          placeholder="Annual interest rate % (optional)"
          accessibilityLabel="Annual interest rate"
        />
        <Text style={[styles.note, {color: t.muted}]}>
          Philippine cards commonly cut a statement around the same day each month and fall due
          about 20 days later.
        </Text>
        <Button
          disabled={!canSave}
          onPress={() =>
            onSave({accountId: card.id, statementDay: statement, dueDay: due, interestRate: interest})
          }>
          Save terms
        </Button>
      </Stack>
    </Sheet>
  );
}

function PaymentSheet({
  card,
  sources,
  onClose,
  onPay,
}: {
  card: FinanceAccount;
  sources: readonly {id: string; name: string; currency: string}[];
  onClose: () => void;
  onPay: (fromAccountId: string, amount: number) => void;
}) {
  const [fromAccountId, setFromAccountId] = useState(sources[0]?.id ?? '');
  const [amount, setAmount] = useState('');
  const parsed = parseInputNumber(amount);
  const canPay = Boolean(fromAccountId && Number.isFinite(parsed) && parsed > 0);
  const owed = accountValueInPhp(card);

  return (
    <Sheet
      eyebrow={card.name}
      title="Record a payment"
      description={`${peso(owed)} currently owed`}
      onClose={onClose}>
      <Stack gap={space.md}>
        <AccountPicker
          label="Pay from"
          accounts={sources}
          value={fromAccountId}
          onChange={setFromAccountId}
          emptyLabel="Choose account"
        />
        <View>
          <Label>Amount in pesos</Label>
          <Input min={0.01} required
            money
            value={amount}
            onChangeText={setAmount}
            placeholder="0.00"
            accessibilityLabel="Payment amount in pesos"
            style={styles.spaced}
          />
        </View>
        <Row gap={space.sm}>
          <Button variant="secondary" style={styles.flex1} onPress={() => setAmount(String(owed))}>
            Full balance
          </Button>
          <Button
            variant="secondary"
            style={styles.flex1}
            onPress={() => setAmount((Math.max(500, owed * 0.05)).toFixed(2))}>
            5% minimum
          </Button>
        </Row>
        <Button disabled={!canPay} onPress={() => onPay(fromAccountId, parsed)}>
          Record payment
        </Button>
      </Stack>
    </Sheet>
  );
}

export default function CreditApp() {
  const t = useTheme();
  const host = useHost();
  const accounts = useAccountsStore(state => state.accounts);
  const allTerms = useCreditStore(state => state.terms);
  const setTerms = useCreditStore(state => state.setTerms);

  const [selected, setSelected] = useState<FinanceAccount | null>(null);
  const [editingTerms, setEditingTerms] = useState<FinanceAccount | null>(null);
  const [paying, setPaying] = useState<FinanceAccount | null>(null);

  const cards = accounts.filter(account => account.type === 'credit_card' && !account.archivedAt);
  const loans = accounts.filter(account => account.type === 'loan' && !account.archivedAt);
  const sources = accounts.filter(account => account.nature === 'asset' && !account.archivedAt);

  const owed = cards.reduce((sum, card) => sum + accountValueInPhp(card), 0);
  const limit = cards.reduce(
    (sum, card) => sum + (card.creditLimit ? card.creditLimit * (card.rateToPhp || 1) : 0),
    0,
  );
  const overall = utilisation(owed, limit);
  const termsFor = (card: FinanceAccount) => allTerms.find(item => item.accountId === card.id);

  const handlePay = (card: FinanceAccount, fromAccountId: string, amount: number) => {
    host.finance?.transferBetweenAccounts({
      amount,
      description: `Payment to ${card.name}`,
      fromAccountId,
      toAccountId: card.id,
    });
    setPaying(null);
  };

  return (
    <Stack gap={space.lg}>
      <Row gap={space.sm}>
        <Stat label="Owed on cards" value={peso(owed)} tone={owed > 0 ? 'negative' : 'ink'} />
        <Stat label="Total limit" value={limit > 0 ? peso(limit) : '—'} />
        <Stat
          label="Utilisation"
          value={limit > 0 ? `${overall.toFixed(0)}%` : '—'}
          tone={limit > 0 && overall > 30 ? 'negative' : 'positive'}
        />
      </Row>

      {cards.length > 0 && limit > 0 ? (
        <InlineAlert
          tone={overall <= 30 ? 'success' : overall <= 60 ? 'warning' : 'danger'}
          title={
            overall <= 30
              ? 'Healthy utilisation'
              : overall <= 60
                ? 'Utilisation is getting high'
                : 'Utilisation is high'
          }
          description={
            overall <= 30
              ? 'Staying under 30% of your combined limit keeps your credit profile strong.'
              : `Paying ${peso(Math.max(0, owed - limit * 0.3))} would bring you under 30% of your combined limit.`
          }
        />
      ) : null}

      {cards.length === 0 ? (
        <EmptyState
          icon={<IconCard size={20} color={t.primary} />}
          title="No credit cards yet"
          description="Add a credit card in Accounts with its limit, then set its statement and due days here."
        />
      ) : (
        <Stack gap={space.md}>
          {cards.map(card => {
            const pct = utilisation(card.balance, card.creditLimit);
            const terms = termsFor(card);
            const dueIn = terms ? daysUntilDay(terms.dueDay) : undefined;
            return (
              <PressableCard
                key={card.id}
                label={`Open actions for ${card.name}`}
                onPress={() => setSelected(card)}
                contentStyle={styles.cardContent}>
                <View style={styles.cardTop}>
                  <ProviderMark providerId={card.providerId} />
                  <View style={styles.flexMin}>
                    <View style={styles.titleRow}>
                      <Text style={[styles.title, {color: t.ink}]} numberOfLines={1}>
                        {card.name}
                      </Text>
                      {card.creditLimit ? (
                        <Badge tone={utilisationTone(pct)}>{`${pct.toFixed(0)}% used`}</Badge>
                      ) : null}
                    </View>
                    <Text style={[styles.meta, {color: t.muted}]} numberOfLines={1}>
                      {getProvider(card.providerId)?.shortName ?? 'Card'}
                      {card.lastFour ? ` · •••• ${card.lastFour}` : ''}
                      {terms
                        ? ` · statement ${terms.statementDay} · due ${terms.dueDay}`
                        : ' · no terms yet'}
                    </Text>
                  </View>
                  <View style={styles.balanceCol}>
                    <PrivateValue style={[styles.balance, tnum, {color: t.negative}]}>
                      {money(card.balance, card.currency)}
                    </PrivateValue>
                    {card.creditLimit ? (
                      <PrivateValue style={[styles.limit, tnum, {color: t.muted}]}>
                        {`of ${money(card.creditLimit, card.currency)}`}
                      </PrivateValue>
                    ) : null}
                  </View>
                </View>
                {card.creditLimit ? (
                  <Progress
                    value={pct}
                    color={pct <= 30 ? t.positive : pct <= 60 ? t.accent : t.negative}
                  />
                ) : null}
                {terms ? (
                  <Text style={[styles.due, {color: dueIn !== undefined && dueIn <= 3 ? t.negative : t.muted}]}>
                    {dueIn === 0
                      ? 'Payment due today'
                      : `Payment due in ${dueIn} ${dueIn === 1 ? 'day' : 'days'}`}
                    {terms.interestRate !== undefined ? ` · ${terms.interestRate}% p.a.` : ''}
                  </Text>
                ) : null}
              </PressableCard>
            );
          })}
        </Stack>
      )}

      {loans.length > 0 ? (
        <Card>
          <Text style={[styles.section, {color: t.muted}]}>LOANS</Text>
          <Stack gap={space.sm} style={styles.spaced}>
            {loans.map(loan => (
              <View key={loan.id} style={styles.loanRow}>
                <ProviderMark providerId={loan.providerId} size={28} />
                <Text style={[styles.title, styles.flexMin, {color: t.ink}]} numberOfLines={1}>
                  {loan.name}
                </Text>
                <PrivateValue style={[styles.balance, tnum, {color: t.negative}]}>
                  {money(loan.balance, loan.currency)}
                </PrivateValue>
              </View>
            ))}
          </Stack>
        </Card>
      ) : null}

      {selected ? (
        <ActionSheet
          title={selected.name}
          description={`${peso(accountValueInPhp(selected))} owed${
            selected.creditLimit ? ` · ${utilisation(selected.balance, selected.creditLimit).toFixed(0)}% of limit` : ''
          }`}
          onClose={() => setSelected(null)}
          items={[
            ...(sources.length > 0 && host.finance
              ? [
                  {
                    label: 'Record a payment',
                    description: 'Transfer from a bank or wallet to this card',
                    icon: <IconTransfer size={20} color={t.primary} />,
                    tone: 'primary' as const,
                    onSelect: () => {
                      setPaying(selected);
                      setSelected(null);
                    },
                  },
                ]
              : []),
            {
              label: termsFor(selected) ? 'Edit statement terms' : 'Set statement terms',
              description: 'Statement day, due day, and interest rate',
              icon: <IconEdit size={20} color={t.muted} />,
              onSelect: () => {
                setEditingTerms(selected);
                setSelected(null);
              },
            },
          ]}
        />
      ) : null}

      {editingTerms ? (
        <TermsSheet
          card={editingTerms}
          terms={termsFor(editingTerms)}
          onClose={() => setEditingTerms(null)}
          onSave={terms => {
            setTerms(terms);
            setEditingTerms(null);
          }}
        />
      ) : null}

      {paying ? (
        <PaymentSheet
          card={paying}
          sources={sources}
          onClose={() => setPaying(null)}
          onPay={(from, amount) => handlePay(paying, from, amount)}
        />
      ) : null}
    </Stack>
  );
}

const styles = StyleSheet.create({
  cardContent: {padding: space.lg, gap: space.md},
  cardTop: {flexDirection: 'row', alignItems: 'flex-start', gap: space.md},
  titleRow: {flexDirection: 'row', alignItems: 'center', gap: 6},
  title: {fontSize: 14, fontWeight: '600', flexShrink: 1},
  meta: {fontSize: 11, marginTop: 3},
  balanceCol: {alignItems: 'flex-end', flexShrink: 0},
  balance: {fontSize: 14, fontWeight: '700'},
  limit: {fontSize: 10, marginTop: 2},
  due: {fontSize: 11, fontWeight: '500'},
  section: {fontSize: 10, fontWeight: '700', letterSpacing: 0.9},
  loanRow: {flexDirection: 'row', alignItems: 'center', gap: space.md},
  note: {fontSize: 11, lineHeight: 16},
  spaced: {marginTop: 6},
  flex1: {flex: 1},
  flexMin: {flex: 1, minWidth: 0},
});
