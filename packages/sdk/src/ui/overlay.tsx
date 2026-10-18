import {createContext, useEffect, useMemo, useRef, useState, type ReactNode} from 'react';
import {
  Animated,
  Easing,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {radius, space, useTheme, withAlpha} from '../theme';
import {IconChevronLeft} from '../icons';
import {Button, IconButton} from './button';

/** The keyboard covers the navigation bar, so its inset is dead space while it is up. */
function useKeyboardShown(): boolean {
  const [shown, setShown] = useState(() => Keyboard.isVisible());
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setShown(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setShown(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return shown;
}

export interface SheetPage {
  title: string;
  description?: ReactNode;
  content: ReactNode;
}

/**
 * A sheet never opens a second sheet on top of itself. Anything inside one
 * that needs its own screen — a picker's option list — pushes a page: the
 * sheet's body slides to that content, a back arrow returns. One layer, one
 * scrim, and the form stays where the user left it.
 */
export const SheetPagesContext = createContext<{
  push: (page: SheetPage) => void;
  pop: () => void;
} | null>(null);

/**
 * Bottom sheet. Every form and picker in the product opens in one of these,
 * so the keyboard, the scrim, and the safe area are handled in exactly one
 * place.
 */
export function Sheet({
  eyebrow,
  title,
  description,
  onClose,
  children,
  style,
}: {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const keyboardShown = useKeyboardShown();

  const [page, setPage] = useState<SheetPage | null>(null);
  const pages = useMemo(() => ({push: setPage, pop: () => setPage(null)}), []);
  const back = page ? pages.pop : onClose;

  // The Modal fades (that is the scrim); only the panel rises. A native
  // "slide" would slide the scrim in from the bottom along with it.
  const rise = useRef(new Animated.Value(32)).current;
  useEffect(() => {
    Animated.timing(rise, {
      toValue: 0,
      duration: 240,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [rise]);

  // Page transitions: the body slides in from the side it came from.
  const slide = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    slide.setValue(page ? 40 : -40);
    Animated.timing(slide, {
      toValue: 0,
      duration: 200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [page, slide]);

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={back}
      statusBarTranslucent>
      <View style={styles.sheetRoot}>
        <Pressable
          style={[styles.scrim, {backgroundColor: t.scrim}]}
          onPress={back}
          accessibilityRole="button"
          accessibilityLabel={page ? `Back to ${title}` : `Close ${title}`}
        />
        {/* Both platforms: a translucent-status-bar Modal is never resized by
            the Android window manager, so the view has to make the room. */}
        <KeyboardAvoidingView behavior="padding" style={styles.sheetKeyboard}>
          <Animated.View
            accessibilityViewIsModal
            style={[
              styles.sheet,
              {
                backgroundColor: t.card,
                borderColor: t.line,
                paddingBottom: (keyboardShown ? 0 : insets.bottom) + space.lg,
                transform: [{translateY: rise}],
              },
              style,
            ]}>
            <View style={[styles.grabber, {backgroundColor: t.line}]} />
            {page ? (
              <View style={styles.pageHeader}>
                <IconButton
                  label={`Back to ${title}`}
                  icon={<IconChevronLeft size={18} color={t.muted} />}
                  onPress={pages.pop}
                  style={styles.pageBack}
                />
                <View style={styles.flexMin}>
                  <Text style={[styles.sheetTitle, {color: t.ink}]} numberOfLines={1}>
                    {page.title}
                  </Text>
                  {page.description !== undefined && page.description !== null ? (
                    <Text style={[styles.sheetDescription, {color: t.muted}]}>
                      {page.description}
                    </Text>
                  ) : null}
                </View>
              </View>
            ) : (
              <View style={styles.sheetHeader}>
                {eyebrow ? (
                  <Text style={[styles.eyebrow, {color: t.primary}]}>{eyebrow.toUpperCase()}</Text>
                ) : null}
                <Text style={[styles.sheetTitle, {color: t.ink}]}>{title}</Text>
                {description !== undefined && description !== null ? (
                  <Text style={[styles.sheetDescription, {color: t.muted}]}>{description}</Text>
                ) : null}
              </View>
            )}
            <SheetPagesContext.Provider value={pages}>
              <Animated.View style={[styles.sheetPage, {transform: [{translateX: slide}]}]}>
                <ScrollView
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.sheetBody}>
                  {page ? page.content : children}
                </ScrollView>
              </Animated.View>
            </SheetPagesContext.Provider>
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

export function Dialog({
  title,
  description,
  children,
  onClose,
}: {
  title: string;
  description?: ReactNode;
  children: ReactNode;
  onClose: () => void;
}) {
  const t = useTheme();
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView behavior="padding" style={styles.dialogRoot}>
        <Pressable
          style={[styles.scrim, {backgroundColor: t.scrim}]}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={`Close ${title}`}
        />
        <View
          accessibilityViewIsModal
          style={[styles.dialog, {backgroundColor: t.card, borderColor: t.line}]}>
          <Text style={[styles.dialogTitle, {color: t.ink}]}>{title}</Text>
          {description !== undefined && description !== null ? (
            <Text style={[styles.dialogDescription, {color: t.muted}]}>{description}</Text>
          ) : null}
          <View style={styles.dialogBody}>{children}</View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function ConfirmDialog({
  title,
  description,
  confirmLabel,
  tone = 'danger',
  onClose,
  onConfirm,
}: {
  title: string;
  description: ReactNode;
  confirmLabel: string;
  tone?: 'primary' | 'danger';
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog title={title} description={description} onClose={onClose}>
      <View style={styles.dialogActions}>
        <Button variant="secondary" onPress={onClose} style={styles.flex1}>
          Cancel
        </Button>
        <Button
          variant={tone === 'danger' ? 'danger' : 'primary'}
          onPress={onConfirm}
          style={styles.flex1}>
          {confirmLabel}
        </Button>
      </View>
    </Dialog>
  );
}

export interface ActionSheetItem {
  label: string;
  description?: string;
  icon?: ReactNode;
  tone?: 'neutral' | 'primary' | 'danger';
  disabled?: boolean;
  onSelect: () => void;
}

export function ActionSheet({
  title,
  description,
  items,
  onClose,
}: {
  title: string;
  description?: ReactNode;
  items: readonly ActionSheetItem[];
  onClose: () => void;
}) {
  const t = useTheme();

  return (
    <Sheet title={title} description={description} onClose={onClose}>
      <View style={styles.actionList}>
        {items.map(item => {
          const color =
            item.tone === 'danger' ? t.negative : item.tone === 'primary' ? t.primary : t.ink;
          const background =
            item.tone === 'danger'
              ? withAlpha(t.negative, 0.06)
              : item.tone === 'primary'
                ? withAlpha(t.primary, 0.06)
                : t.card;
          const border =
            item.tone === 'danger'
              ? withAlpha(t.negative, 0.24)
              : item.tone === 'primary'
                ? withAlpha(t.primary, 0.26)
                : t.line;

          return (
            <Pressable
              key={item.label}
              disabled={item.disabled}
              onPress={item.onSelect}
              accessibilityRole="button"
              accessibilityLabel={item.label}
              accessibilityHint={item.description}
              accessibilityState={{disabled: Boolean(item.disabled)}}
              style={({pressed}) => [
                styles.action,
                {backgroundColor: background, borderColor: border},
                pressed && styles.actionPressed,
                item.disabled && styles.disabled,
              ]}>
              {item.icon ? <View style={styles.actionIcon}>{item.icon}</View> : null}
              <View style={styles.flexMin}>
                <Text style={[styles.actionLabel, {color}]}>{item.label}</Text>
                {item.description ? (
                  <Text style={[styles.actionDescription, {color: t.muted}]}>
                    {item.description}
                  </Text>
                ) : null}
              </View>
            </Pressable>
          );
        })}
        <Button variant="secondary" onPress={onClose} style={styles.cancel}>
          Cancel
        </Button>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  // Written out rather than using StyleSheet.absoluteFill: that is a
  // registered style, not a plain object, and cannot be merged with a colour.
  scrim: {position: 'absolute', top: 0, right: 0, bottom: 0, left: 0},

  sheetRoot: {flex: 1, justifyContent: 'flex-end'},
  // The height cap lives here, where the parent is the window: a percentage on
  // the auto-height sheet resolves against its own content, and every sheet
  // ends up 12% short and scrolling.
  sheetKeyboard: {justifyContent: 'flex-end', maxHeight: '88%'},
  sheet: {
    flexShrink: 1,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: space.lg,
    paddingTop: space.md,
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: radius.pill,
    marginBottom: space.md,
  },
  sheetHeader: {marginBottom: space.lg},
  pageHeader: {flexDirection: 'row', alignItems: 'center', gap: space.xs, marginBottom: space.md},
  pageBack: {marginLeft: -space.sm},
  eyebrow: {fontSize: 10, fontWeight: '700', letterSpacing: 1.1, marginBottom: 3},
  sheetTitle: {fontSize: 18, fontWeight: '700', letterSpacing: -0.3},
  sheetDescription: {fontSize: 12, lineHeight: 17, marginTop: space.xs},
  sheetBody: {paddingBottom: space.xs, gap: space.md},
  // Shrinks with the sheet so the list inside still scrolls under the height cap.
  sheetPage: {flexShrink: 1},

  // Horizontal only: KeyboardAvoidingView owns paddingBottom while the keyboard is up.
  dialogRoot: {flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.lg},
  dialog: {
    width: '100%',
    maxWidth: 380,
    borderRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    padding: space.lg,
  },
  dialogTitle: {fontSize: 16, fontWeight: '700', letterSpacing: -0.2},
  dialogDescription: {fontSize: 12, lineHeight: 18, marginTop: 6},
  dialogBody: {marginTop: space.xl},
  dialogActions: {flexDirection: 'row', gap: space.md},

  actionList: {gap: space.sm},
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: 52,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.control,
    paddingHorizontal: 14,
    paddingVertical: space.md,
  },
  actionPressed: {opacity: 0.75},
  actionIcon: {flexShrink: 0},
  actionLabel: {fontSize: 14, fontWeight: '600'},
  actionDescription: {fontSize: 11, lineHeight: 16, marginTop: 2},
  cancel: {marginTop: space.sm},

  flex1: {flex: 1},
  flexMin: {flex: 1, minWidth: 0},
  disabled: {opacity: 0.4},
});
