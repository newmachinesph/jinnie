import {useState, type ReactNode} from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import {radius, space, useTheme} from '../theme';
import {IconClose, IconSearch} from '../icons';
import {formatInputNumber, numericEdit, parseInputNumber, isCalendarDate} from '../input';

export function Label({children, style}: {children: ReactNode; style?: StyleProp<TextStyle>}) {
  const t = useTheme();
  return <Text style={[styles.label, {color: t.muted}, style]}>{children}</Text>;
}

export type InputProps = Omit<TextInputProps, 'style'> & {
  style?: StyleProp<TextStyle>;
  /** Numeric money field: decimal keypad and a right-aligned value. */
  money?: boolean;
  decimals?: number;
  signed?: boolean;
  min?: number;
  max?: number;
  required?: boolean;
  date?: boolean;
  digits?: number;
};

export function Input({style, money, decimals = 2, signed, min, max, required, date, digits, ...props}: InputProps) {
  const t = useTheme();
  const [focused, setFocused] = useState(false);
  const [touched, setTouched] = useState(false);
  const [rejected, setRejected] = useState('');
  const numeric = money || props.keyboardType === 'number-pad' || props.keyboardType === 'decimal-pad';
  const integer = !money && props.keyboardType === 'number-pad';
  const raw = props.value ?? props.defaultValue ?? '';
  const parsed = parseInputNumber(raw);
  const error = rejected || (touched ? (
    required && !raw.trim() ? 'This field is required.' :
    date && raw && !isCalendarDate(raw) ? 'Enter a real date as YYYY-MM-DD.' :
    digits && raw && !new RegExp(`^\\d{${digits}}$`).test(raw) ? `Enter exactly ${digits} digits.` :
    numeric && raw && !Number.isFinite(parsed) ? 'Enter a valid number below 1 trillion.' :
    numeric && raw && min !== undefined && parsed < min ? `Enter ${formatInputNumber(String(min))} or more.` :
    numeric && raw && max !== undefined && parsed > max ? `Enter ${formatInputNumber(String(max))} or less.` : ''
  ) : '');
  return (
    <>
    <TextInput
      {...props}
      value={props.value === undefined ? undefined : money ? formatInputNumber(raw) : raw}
      defaultValue={props.defaultValue === undefined ? undefined : money ? formatInputNumber(props.defaultValue) : props.defaultValue}
      maxLength={props.maxLength ?? (date ? 10 : digits ?? (numeric ? 24 : props.secureTextEntry ? undefined : props.multiline ? 1000 : 128))}
      onChangeText={text => {
        if (numeric) {
          // Existing separators may move while typing; validate the raw edit.
          const next = numericEdit(text.replace(/,/g, ''), {decimals, signed, integer});
          if (next === null) {
            setRejected(integer ? 'Use digits only.' : `Use ${signed ? 'a signed number' : 'a non-negative number'} with up to ${decimals} decimal places.`);
            return;
          }
          setRejected('');
          props.onChangeText?.(next);
        } else if (date && !/^[\d-]*$/.test(text)) {
          setRejected('Use YYYY-MM-DD.');
        } else {
          setRejected('');
          props.onChangeText?.(props.secureTextEntry ? text : text.replace(props.multiline ? /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g : /[\x00-\x1f\x7f]/g, ''));
        }
      }}
      keyboardType={props.keyboardType ?? (money ? 'decimal-pad' : undefined)}
      placeholderTextColor={t.muted}
      onFocus={event => {
        setFocused(true);
        props.onFocus?.(event);
      }}
      onBlur={event => {
        setFocused(false);
        setTouched(true);
        props.onBlur?.(event);
      }}
      style={[
        styles.control,
        {
          backgroundColor: t.card,
          borderColor: error ? t.negative : focused ? t.primary : t.line,
          color: t.ink,
        },
        money && styles.moneyInput,
        style,
      ]}
    />
    {error ? <Text accessibilityRole="alert" style={{color: t.negative, fontSize: 12, marginTop: 4}}>{error}</Text> : null}
    </>
  );
}

export function Textarea({style, ...props}: InputProps) {
  return (
    <Input
      {...props}
      multiline
      numberOfLines={props.numberOfLines ?? 3}
      textAlignVertical="top"
      style={[styles.textarea, style]}
    />
  );
}

// -- Switch ------------------------------------------------------------

export function Switch({
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}) {
  const t = useTheme();
  return (
    <View style={[styles.switchRow, disabled && styles.disabled]}>
      <View style={styles.flexMin}>
        <Text style={[styles.switchLabel, {color: t.ink}]}>{label}</Text>
        {description ? (
          <Text style={[styles.switchDescription, {color: t.muted}]}>{description}</Text>
        ) : null}
      </View>
      <Pressable
        accessibilityRole="switch"
        accessibilityState={{checked, disabled: Boolean(disabled)}}
        accessibilityLabel={label}
        accessibilityHint={description}
        disabled={disabled}
        onPress={() => onChange(!checked)}
        hitSlop={8}
        style={styles.switchTarget}>
        <View
          style={[
            styles.switchTrack,
            {backgroundColor: checked ? t.primary : t.line, borderColor: checked ? t.primary : t.line},
          ]}>
          <View
            style={[
              styles.switchThumb,
              {backgroundColor: checked ? t.onPrimary : t.card},
              checked && styles.switchThumbOn,
            ]}
          />
        </View>
      </Pressable>
    </View>
  );
}

// -- Segmented ---------------------------------------------------------

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  style,
}: {
  options: readonly {value: T; label: string}[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  style?: StyleProp<ViewStyle>;
}) {
  const t = useTheme();
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={[styles.segmented, {backgroundColor: t.line}, style]}>
      {options.map(option => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{checked: active}}
            accessibilityLabel={option.label}
            onPress={() => onChange(option.value)}
            style={[styles.segment, active && {backgroundColor: t.card}]}>
            <Text
              numberOfLines={1}
              style={[styles.segmentLabel, {color: active ? t.ink : t.muted}]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// -- Search ------------------------------------------------------------

export function SearchInput({
  value,
  onChange,
  label = 'Search',
  placeholder = 'Search',
}: {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
}) {
  const t = useTheme();
  return (
    <View style={styles.searchWrap}>
      <View style={styles.searchIcon} pointerEvents="none">
        <IconSearch size={16} color={t.muted} />
      </View>
      <Input
        value={value}
        onChangeText={onChange}
        accessibilityLabel={label}
        placeholder={placeholder}
        style={styles.searchInput}
        returnKeyType="search"
      />
      {value.length > 0 ? (
        <Pressable
          onPress={() => onChange('')}
          accessibilityRole="button"
          accessibilityLabel={`Clear ${label.toLowerCase()}`}
          style={styles.searchClear}>
          <IconClose size={16} color={t.muted} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {fontSize: 12, fontWeight: '500'},
  control: {
    minHeight: 44,
    borderRadius: radius.control,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: space.md,
    paddingVertical: 10,
    fontSize: 15,
  },
  moneyInput: {textAlign: 'right'},
  textarea: {minHeight: 76, paddingTop: 10},

  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.lg,
    minHeight: 44,
    // Stacked switches share no separator, so the row itself keeps a
    // description clear of the next label.
    paddingVertical: space.xs,
  },
  switchLabel: {fontSize: 14, fontWeight: '500'},
  switchDescription: {fontSize: 11, lineHeight: 16, marginTop: 3},
  switchTarget: {
    width: 48,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  switchTrack: {
    width: 44,
    height: 26,
    borderRadius: radius.control,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
  },
  switchThumb: {
    width: 18,
    height: 18,
    borderRadius: 3,
    marginLeft: 3,
  },
  switchThumbOn: {marginLeft: 23},

  segmented: {
    flexDirection: 'row',
    borderRadius: radius.control,
    padding: 3,
    gap: 3,
  },
  segment: {
    flex: 1,
    minHeight: 38,
    borderRadius: 3,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.sm,
  },
  segmentLabel: {fontSize: 12, fontWeight: '600'},

  searchWrap: {justifyContent: 'center'},
  searchInput: {paddingLeft: 36, paddingRight: 44},
  searchIcon: {position: 'absolute', left: space.md, zIndex: 1},
  searchClear: {
    position: 'absolute',
    right: 0,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },

  flexMin: {flex: 1, minWidth: 0},
  disabled: {opacity: 0.5},
});
