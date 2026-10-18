import {useCallback, useEffect, useState, type ReactNode} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import {File, Paths} from 'expo-file-system';
import {
  ActionSheet,
  BACKUP_PRODUCT,
  BACKUP_VERSION,
  Badge,
  Button,
  Card,
  ConfirmDialog,
  IconDownload,
  IconOffline,
  IconShield,
  IconTrash,
  IconUpload,
  InlineAlert,
  Input,
  MAX_BACKUP_BYTES,
  PIN_LENGTH,
  PassphraseSheet,
  Row,
  SectionHeader,
  Sheet,
  Stack,
  Switch,
  allStorageKeys,
  appLock,
  clearAllStorage,
  createBackup,
  decryptBackup,
  encryptBackup,
  parseBackupText,
  preferences,
  resetAllStores,
  restoreBackup,
  space,
  validPin,
  useHost,
  usePrivacy,
  useTheme,
  type BackupFile,
  type EncryptedBackupFile,
} from '@jinnie/sdk';

/** Enter a PIN — twice when setting one, once to prove it before turning the lock off. */
function PinSheet({
  mode,
  onClose,
  onDone,
}: {
  mode: 'set' | 'verify';
  onClose: () => void;
  onDone: (pin: string) => Promise<string | null>;
}) {
  const t = useTheme();
  const [pin, setPin] = useState('');
  const [repeat, setRepeat] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const digits = (value: string) => value.replace(/\D/g, '').slice(0, PIN_LENGTH.max);
  const canSubmit = validPin(pin) && (mode === 'verify' || repeat === pin) && !busy;

  const submit = async () => {
    if (!canSubmit) return;
    setBusy(true);
    let failure: string | null;
    try {
      failure = await onDone(pin);
    } catch (caught) {
      failure = `Could not save the PIN: ${caught instanceof Error ? caught.message : String(caught)}`;
    }
    setBusy(false);
    if (failure) {
      setError(failure);
      setPin('');
      setRepeat('');
    }
  };

  return (
    <Sheet
      eyebrow="Device protection"
      title={mode === 'set' ? 'Choose a PIN' : 'Enter your PIN'}
      description={
        mode === 'set'
          ? `${PIN_LENGTH.min} to ${PIN_LENGTH.max} digits. Jinnie asks for it on launch and after a minute in the background.`
          : 'Confirm it is you before the lock is turned off.'
      }
      onClose={onClose}>
      <Stack gap={space.md}>
        <Input
          value={pin}
          onChangeText={next => {
            setPin(digits(next));
            setError('');
          }}
          placeholder="PIN"
          accessibilityLabel="PIN"
          keyboardType="number-pad"
          secureTextEntry
          returnKeyType={mode === 'set' ? 'next' : 'done'}
          onSubmitEditing={() => mode === 'verify' && void submit()}
        />
        {mode === 'set' ? (
          <Input
            value={repeat}
            onChangeText={next => setRepeat(digits(next))}
            placeholder="Repeat the PIN"
            accessibilityLabel="Repeat the PIN"
            keyboardType="number-pad"
            secureTextEntry
            returnKeyType="done"
            onSubmitEditing={() => void submit()}
          />
        ) : null}
        {mode === 'set' && repeat && repeat !== pin ? (
          <Text style={[styles.rowDescription, {color: t.negative}]}>The two entries do not match.</Text>
        ) : null}
        {error ? <Text style={[styles.rowDescription, {color: t.negative}]}>{error}</Text> : null}
        <Row gap={space.md}>
          <Button variant="secondary" onPress={onClose} style={styles.flex1}>
            Cancel
          </Button>
          <Button disabled={!canSubmit} onPress={() => void submit()} style={styles.flex1}>
            {mode === 'set' ? 'Turn on lock' : 'Turn off lock'}
          </Button>
        </Row>
      </Stack>
    </Sheet>
  );
}

/**
 * The app lock. The PIN lives in the device keystore as a salted hash, so it
 * is neither in a backup nor readable by any mini app.
 */
function DeviceProtectionCard() {
  const [enabled, setEnabled] = useState(false);
  const [biometricOn, setBiometricOn] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [sheet, setSheet] = useState<'set' | 'verify' | null>(null);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([appLock.isEnabled(), appLock.isBiometricEnabled(), appLock.biometricAvailable()]).then(
      ([on, bio, available]) => {
        if (cancelled) return;
        setEnabled(on);
        setBiometricOn(bio);
        setBiometricAvailable(available);
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Card>
      <SectionHeader
        title="Device protection"
        description="Lock Jinnie behind a PIN, with your fingerprint or face as a shortcut."
      />
      <View style={styles.rows}>
        <View style={styles.firstRow}>
          <Switch
            checked={enabled}
            onChange={next => setSheet(next ? 'set' : 'verify')}
            label="Require a PIN"
            description={
              enabled
                ? 'Asked on launch and after a minute in the background.'
                : 'Anyone holding the phone can open Jinnie right now.'
            }
          />
        </View>
        {biometricAvailable ? (
          <Switch
            checked={enabled && biometricOn}
            onChange={next => {
              setBiometricOn(next);
              void appLock.setBiometricEnabled(next);
            }}
            label="Fingerprint or face"
            description={
              enabled
                ? "Use the device's own unlock instead of typing the PIN."
                : 'Turn on the PIN first. The PIN stays as the fallback.'
            }
            disabled={!enabled}
          />
        ) : null}
      </View>

      {sheet ? (
        <PinSheet
          mode={sheet}
          onClose={() => setSheet(null)}
          onDone={async pin => {
            if (sheet === 'set') {
              await appLock.setPin(pin);
              setEnabled(true);
              setSheet(null);
              return null;
            }
            if (!(await appLock.verifyPin(pin))) return 'That PIN is not right.';
            await appLock.clear();
            setEnabled(false);
            setBiometricOn(false);
            setSheet(null);
            return null;
          }}
        />
      ) : null}
    </Card>
  );
}

function InfoRow({
  label,
  description,
  value,
  first,
}: {
  label: string;
  description: string;
  value: ReactNode;
  /** The divider belongs between rows, not under the card's own heading. */
  first?: boolean;
}) {
  const t = useTheme();
  return (
    <View
      style={[styles.row, !first && {borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.line}]}>
      <View style={styles.flexMin}>
        <Text style={[styles.rowLabel, {color: t.ink}]}>{label}</Text>
        <Text style={[styles.rowDescription, {color: t.muted}]}>{description}</Text>
      </View>
      <View style={styles.rowValue}>{value}</View>
    </View>
  );
}

/**
 * Privacy, the app lock, and the records themselves: the controls that
 * protect what Jinnie holds. General settings live in the shell's gear.
 */
export default function SecurityApp() {
  const t = useTheme();
  const host = useHost();
  const {valuesHidden, toggleValues} = usePrivacy();

  const [storedItems, setStoredItems] = useState(0);
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [pendingRestore, setPendingRestore] = useState<BackupFile | null>(null);
  const [exportMenu, setExportMenu] = useState(false);
  const [sealing, setSealing] = useState(false);
  const [sealBusy, setSealBusy] = useState(false);
  const [unsealing, setUnsealing] = useState<{file: EncryptedBackupFile; error?: string; busy?: boolean} | null>(null);
  const [dataError, setDataError] = useState('');
  const [notice, setNotice] = useState('');

  const refreshCount = useCallback(async () => {
    setStoredItems((await allStorageKeys()).length);
  }, []);

  useEffect(() => {
    void refreshCount();
  }, [refreshCount]);

  const exportBackup = async (passphrase?: string) => {
    setDataError('');
    setNotice('');
    const started = Date.now();
    try {
      const backup = await createBackup();
      setSealBusy(true);
      const payload = passphrase ? await encryptBackup(backup, passphrase) : backup;
      const sealedIn = Math.round((Date.now() - started) / 1000);
      setSealBusy(false);
      const stamp = new Date().toISOString().slice(0, 10);
      const file = new File(Paths.cache, `jinnie-backup-${stamp}${passphrase ? '-sealed' : ''}.json`);
      if (file.exists) file.delete();
      file.create();
      file.write(JSON.stringify(payload, null, 2));
      setSealing(false);

      if (await Sharing.isAvailableAsync()) {
        appLock.expectExternalActivity();
        await Sharing.shareAsync(file.uri, {
          mimeType: 'application/json',
          dialogTitle: 'Save your Jinnie backup',
          UTI: 'public.json',
        });
      } else {
        setNotice(`Backup written to ${file.uri}`);
      }
      if (passphrase) setNotice(`Sealed backup ready (took ${sealedIn}s to seal).`);
    } catch {
      setSealBusy(false);
      setSealing(false);
      setDataError('The backup could not be written. Check available storage and try again.');
    }
  };

  const chooseBackup = async () => {
    setDataError('');
    setNotice('');
    try {
      appLock.expectExternalActivity();
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/json', 'text/plain', '*/*'],
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;

      const asset = result.assets[0];
      if (!asset) return;
      if (asset.size !== undefined && asset.size !== null && asset.size > MAX_BACKUP_BYTES) {
        throw new Error('Backup too large');
      }

      const parsed = parseBackupText(await new File(asset.uri).text());
      if (!parsed) throw new Error('Unsupported backup');
      if (parsed.kind === 'encrypted') setUnsealing({file: parsed.file});
      else setPendingRestore(parsed.backup);
    } catch {
      setPendingRestore(null);
      setDataError(
        `That file is not a valid ${BACKUP_PRODUCT} v${BACKUP_VERSION} backup. Your current data was not changed.`,
      );
    }
  };

  const applyRestore = async () => {
    if (!pendingRestore) return;
    const ok = await restoreBackup(pendingRestore);
    setPendingRestore(null);
    if (ok) {
      setNotice('Backup restored.');
      await refreshCount();
    } else {
      setDataError(
        'The backup could not be restored. Your previous local records were kept where possible.',
      );
    }
  };

  const clearLocalData = async () => {
    setConfirmingClear(false);
    try {
      await resetAllStores();
      await clearAllStorage();
      await preferences.set('demo.state', 'removed');
      setNotice('All local records were deleted.');
      await refreshCount();
    } catch {
      setDataError('Some local records could not be deleted. Try again.');
    }
  };

  return (
    <Stack gap={space.lg}>
      <InlineAlert
        tone="success"
        title="Your finance data stays on this device"
        description="Community apps receive isolated storage and cannot read Accounts or Wallet history."
        action={<IconOffline size={20} color={t.positive} />}
      />

      <Card>
        <SectionHeader title="Privacy" description="Control what is visible around other people." />
        <View style={styles.rows}>
          <View style={styles.firstRow}>
            <Switch
              checked={valuesHidden}
              onChange={next => {
                if (next !== valuesHidden) toggleValues();
              }}
              label="Hide financial values"
              description="Replace balances and amounts with dots across every app."
            />
          </View>
          <InfoRow
            label="Community app access"
            description="Goals, Debts, Circles, Remit, and Shared use separate app storage."
            value={<Badge tone="positive">Isolated</Badge>}
          />
        </View>
      </Card>

      <DeviceProtectionCard />

      <Card>
        <SectionHeader title="Protection" description="What this installation provides." />
        <View style={styles.rows}>
          <InfoRow
            label="Connection"
            description="Core records remain available when the network is unavailable."
            value={
              <Badge tone={host.online ? 'positive' : 'warning'}>
                {host.online ? 'Online' : 'Offline'}
              </Badge>
            }
            first
          />
          <InfoRow
            label="Device storage"
            description="Records are held in this app's private sandbox on the device."
            value={<Badge tone="positive">App-private</Badge>}
          />
        </View>
      </Card>

      <Card>
        <SectionHeader
          title="Your data"
          description="Create a portable copy, restore one, or start clean."
        />
        <View style={styles.rows}>
          <InfoRow
            label="Local app records"
            description="Accounts, activity, app preferences, and community data."
            value={<Badge>{`${storedItems} stores`}</Badge>}
            first
          />
        </View>

        {dataError ? (
          <InlineAlert
            style={styles.spaced}
            tone="danger"
            title="Data action could not be completed"
            description={dataError}
          />
        ) : null}
        {notice ? (
          <InlineAlert style={styles.spaced} tone="success" title={notice} />
        ) : null}

        <Stack gap={space.sm} style={styles.spaced}>
          <Button
            variant="secondary"
            icon={<IconDownload size={16} color={t.ink} />}
            onPress={() => setExportMenu(true)}>
            Export backup
          </Button>
          <Button
            variant="secondary"
            icon={<IconUpload size={16} color={t.ink} />}
            onPress={() => void chooseBackup()}>
            Restore backup
          </Button>
          <Button
            variant="danger"
            icon={<IconTrash size={16} color={t.negative} />}
            onPress={() => setConfirmingClear(true)}>
            Delete local data
          </Button>
        </Stack>
      </Card>

      {confirmingClear ? (
        <ConfirmDialog
          title="Delete all local data?"
          description="This removes Accounts, Wallet history, budgets, bills, preferences, and every community app record from this device. Export a backup first if you may need them later."
          confirmLabel="Delete everything"
          onClose={() => setConfirmingClear(false)}
          onConfirm={() => void clearLocalData()}
        />
      ) : null}

      {pendingRestore ? (
        <ConfirmDialog
          title="Restore this backup?"
          description={`This will replace ${storedItems} current stores with ${
            Object.keys(pendingRestore.data).length
          } stores${
            pendingRestore.exportedAt
              ? ` saved on ${new Date(pendingRestore.exportedAt).toLocaleDateString()}`
              : ''
          }. This cannot be undone unless you export the current data first.`}
          confirmLabel="Restore backup"
          tone="primary"
          onClose={() => setPendingRestore(null)}
          onConfirm={() => void applyRestore()}
        />
      ) : null}

      {exportMenu ? (
        <ActionSheet
          title="Export backup"
          description="A JSON file with every local record. Keep it somewhere you control."
          onClose={() => setExportMenu(false)}
          items={[
            {
              label: 'Sealed with a passphrase',
              description: 'Encrypted on this device; nothing readable without the passphrase',
              icon: <IconShield size={20} color={t.primary} />,
              tone: 'primary' as const,
              onSelect: () => {
                setExportMenu(false);
                setSealing(true);
              },
            },
            {
              label: 'Plain file',
              description: 'Readable by anyone who has the file',
              icon: <IconDownload size={20} color={t.muted} />,
              onSelect: () => {
                setExportMenu(false);
                void exportBackup();
              },
            },
          ]}
        />
      ) : null}

      {sealing ? (
        <PassphraseSheet
          title="Seal the backup"
          description="The file can only be opened again with this passphrase."
          confirm
          submitLabel="Export"
          busy={sealBusy}
          onClose={() => setSealing(false)}
          onSubmit={passphrase => void exportBackup(passphrase)}
        />
      ) : null}

      {unsealing ? (
        <PassphraseSheet
          title="Unseal the backup"
          description="This backup was sealed with a passphrase when it was exported."
          submitLabel="Continue"
          busy={unsealing.busy}
          error={unsealing.error}
          onClose={() => setUnsealing(null)}
          onSubmit={async passphrase => {
            setUnsealing({...unsealing, busy: true, error: undefined});
            const backup = await decryptBackup(unsealing.file, passphrase);
            if (!backup) {
              setUnsealing({...unsealing, busy: false, error: 'Wrong passphrase, or the file was altered.'});
              return;
            }
            setUnsealing(null);
            setPendingRestore(backup);
          }}
        />
      ) : null}
    </Stack>
  );
}

const styles = StyleSheet.create({
  rows: {marginTop: space.sm},
  firstRow: {paddingVertical: space.sm},
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.lg,
    minHeight: 44,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  rowLabel: {fontSize: 14, fontWeight: '500'},
  rowDescription: {fontSize: 11, lineHeight: 16, marginTop: 2},
  rowValue: {flexShrink: 0},
  spaced: {marginTop: space.md},
  flexMin: {flex: 1, minWidth: 0},
  flex1: {flex: 1},
});
