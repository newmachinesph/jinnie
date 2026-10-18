import {useContext, useMemo, useState, type ReactNode} from 'react';
import {Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle} from 'react-native';
import {radius, space, useTheme, withAlpha} from '../theme';
import {IconCheck, IconChevronDown, IconPlus} from '../icons';
import {Sheet, SheetPagesContext} from './overlay';
import {Button} from './button';
import {Input, SearchInput} from './field';

export interface SelectOption {
  value: string;
  label: string;
  /** Optional group heading. Options are rendered in first-seen group order. */
  group?: string;
  /** Secondary line under the label. */
  hint?: string;
  /** Leading mark — a category glyph or an institution logo. */
  icon?: ReactNode;
}

type SelectProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  /**
   * When the list can grow: asked for a name, returns the new option's id (or
   * '' to reject). The new id is selected at once and the list closes.
   */
  onCreate?: (label: string) => string;
  createLabel?: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * The platform's one dropdown.
 *
 * There is no native `<select>` here, and a picker wheel hides long option
 * lists behind scrolling. So a Select is a field that opens the option list
 * in the standard sheet — as a page of the sheet it already sits in, so a
 * form never stacks a second sheet on top of itself — with search once the
 * list is long enough to need it.
 */
export function Select({
  label,
  value,
  onChange,
  options,
  placeholder = 'Select',
  disabled,
  onCreate,
  createLabel = 'Add',
  style,
}: SelectProps) {
  const t = useTheme();
  const pages = useContext(SheetPagesContext);
  const [open, setOpen] = useState(false);

  const selected = options.find(option => option.value === value);

  const pick = (next: string) => {
    onChange(next);
    if (pages) pages.pop();
    else setOpen(false);
  };

  const page = (
    <SelectList
      label={label}
      value={value}
      options={options}
      onPick={pick}
      onCreate={onCreate}
      createLabel={createLabel}
    />
  );

  return (
    <>
      <Pressable
        disabled={disabled}
        onPress={() => (pages ? pages.push({title: label, content: page}) : setOpen(true))}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityValue={{text: selected?.label ?? placeholder}}
        accessibilityState={{disabled: Boolean(disabled)}}
        style={({pressed}) => [
          styles.field,
          {backgroundColor: t.card, borderColor: t.line},
          pressed && {borderColor: t.primary},
          disabled && styles.disabled,
          style,
        ]}>
        {selected?.icon ? <View style={styles.fieldIcon}>{selected.icon}</View> : null}
        <Text
          numberOfLines={1}
          style={[styles.fieldText, {color: selected ? t.ink : t.muted}]}>
          {selected?.label ?? placeholder}
        </Text>
        <IconChevronDown size={16} color={t.muted} />
      </Pressable>

      {open && !pages ? (
        <Sheet title={label} onClose={() => setOpen(false)}>
          {page}
        </Sheet>
      ) : null}
    </>
  );
}

/** The option list itself: search, grouped rows, and the inline "add new" step. */
function SelectList({
  label,
  value,
  options,
  onPick,
  onCreate,
  createLabel,
}: {
  label: string;
  value: string;
  options: readonly SelectOption[];
  onPick: (value: string) => void;
  onCreate?: (label: string) => string;
  createLabel: string;
}) {
  const t = useTheme();
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState('');

  const searchable = options.length > 12;

  const groups = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    const matching = normalized
      ? options.filter(option =>
          `${option.label} ${option.hint ?? ''} ${option.group ?? ''}`
            .toLocaleLowerCase()
            .includes(normalized),
        )
      : options;

    const ordered: {name: string | undefined; items: SelectOption[]}[] = [];
    for (const option of matching) {
      const existing = ordered.find(entry => entry.name === option.group);
      if (existing) existing.items.push(option);
      else ordered.push({name: option.group, items: [option]});
    }
    return ordered;
  }, [options, query]);

  const canCreate = draft.trim().length > 0;
  const create = () => {
    if (!onCreate || !canCreate) return;
    const id = onCreate(draft);
    if (id) onPick(id);
  };

  if (creating) {
    return (
      <View style={styles.createStep}>
        <Text style={[styles.createTitle, {color: t.ink}]}>
          {createLabel} {label.toLowerCase()}
        </Text>
        <Text style={[styles.createHint, {color: t.muted}]}>
          Saved to this device and offered here from now on.
        </Text>
        <Input
          value={draft}
          onChangeText={setDraft}
          placeholder="Name"
          accessibilityLabel={`New ${label.toLowerCase()} name`}
          autoCapitalize="words"
          maxLength={40}
          returnKeyType="done"
          onSubmitEditing={create}
        />
        <View style={styles.createActions}>
          <Button variant="secondary" onPress={() => setCreating(false)} style={styles.flex1}>
            Back
          </Button>
          <Button disabled={!canCreate} onPress={create} style={styles.flex1}>
            Save
          </Button>
        </View>
      </View>
    );
  }

  return (
    <>
      {searchable ? (
        <SearchInput
          value={query}
          onChange={setQuery}
          label={`Search ${label.toLowerCase()}`}
          placeholder={`Search ${label.toLowerCase()}`}
        />
      ) : null}

      {groups.length === 0 ? (
        <Text style={[styles.noResults, {color: t.muted}]}>
          Nothing matches “{query.trim()}”.
        </Text>
      ) : (
        groups.map(group => (
          <View key={group.name ?? '_'} style={styles.group}>
            {group.name ? (
              <Text style={[styles.groupLabel, {color: t.muted}]}>
                {group.name.toUpperCase()}
              </Text>
            ) : null}
            {group.items.map(option => {
              const active = option.value === value;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => onPick(option.value)}
                  accessibilityRole="button"
                  accessibilityState={{selected: active}}
                  accessibilityLabel={option.label}
                  style={({pressed}) => [
                    styles.option,
                    {borderColor: t.line},
                    active && {backgroundColor: withAlpha(t.primary, 0.08)},
                    pressed && {backgroundColor: t.surface},
                  ]}>
                  {option.icon ? <View style={styles.optionIcon}>{option.icon}</View> : null}
                  <View style={styles.flexMin}>
                    <Text
                      numberOfLines={1}
                      style={[styles.optionLabel, {color: active ? t.primary : t.ink}]}>
                      {option.label}
                    </Text>
                    {option.hint ? (
                      <Text
                        numberOfLines={1}
                        style={[styles.optionHint, {color: t.muted}]}>
                        {option.hint}
                      </Text>
                    ) : null}
                  </View>
                  {active ? <IconCheck size={16} color={t.primary} /> : null}
                </Pressable>
              );
            })}
          </View>
        ))
      )}

      {onCreate ? (
        <Pressable
          onPress={() => {
            setDraft(query.trim());
            setCreating(true);
          }}
          accessibilityRole="button"
          accessibilityLabel={`${createLabel} ${label.toLowerCase()}`}
          style={({pressed}) => [
            styles.option,
            styles.create,
            {borderColor: withAlpha(t.primary, 0.32)},
            pressed && {backgroundColor: withAlpha(t.primary, 0.08)},
          ]}>
          <IconPlus size={16} color={t.primary} />
          <Text style={[styles.optionLabel, {color: t.primary}]}>
            {query.trim() ? `Add “${query.trim()}”` : `${createLabel} new…`}
          </Text>
        </Pressable>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  field: {
    minHeight: 44,
    borderRadius: radius.control,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: space.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.sm,
  },
  fieldText: {fontSize: 15, flex: 1, minWidth: 0},
  fieldIcon: {flexShrink: 0},
  disabled: {opacity: 0.5},

  group: {gap: 2},
  groupLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.9,
    marginTop: space.sm,
    marginBottom: space.xs,
  },
  option: {
    minHeight: 48,
    borderRadius: radius.control,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: space.md,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  optionIcon: {flexShrink: 0},
  optionLabel: {fontSize: 14, fontWeight: '500'},
  optionHint: {fontSize: 11, marginTop: 1},
  noResults: {fontSize: 12, textAlign: 'center', paddingVertical: space.xl},
  create: {borderStyle: 'dashed', marginTop: space.sm},

  createStep: {gap: space.md},
  createTitle: {fontSize: 16, fontWeight: '700', letterSpacing: -0.2},
  createHint: {fontSize: 12, lineHeight: 17, marginTop: -space.sm},
  createActions: {flexDirection: 'row', gap: space.md},

  flex1: {flex: 1},
  flexMin: {flex: 1, minWidth: 0},
});
