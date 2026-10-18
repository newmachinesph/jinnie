import {useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {
  ActionSheet,
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  IconEdit,
  IconPlus,
  IconTarget,
  IconTrash,
  Input,
  isCalendarDate,
  parseInputNumber,
  PrivateText,
  Progress,
  Row,
  Sheet,
  Stack,
  formatDate,
  peso,
  space,
  useGoalsStore,
  useTheme,
  type Goal,
} from '@jinnie/sdk';

/** 52-week incremental challenge at 50-peso steps: 50 + 100 + … + 2,600. */
const CHALLENGE_TARGET = (50 * 52 * 53) / 2;

function ContributeSheet({goal, onClose, onSave}: {goal: Goal; onClose: () => void; onSave: (amount: number) => void}) {
  const [amount, setAmount] = useState('');
  const contribution = parseInputNumber(amount);
  const canSave = Number.isFinite(contribution) && contribution > 0;
  const remaining = goal.target - goal.saved;

  return (
    <Sheet
      eyebrow="Savings goal"
      title={`Add to ${goal.name}`}
      description={`${peso(remaining)} left to reach ${peso(goal.target)}`}
      onClose={onClose}>
      <Input min={0.01} required
        money
        value={amount}
        onChangeText={setAmount}
        placeholder="Amount"
        accessibilityLabel={`Contribution to ${goal.name}`}
        returnKeyType="done"
        onSubmitEditing={() => canSave && onSave(contribution)}
      />
      <Row gap={space.md}>
        <Button variant="secondary" onPress={onClose} style={styles.flex1}>
          Cancel
        </Button>
        <Button disabled={!canSave} onPress={() => onSave(contribution)} style={styles.flex1}>
          Save
        </Button>
      </Row>
    </Sheet>
  );
}

function GoalCard({goal, onEdit}: {goal: Goal; onEdit: (goal: Goal) => void}) {
  const t = useTheme();
  const contribute = useGoalsStore(state => state.contribute);
  const deleteGoal = useGoalsStore(state => state.deleteGoal);

  const [actionsOpen, setActionsOpen] = useState(false);
  const [contributing, setContributing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const pct = goal.target > 0 ? (goal.saved / goal.target) * 100 : 0;
  const done = goal.saved >= goal.target;

  return (
    <Card>
      <Stack gap={space.md}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Open actions for ${goal.name}`}
          onPress={() => setActionsOpen(true)}
          style={styles.header}>
          <View style={styles.flexMin}>
            <View style={styles.titleRow}>
              <Text style={[styles.name, {color: t.ink}]} numberOfLines={1}>
                {goal.name}
              </Text>
              {done ? <Badge tone="positive">Reached</Badge> : null}
            </View>
            <Text style={[styles.meta, {color: t.muted}]}>
              <PrivateText>{`${peso(goal.saved)} of ${peso(goal.target)}`}</PrivateText>
              {goal.deadline ? ` · by ${formatDate(`${goal.deadline}T12:00:00`)}` : ''}
            </Text>
          </View>
        </Pressable>

        <Progress value={pct} />
      </Stack>

      {actionsOpen ? (
        <ActionSheet
          title={goal.name}
          description={`${peso(goal.saved)} of ${peso(goal.target)} saved`}
          onClose={() => setActionsOpen(false)}
          items={[
            {
              label: 'Edit goal',
              description: 'Change the name, target, or deadline',
              icon: <IconEdit size={20} color={t.primary} />,
              onSelect: () => {
                setActionsOpen(false);
                onEdit(goal);
              },
            },
            ...(!done
              ? [
                  {
                    label: 'Add to savings',
                    description: `${peso(goal.target - goal.saved)} left to reach the target`,
                    icon: <IconPlus size={20} color={t.primary} />,
                    tone: 'primary' as const,
                    onSelect: () => {
                      setActionsOpen(false);
                      setContributing(true);
                    },
                  },
                ]
              : []),
            {
              label: 'Delete goal',
              description: 'Remove this goal and its saved progress',
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

      {contributing ? (
        <ContributeSheet
          goal={goal}
          onClose={() => setContributing(false)}
          onSave={amount => {
            contribute(goal.id, amount);
            setContributing(false);
          }}
        />
      ) : null}

      {confirmingDelete ? (
        <ConfirmDialog
          title="Delete goal?"
          description={`Remove “${goal.name}” and its ${peso(goal.saved)} saved progress?`}
          confirmLabel="Delete"
          onClose={() => setConfirmingDelete(false)}
          onConfirm={() => {
            deleteGoal(goal.id);
            setConfirmingDelete(false);
          }}
        />
      ) : null}
    </Card>
  );
}

export default function GoalsApp() {
  const t = useTheme();
  const [adding, setAdding] = useState(false);
  const goals = useGoalsStore(state => state.goals);
  const addGoal = useGoalsStore(state => state.addGoal);
  const updateGoal = useGoalsStore(state => state.updateGoal);
  const [editing, setEditing] = useState<Goal | null>(null);

  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [deadline, setDeadline] = useState('');

  const targetAmount = parseInputNumber(target);
  const validDeadline = !deadline || isCalendarDate(deadline);
  const canCreate = Boolean(
    name.trim() && Number.isFinite(targetAmount) && targetAmount > 0 && validDeadline,
  );

  const totalSaved = goals.reduce((sum, goal) => sum + goal.saved, 0);

  const closeForm = () => {
    setName('');
    setTarget('');
    setDeadline('');
    setAdding(false);
    setEditing(null);
  };

  const startEdit = (goal: Goal) => {
    setName(goal.name);
    setTarget(String(goal.target));
    setDeadline(goal.deadline ?? '');
    setEditing(goal);
  };

  return (
    <Stack gap={space.lg}>
      <Button icon={<IconPlus size={16} color={t.onPrimary} />} onPress={() => setAdding(true)}>
        Add goal
      </Button>

      {adding || editing ? (
        <Sheet eyebrow="Goals" title={editing ? 'Edit goal' : 'New goal'} onClose={closeForm}>
          <Stack gap={space.md}>
            <Input required
              value={name}
              onChangeText={setName}
              placeholder="Goal name (Emergency fund, tuition…)"
              accessibilityLabel="Goal name"
            />
            <Input min={0.01} required
              money
              value={target}
              onChangeText={setTarget}
              placeholder="Target amount"
              accessibilityLabel="Target amount"
            />
            <Input date
              value={deadline}
              onChangeText={setDeadline}
              placeholder="Deadline YYYY-MM-DD (optional)"
              accessibilityLabel="Deadline"
              autoCapitalize="none"
              keyboardType="numbers-and-punctuation"
            />
            {deadline && !validDeadline ? (
              <Text style={[styles.note, {color: t.negative}]}>
                Use the format YYYY-MM-DD, for example 2027-03-31.
              </Text>
            ) : null}
            <Button
              disabled={!canCreate}
              onPress={() => {
                const draft = {name: name.trim(), target: targetAmount, deadline: deadline || undefined};
                if (editing) updateGoal(editing.id, draft);
                else addGoal(draft);
                closeForm();
              }}>
              {editing ? 'Save changes' : 'Create goal'}
            </Button>
            {editing ? null : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Start the 52-week challenge"
              onPress={() => {
                addGoal({name: '52-Week Challenge', target: CHALLENGE_TARGET});
                setAdding(false);
              }}
              style={({pressed}) => [
                styles.challenge,
                {borderColor: t.line},
                pressed && {borderColor: t.primary},
              ]}>
              <Text style={[styles.challengeText, {color: t.muted}]}>
                Start the 52-Week Challenge — save {peso(CHALLENGE_TARGET)} in a year, ₱50 at a
                time
              </Text>
            </Pressable>
            )}
          </Stack>
        </Sheet>
      ) : null}

      {goals.length === 0 ? (
        <EmptyState
          icon={<IconTarget size={20} color={t.primary} />}
          title="No goals yet"
          description="Give every savings goal a number and a date — or start with the 52-Week Challenge."
        />
      ) : (
        <>
          <Text style={[styles.total, {color: t.muted}]}>
            Total saved across goals: <PrivateText>{peso(totalSaved)}</PrivateText>
          </Text>
          <Stack gap={space.md}>
            {goals.map(goal => (
              <GoalCard key={goal.id} goal={goal} onEdit={startEdit} />
            ))}
          </Stack>
        </>
      )}
    </Stack>
  );
}

const styles = StyleSheet.create({
  header: {flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 44},
  titleRow: {flexDirection: 'row', alignItems: 'center', gap: 6},
  name: {fontSize: 14, fontWeight: '600', flexShrink: 1},
  meta: {fontSize: 12},
  challenge: {
    borderWidth: StyleSheet.hairlineWidth,
    borderStyle: 'dashed',
    borderRadius: 4,
    paddingHorizontal: space.md,
    paddingVertical: 10,
    minHeight: 44,
    justifyContent: 'center',
  },
  challengeText: {fontSize: 12, lineHeight: 17},
  note: {fontSize: 11},
  total: {fontSize: 12, fontWeight: '500'},
  flex1: {flex: 1},
  flexMin: {flex: 1, minWidth: 0},
});
