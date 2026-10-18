import {useState} from 'react';
import {StyleSheet, Text} from 'react-native';
import {Button} from './button';
import {Input} from './field';
import {Row, Stack} from './primitives';
import {Sheet} from './overlay';
import {space, useTheme} from '../theme';

export const MIN_PASSPHRASE = 8;

/**
 * Ask for a backup passphrase. With `confirm`, the user types it twice — a
 * typo in a passphrase that seals a backup would lose the backup for good.
 */
export function PassphraseSheet({
  title,
  description,
  confirm = false,
  submitLabel = 'Continue',
  busy = false,
  error,
  onClose,
  onSubmit,
}: {
  title: string;
  description?: string;
  confirm?: boolean;
  submitLabel?: string;
  busy?: boolean;
  error?: string;
  onClose: () => void;
  onSubmit: (passphrase: string) => void;
}) {
  const t = useTheme();
  const [passphrase, setPassphrase] = useState('');
  const [repeat, setRepeat] = useState('');
  const longEnough = passphrase.length >= MIN_PASSPHRASE;
  const matches = !confirm || repeat === passphrase;
  const canSubmit = longEnough && matches && !busy;

  return (
    <Sheet eyebrow="Backup" title={title} description={description} onClose={onClose}>
      <Stack gap={space.md}>
        <Input
          value={passphrase}
          onChangeText={setPassphrase}
          placeholder={confirm ? `Passphrase (at least ${MIN_PASSPHRASE} characters)` : 'Passphrase'}
          accessibilityLabel="Passphrase"
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType={confirm ? 'next' : 'done'}
          onSubmitEditing={() => !confirm && canSubmit && onSubmit(passphrase)}
        />
        {confirm ? (
          <Input
            value={repeat}
            onChangeText={setRepeat}
            placeholder="Repeat the passphrase"
            accessibilityLabel="Repeat the passphrase"
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={() => canSubmit && onSubmit(passphrase)}
          />
        ) : null}
        {confirm && repeat && !matches ? (
          <Text style={[styles.note, {color: t.negative}]}>The two entries do not match.</Text>
        ) : null}
        {error ? <Text style={[styles.note, {color: t.negative}]}>{error}</Text> : null}
        {confirm ? (
          <Text style={[styles.note, {color: t.muted}]}>
            There is no way to recover a sealed backup without this passphrase.
          </Text>
        ) : null}
        <Row gap={space.md}>
          <Button variant="secondary" onPress={onClose} style={styles.flex1}>
            Cancel
          </Button>
          <Button disabled={!canSubmit} onPress={() => onSubmit(passphrase)} style={styles.flex1}>
            {busy ? 'Working…' : submitLabel}
          </Button>
        </Row>
      </Stack>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  note: {fontSize: 11, lineHeight: 16},
  flex1: {flex: 1},
});
