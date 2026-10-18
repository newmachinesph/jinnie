import {useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {
  ActionSheet,
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  IconPlus,
  IconCheck,
  IconCircleGroup,
  IconEdit,
  IconTransfer,
  IconTrash,
  Input,
  parseInputNumber,
  PrivateText,
  Progress,
  Segmented,
  Sheet,
  Stack,
  Textarea,
  peso,
  space,
  useCirclesStore,
  useTheme,
  withAlpha,
  type Circle,
} from '@jinnie/sdk';

/*
 * Community app: a rotating savings group (paluwagan) manager.
 * Fully self-contained — no access to the shared Wallet, by design.
 */

export default function CirclesApp() {
  const t = useTheme();
  const [adding, setAdding] = useState(false);
  const circles = useCirclesStore(state => state.circles);
  const addCircle = useCirclesStore(state => state.addCircle);
  const advanceRound = useCirclesStore(state => state.advanceRound);
  const rewindRound = useCirclesStore(state => state.rewindRound);
  const updateCircle = useCirclesStore(state => state.updateCircle);
  const deleteCircle = useCirclesStore(state => state.deleteCircle);

  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [membersText, setMembersText] = useState('');
  const [frequency, setFrequency] = useState<'weekly' | 'monthly'>('monthly');
  const [selected, setSelected] = useState<Circle | null>(null);
  const [deleting, setDeleting] = useState<Circle | null>(null);
  const [editing, setEditing] = useState<Circle | null>(null);

  const closeForm = () => {
    setName('');
    setAmount('');
    setMembersText('');
    setAdding(false);
    setEditing(null);
  };

  const startEdit = (circle: Circle) => {
    setName(circle.name);
    setAmount(String(circle.amount));
    setMembersText(circle.members.join(', '));
    setFrequency(circle.frequency);
    setEditing(circle);
  };

  const memberNames = [
    ...new Set(
      membersText
        .split(/[,\n]/)
        .map(member => member.trim())
        .filter(Boolean),
    ),
  ];
  const formAmount = parseInputNumber(amount);
  const canCreate = Boolean(
    name.trim() && Number.isFinite(formAmount) && formAmount > 0 && memberNames.length >= 2,
  );

  return (
    <Stack gap={space.lg}>
      <Button icon={<IconPlus size={16} color={t.onPrimary} />} onPress={() => setAdding(true)}>
        Create group
      </Button>

      {adding || editing ? (
        <Sheet
          eyebrow="Circles"
          title={editing ? 'Edit savings group' : 'New savings group'}
          description={
            editing && editing.currentRound > 0
              ? `${editing.currentRound} ${editing.currentRound === 1 ? 'payout' : 'payouts'} already made — members before that point keep their turn`
              : undefined
          }
          onClose={closeForm}>
          <Stack gap={space.md}>
            <Input required
              value={name}
              onChangeText={setName}
              placeholder="Group name"
              accessibilityLabel="Group name"
            />
            <Input min={0.01} required
              money
              value={amount}
              onChangeText={setAmount}
              placeholder="Amount per round"
              accessibilityLabel="Contribution per member per round"
            />
            <Textarea
              value={membersText}
              onChangeText={setMembersText}
              placeholder="Members in payout order, separated by commas"
              accessibilityLabel="Members in payout order"
            />
            {membersText.trim() && memberNames.length < 2 ? (
              <Text style={[styles.note, {color: t.muted}]}>
                A group needs at least two distinct members.
              </Text>
            ) : null}
            <Segmented
              label="Frequency"
              value={frequency}
              onChange={setFrequency}
              options={[
                {value: 'weekly', label: 'Weekly'},
                {value: 'monthly', label: 'Monthly'},
              ]}
            />
            <Button
              disabled={!canCreate}
              onPress={() => {
                const draft = {name: name.trim(), amount: formAmount, members: memberNames, frequency};
                if (editing) updateCircle(editing.id, draft);
                else addCircle(draft);
                closeForm();
              }}>
              {editing ? 'Save changes' : 'Create group'}
            </Button>
          </Stack>
        </Sheet>
      ) : null}

      {circles.length === 0 ? (
        <EmptyState
          icon={<IconCircleGroup size={20} color={t.primary} />}
          title="No savings groups yet"
          description="Create a group, list members in payout order, and track every round to completion."
        />
      ) : (
        <Stack gap={space.md}>
          {circles.map(circle => {
            const pot = circle.amount * circle.members.length;
            const done = circle.currentRound >= circle.members.length;
            const recipient = done ? null : circle.members[circle.currentRound];

            return (
              <Card key={circle.id}>
                <Stack gap={space.md}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Open actions for ${circle.name}`}
                    onPress={() => setSelected(circle)}
                    style={styles.header}>
                    <View style={styles.flexMin}>
                      <View style={styles.titleRow}>
                        <Text style={[styles.name, {color: t.ink}]} numberOfLines={1}>
                          {circle.name}
                        </Text>
                        {done ? (
                          <Badge tone="positive">Completed</Badge>
                        ) : (
                          <Badge tone="accent">
                            {`Round ${circle.currentRound + 1} of ${circle.members.length}`}
                          </Badge>
                        )}
                      </View>
                      <Text style={[styles.meta, {color: t.muted}]}>
                        <PrivateText>{peso(circle.amount)}</PrivateText>
                        {` ${circle.frequency} · pot `}
                        <PrivateText>{peso(pot)}</PrivateText>
                        {` · ${circle.members.length} members`}
                      </Text>
                    </View>
                  </Pressable>

                  <Progress value={(circle.currentRound / circle.members.length) * 100} />

                  <View style={styles.members}>
                    {circle.members.map((member, index) => {
                      const paid = index < circle.currentRound;
                      const next = index === circle.currentRound && !done;
                      return (
                        <View
                          key={`${circle.id}-${index}`}
                          style={[
                            styles.member,
                            next && {backgroundColor: withAlpha(t.primary, 0.1)},
                          ]}>
                          <Text
                            style={[
                              styles.memberName,
                              {color: next ? t.primary : paid ? t.muted : t.ink},
                              paid && styles.paid,
                              next && styles.nextName,
                            ]}
                            numberOfLines={1}>
                            {index + 1}. {member}
                          </Text>
                          {paid ? <IconCheck size={14} color={t.muted} /> : null}
                          {next ? (
                            <Text style={[styles.nextLabel, {color: t.primary}]}>next payout</Text>
                          ) : null}
                        </View>
                      );
                    })}
                  </View>

                  {!done && recipient ? (
                    <Button variant="secondary" onPress={() => advanceRound(circle.id)}>
                      {`Confirm payout — ${recipient} receives ${peso(pot)}`}
                    </Button>
                  ) : null}
                </Stack>
              </Card>
            );
          })}
        </Stack>
      )}

      {selected ? (
        <ActionSheet
          title={selected.name}
          description={`${peso(selected.amount)} ${selected.frequency} · ${
            selected.members.length
          } members`}
          onClose={() => setSelected(null)}
          items={[
            {
              label: 'Edit savings group',
              description: 'Change the name, amount, members, or frequency',
              icon: <IconEdit size={20} color={t.primary} />,
              onSelect: () => {
                startEdit(selected);
                setSelected(null);
              },
            },
            ...(selected.currentRound > 0
              ? [
                  {
                    label: 'Undo last payout',
                    description: 'Return the group to its previous round',
                    icon: <IconTransfer size={20} color={t.muted} />,
                    onSelect: () => {
                      rewindRound(selected.id);
                      setSelected(null);
                    },
                  },
                ]
              : []),
            {
              label: 'Delete savings group',
              description: 'Remove the group, payout order, and round history',
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
          title="Delete savings group?"
          description={`Remove “${deleting.name}” and its payout history?`}
          confirmLabel="Delete"
          onClose={() => setDeleting(null)}
          onConfirm={() => {
            deleteCircle(deleting.id);
            setDeleting(null);
          }}
        />
      ) : null}
    </Stack>
  );
}

const styles = StyleSheet.create({
  header: {flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 44},
  titleRow: {flexDirection: 'row', alignItems: 'center', gap: 6},
  name: {fontSize: 14, fontWeight: '600', flexShrink: 1},
  meta: {fontSize: 11, lineHeight: 16},
  members: {gap: 3},
  member: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.sm,
    borderRadius: 3,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  memberName: {fontSize: 12, flexShrink: 1},
  nextName: {fontWeight: '600'},
  paid: {textDecorationLine: 'line-through'},
  nextLabel: {fontSize: 11, fontWeight: '600'},
  note: {fontSize: 11},
  flexMin: {flex: 1, minWidth: 0},
});
