import { ComboBox, Input, ListBox, ListBoxItem } from '@heroui/react';
import { ChevronDown } from 'lucide-react';

export interface ComboboxItem{
    id: string;
    label: string;
}

interface Props{
    items: ComboboxItem[];
    value: string | null;
    onChange: (id: string) => void;
    placeholder?: string;
    ariaLabel?: string;
    /** Overrides the input-group shell — e.g. a borderless variant for the header. */
    groupClassName?: string;
}

// A searchable dropdown: the full list shows on focus and narrows as the user types
// (react-aria's default case-insensitive "contains" match). The inner text input is
// stripped of its own border in index.css so only the group shell shows one.
const group = 'flex h-[38px] items-center gap-2 rounded-md border border-hairline bg-surface px-3 text-sm text-foreground transition-colors focus-within:border-accent';
const popover = 'z-50 max-h-64 w-[var(--trigger-width)] overflow-auto rounded-lg border border-hairline bg-surface p-1 shadow-xl';
const option = 'flex cursor-pointer select-none items-center rounded-md px-2.5 py-1.5 text-sm text-foreground outline-none transition-colors data-[focused]:bg-foreground/[0.06] data-[selected]:bg-foreground/[0.08]';

export const Combobox = ({ items, value, onChange, placeholder = 'Search…', ariaLabel, groupClassName = group }: Props) => (
    <ComboBox.Root
        // defaultItems is uncontrolled (react-aria owns filtering), so it ignores a list that
        // arrives after mount — e.g. CLIs fetched when the modal opens. Reseed by remounting
        // when the item set changes; the controlled selectedKey preserves the selection.
        key={items.map((entry) => entry.id).join('|')}
        aria-label={ariaLabel}
        selectedKey={value}
        onSelectionChange={(key) => { if(key !== null) onChange(String(key)); }}
        defaultItems={items}
        menuTrigger='focus'
        allowsEmptyCollection
    >
        <ComboBox.InputGroup className={groupClassName}>
            <Input className='min-w-0 flex-1 bg-transparent text-foreground outline-none placeholder:text-muted' placeholder={placeholder} />
            <ComboBox.Trigger className='grid size-5 shrink-0 place-items-center text-muted transition-colors hover:text-foreground'>
                <ChevronDown className='size-4' aria-hidden='true' />
            </ComboBox.Trigger>
        </ComboBox.InputGroup>
        <ComboBox.Popover className={popover}>
            <ListBox className='outline-none'>
                {(entry: ComboboxItem) => (
                    <ListBoxItem key={entry.id} id={entry.id} textValue={entry.label} className={option}>
                        {entry.label}
                    </ListBoxItem>
                )}
            </ListBox>
        </ComboBox.Popover>
    </ComboBox.Root>
);
