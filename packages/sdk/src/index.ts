/*
 * @jinnie/sdk — everything shared between the host shell and the mini apps.
 *
 * This package is a Module Federation singleton: the host and every federated
 * mini app resolve to one instance at runtime. That is what makes the Wallet
 * ledger, the privacy switch, and the host bridge the same objects everywhere.
 *
 * A mini app should import from '@jinnie/sdk' and nothing else. See docs/SDK.md.
 */

// Build-time: shared dependency map for the rspack configs.
export {SDK_VERSION, getSharedDependencies} from './sharedDeps';

// The bridge — the only way a mini app talks to the host.
export {HostProvider, useHost} from './bridge';
export type {HostBridge, HostFinance, HostWallet} from './bridge';
export {APPS_MANIFEST_VERSION, compareVersions, parseAppsManifest} from './manifest';
export type {MiniAppManifest, IconProps, IconName, Grant} from './manifest';

// Platform data.
export * from './stores';
export {setApps, useApps, getApp} from './apps';
export {financeActions} from './finance-actions';
export * from './analytics';
export * from './catalogs';
export * from './demo-data';
export * from './demo-manager';
export * from './backup';
export * from './app-lock';

// Storage, for the host's backup and reset flows.
export {
  STORAGE_PREFIX,
  allStorageKeys,
  readAllStorage,
  writeAllStorage,
  clearAllStorage,
  preferences,
  namespacedStorage,
} from './storage';

// Presentation.
export * from './theme';
export * from './utils';
export * from './ui';
export * as Icons from './icons';
export {getIcon} from './icons';
export {Illustration, ILLUSTRATION_IDS} from './illustrations';
export type {IllustrationId} from './illustrations';
export {
  IconArchive,
  IconArrowDownLeft,
  IconArrowUpRight,
  IconBank,
  IconBudget,
  IconCard,
  IconChart,
  IconCheck,
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconCircleGroup,
  IconClose,
  IconDownload,
  IconEdit,
  IconEye,
  IconEyeOff,
  IconFootprints,
  IconRepeat,
  IconUsers,
  IconGrid,
  IconHome,
  IconLogo,
  IconOffline,
  IconPlus,
  IconReceipt,
  IconScale,
  IconSearch,
  IconSend,
  IconSettings,
  IconShield,
  IconTarget,
  IconTransfer,
  IconTrash,
  IconUpload,
  IconWallet,
} from './icons';
export {formatInputNumber, parseInputNumber, isCalendarDate} from './input';
