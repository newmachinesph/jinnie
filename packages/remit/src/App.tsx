import {useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {
  ActionSheet,
  Button,
  ConfirmDialog,
  EmptyState,
  IconPlus,
  IconArrowDownLeft,
  IconEdit,
  IconSend,
  IconTrash,
  Input,
  parseInputNumber,
  PressableCard,
  PrivateText,
  ProviderPicker,
  Row,
  Segmented,
  Sheet,
  Stack,
  Stat,
  Switch,
  formatDate,
  getProvider,
  monthKey,
  peso,
  radius,
  space,
  useHost,
  useRemitStore,
  useTheme,
  withAlpha,
  type Remittance,
  type RemittanceDirection,
} from '@jinnie/sdk';

/*
 * Community app: a remittance log. Self-contained; it uses only the public
 * bridge surface (currency, online) and never the shared Wallet.
 */

const REMIT_PROVIDER_KINDS = [
  'ewallet',
  'remittance',
  'digital_bank',
  'bank',
  'international',
] as const;

export default function RemitApp() {
  const t = useTheme();
  const [adding, setAdding] = useState(false);
  const host = useHost();

  const entries = useRemitStore(state => state.entries);
  const addEntry = useRemitStore(state => state.addEntry);
  const updateEntry = useRemitStore(state => state.updateEntry);
  const deleteEntry = useRemitStore(state => state.deleteEntry);

  const [direction, setDirection] = useState<RemittanceDirection>('sent');
  const [person, setPerson] = useState('');
  const [channel, setChannel] = useState('gcash');
  const [amount, setAmount] = useState('');
  const [fee, setFee] = useState('');
  const [postToWallet, setPostToWallet] = useState(true);
  const [selected, setSelected] = useState<Remittance | null>(null);
  const [deleting, setDeleting] = useState<Remittance | null>(null);
  const [editing, setEditing] = useState<Remittance | null>(null);

  const closeForm = () => {
    setPerson('');
    setAmount('');
    setFee('');
    setAdding(false);
    setEditing(null);
  };

  const startEdit = (entry: Remittance) => {
    setDirection(entry.direction);
    setPerson(entry.person);
    setChannel(entry.channel);
    setAmount(String(entry.amount));
    setFee(entry.fee > 0 ? String(entry.fee) : '');
    setEditing(entry);
  };

  const month = monthKey();
  const thisMonth = entries.filter(entry => entry.date.startsWith(month));
  const sent = thisMonth
    .filter(entry => entry.direction === 'sent')
    .reduce((sum, entry) => sum + entry.amount, 0);
  const received = thisMonth
    .filter(entry => entry.direction === 'received')
    .reduce((sum, entry) => sum + entry.amount, 0);
  const fees = thisMonth.reduce((sum, entry) => sum + entry.fee, 0);

  const formAmount = parseInputNumber(amount);
  const formFee = fee ? parseInputNumber(fee) : 0;
  const canAdd = Boolean(
    person.trim() &&
      Number.isFinite(formAmount) &&
      formAmount > 0 &&
      Number.isFinite(formFee) &&
      formFee >= 0,
  );

  return (
    <Stack gap={space.lg}>
      <Row gap={space.sm}>
        <Stat label="Sent · month" value={peso(sent)} />
        <Stat label="Received · month" value={peso(received)} tone="positive" />
        <Stat label="Fees · month" value={peso(fees)} tone="negative" />
      </Row>

      <Button icon={<IconPlus size={16} color={t.onPrimary} />} onPress={() => setAdding(true)}>
        Log remittance
      </Button>

      {adding || editing ? (
        <Sheet eyebrow="Remit" title={editing ? 'Edit remittance' : 'Log remittance'} onClose={closeForm}>
          <Stack gap={space.md}>
            <Segmented
              label="Direction"
              value={direction}
              onChange={setDirection}
              options={[
                {value: 'sent', label: 'Sent'},
                {value: 'received', label: 'Received'},
              ]}
            />
            <Input required
              value={person}
              onChangeText={setPerson}
              placeholder={direction === 'sent' ? 'Recipient' : 'Sender'}
              accessibilityLabel="Person"
            />
            <ProviderPicker
              label="Channel"
              value={channel}
              onChange={setChannel}
              kinds={REMIT_PROVIDER_KINDS}
            />
            <Input min={0.01} required
              money
              value={amount}
              onChangeText={setAmount}
              placeholder="Amount"
              accessibilityLabel="Amount"
            />
            <Input min={0}
              money
              value={fee}
              onChangeText={setFee}
              placeholder="Fee (optional)"
              accessibilityLabel="Fee"
            />
            {host.wallet && !editing ? (
              <Switch
                checked={postToWallet}
                onChange={setPostToWallet}
                label="Also record in Wallet"
                description={
                  direction === 'sent'
                    ? 'Posts the amount plus fee as a Remittance expense.'
                    : 'Posts the amount as remittance income.'
                }
              />
            ) : null}
            <Button
              disabled={!canAdd}
              onPress={() => {
                const draft = {direction, person: person.trim(), channel, amount: formAmount, fee: formFee};
                if (editing) updateEntry(editing.id, draft);
                else {
                  addEntry(draft);
                  if (host.wallet && postToWallet) {
                    host.wallet.post(
                      direction === 'sent'
                        ? {
                            type: 'expense',
                            amount: formAmount + formFee,
                            description: `Remittance to ${draft.person}`,
                            category: 'remittance',
                          }
                        : {
                            type: 'income',
                            amount: formAmount,
                            description: `Remittance from ${draft.person}`,
                            category: 'remittance_income',
                          },
                    );
                  }
                }
                closeForm();
              }}>
              {editing ? 'Save changes' : 'Log remittance'}
            </Button>
          </Stack>
        </Sheet>
      ) : null}

      {entries.length === 0 ? (
        <EmptyState
          icon={<IconSend size={20} color={t.primary} />}
          title="No remittances logged"
          description="Keep a clean record of money sent and received — including what the fees cost you."
        />
      ) : (
        <Stack gap={space.sm}>
          {entries.map(entry => {
            const outgoing = entry.direction === 'sent';
            const tint = outgoing ? t.primary : t.positive;
            const RowIcon = outgoing ? IconSend : IconArrowDownLeft;
            return (
              <PressableCard
                key={entry.id}
                label={`Open actions for ${entry.person}`}
                onPress={() => setSelected(entry)}
                contentStyle={styles.row}>
                <View style={[styles.rowIcon, {backgroundColor: withAlpha(tint, 0.12)}]}>
                  <RowIcon size={16} color={tint} />
                </View>
                <View style={styles.flexMin}>
                  <Text style={[styles.title, {color: t.ink}]} numberOfLines={1}>
                    {outgoing ? 'To' : 'From'} {entry.person}
                  </Text>
                  {/* One text run, so the line wraps as prose. Laid out as
                      sibling views, "fee" could wrap away from its amount. */}
                  <Text style={[styles.meta, {color: t.muted}]}>
                    <PrivateText>{peso(entry.amount)}</PrivateText>
                    {` via ${getProvider(entry.channel)?.shortName ?? entry.channel}`}
                    {entry.fee > 0 ? (
                      <>
                        {' · fee '}
                        <PrivateText>{peso(entry.fee)}</PrivateText>
                      </>
                    ) : null}
                    {` · ${formatDate(entry.date)}`}
                  </Text>
                </View>
              </PressableCard>
            );
          })}
        </Stack>
      )}

      {selected ? (
        <ActionSheet
          title={`${selected.direction === 'sent' ? 'To' : 'From'} ${selected.person}`}
          description={`${peso(selected.amount)} via ${
            getProvider(selected.channel)?.shortName ?? selected.channel
          }`}
          onClose={() => setSelected(null)}
          items={[
            {
              label: 'Edit entry',
              description: 'Change the person, channel, amount, or fee',
              icon: <IconEdit size={20} color={t.primary} />,
              onSelect: () => {
                startEdit(selected);
                setSelected(null);
              },
            },
            {
              label: 'Delete entry',
              description: 'Remove this remittance record',
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
          title="Delete remittance entry?"
          description={`Remove the ${peso(deleting.amount)} record for “${deleting.person}”?`}
          confirmLabel="Delete"
          onClose={() => setDeleting(null)}
          onConfirm={() => {
            deleteEntry(deleting.id);
            setDeleting(null);
          }}
        />
      ) : null}

      <Text style={[styles.footer, {color: t.muted}]}>
        {host.online
          ? 'Stored on this device only.'
          : 'Offline — entries are stored on this device.'}
      </Text>
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
  title: {fontSize: 14, fontWeight: '500'},
  meta: {fontSize: 11, lineHeight: 16},
  footer: {fontSize: 11, textAlign: 'center'},
  flexMin: {flex: 1, minWidth: 0},
});
