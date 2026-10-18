import {useEffect, useRef, useState} from 'react';
import * as DocumentPicker from 'expo-document-picker';
import {File} from 'expo-file-system';
import {
  BACKUP_PRODUCT,
  Button,
  Dialog,
  MAX_BACKUP_BYTES,
  appLock,
  PassphraseSheet,
  decryptBackup,
  parseBackupText,
  restoreBackup,
  type EncryptedBackupFile,
} from '@jinnie/sdk';

type Step =
  | {kind: 'picking'}
  | {kind: 'passphrase'; file: EncryptedBackupFile; error?: string; busy?: boolean}
  | {kind: 'error'; message: string};

/**
 * First-run restore: pick a backup file, unseal it if it is encrypted, and
 * replace the (empty) local records with it. Mounting opens the picker.
 */
export function RestoreBackup({onClose, onRestored}: {onClose: () => void; onRestored: () => void}) {
  const [step, setStep] = useState<Step>({kind: 'picking'});
  // The picker must open exactly once; the callbacks are read through a ref so
  // a parent re-render cannot re-run the effect and cancel the first result.
  const callbacks = useRef({onClose, onRestored});
  callbacks.current = {onClose, onRestored};

  useEffect(() => {
    let cancelled = false;
    const {onClose, onRestored} = callbacks.current;
    (async () => {
      try {
        appLock.expectExternalActivity();
        const result = await DocumentPicker.getDocumentAsync({
          type: ['application/json', 'text/plain', '*/*'],
          copyToCacheDirectory: true,
        });
        if (cancelled) return;
        if (result.canceled || !result.assets[0]) {
          onClose();
          return;
        }
        const asset = result.assets[0];
        if (asset.size && asset.size > MAX_BACKUP_BYTES) throw new Error('too large');
        const parsed = parseBackupText(await new File(asset.uri).text());
        if (!parsed) throw new Error('unsupported');
        if (parsed.kind === 'encrypted') {
          setStep({kind: 'passphrase', file: parsed.file});
          return;
        }
        if (await restoreBackup(parsed.backup)) onRestored();
        else throw new Error('write failed');
      } catch (error) {
        console.warn('Backup restore failed', error);
        if (!cancelled) {
          setStep({kind: 'error', message: `That file is not a ${BACKUP_PRODUCT} backup, or it could not be restored.`});
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (step.kind === 'passphrase') {
    return (
      <PassphraseSheet
        title="Unseal the backup"
        description="This backup was sealed with a passphrase when it was exported."
        submitLabel="Restore"
        busy={step.busy}
        error={step.error}
        onClose={onClose}
        onSubmit={async passphrase => {
          setStep({...step, busy: true, error: undefined});
          const backup = await decryptBackup(step.file, passphrase);
          if (!backup) {
            setStep({...step, busy: false, error: 'Wrong passphrase, or the file was altered.'});
            return;
          }
          if (await restoreBackup(backup)) onRestored();
          else setStep({kind: 'error', message: 'The backup could not be written to this device.'});
        }}
      />
    );
  }

  if (step.kind === 'error') {
    return (
      <Dialog title="Backup not restored" description={step.message} onClose={onClose}>
        <Button onPress={onClose}>Back to setup</Button>
      </Dialog>
    );
  }

  return null;
}
