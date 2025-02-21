import { useDeferredValue, useRef, useState } from 'react';
import { NavSchema } from 'types';
import { useEvent } from 'util/useEvent';
import {
  keepDomain,
  keepFunction,
  keepSequence,
  previewDomain,
  previewFunction,
  previewSchemaInfo,
  previewSequence,
  previewTable,
  extraTableTab,
  keepSchemaInfo,
} from 'state/actions';
import { equals } from 'util/equals';
import { useEventListener } from 'util/useEventListener';
import { Entity, useDeferredValueFix } from './Nav';
import { NavSearchCore } from './NavSearchCore';
import { Tabs } from './navUtils';

export function NavSearch({
  schemas,
  tabs,
  onBlur,
  disabled,
  onDone = () => {},
}: {
  schemas: NavSchema[];
  tabs: Tabs;
  onBlur: (e: 'next' | 'prev' | 'up' | 'down') => void;
  disabled?: boolean;
  onDone?: () => void;
}) {
  const [focusedEntity, setFocusedEntity] = useState<Entity | null>(null);
  const [index, setIndex] = useState(0);
  const [len, setLen] = useState(0);
  const [searchText, setSearchText] = useState('');
  const [focus, setFocus] = useState(false);
  const search = (useDeferredValue as useDeferredValueFix<string>)(searchText, {
    timeoutMs: 300,
  });
  const onSearchFocusChange = useEvent((s: Entity | null) => {
    if (disabled) return;
    setFocusedEntity(s);
  });
  const onChange = useEvent((e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    if (index !== 0) setIndex(0);
    setSearchText(e.target.value);
  });
  const lastKeyUp = useRef({
    key: null as string | null,
    time: 0,
    entity: null as Entity | null,
  });
  const contentRef = useRef<HTMLDivElement>(null);
  useEventListener(document.body, 'keydown', (e: KeyboardEvent) => {
    if (disabled) return;
    if (e.key === 'Tab' && e.ctrlKey) return;
    if (
      e.key &&
      e.key !== ' ' &&
      (document.activeElement === document.body ||
        (document.activeElement instanceof HTMLDivElement &&
          document.activeElement.matches('.nav-tree'))) &&
      e.key.length === 1 &&
      !(e.ctrlKey || e.altKey || e.metaKey)
    ) {
      const input = document.querySelector('.nav-search__field input');
      if (input instanceof HTMLInputElement) {
        setSearchText('');
        input.focus();
      }
    }
  });
  const onKeyUp = useEvent((e: React.KeyboardEvent<unknown>) => {
    if (disabled) return;
    if (e.key === 'Tab' && e.ctrlKey) return;
    const doubleHit =
      lastKeyUp.current.key === e.key &&
      Date.now() - lastKeyUp.current.time < 300 &&
      equals(lastKeyUp.current.entity, focusedEntity);
    lastKeyUp.current.key = e.key;
    lastKeyUp.current.time = Date.now();
    lastKeyUp.current.entity = focusedEntity;
    const input = e.target instanceof HTMLInputElement;
    const { key } = e;
    if (
      doubleHit &&
      focusedEntity &&
      (key === 'Enter' || (!input && (key === ' ' || key === 'Espace')))
    ) {
      if (focusedEntity.type === 'SCHEMA') {
        keepSchemaInfo(focusedEntity.name);
        onDone();
      } else if (
        focusedEntity.type === 'BASE TABLE' ||
        focusedEntity.type === 'MATERIALIZED VIEW' ||
        focusedEntity.type === 'VIEW'
      ) {
        extraTableTab(focusedEntity.schema, focusedEntity.name);
        onDone();
      } else if (focusedEntity.type === 'DOMAIN') {
        keepDomain(focusedEntity.schema, focusedEntity.name);
        onDone();
      } else if (focusedEntity.type === 'FUNCTION') {
        keepFunction(focusedEntity.schema, focusedEntity.name);
        onDone();
      } else if (focusedEntity.type === 'SEQUENCE') {
        keepSequence(focusedEntity.schema, focusedEntity.name);
        onDone();
      }
    }
  });

  const onKeyDown = useEvent((e: React.KeyboardEvent<unknown>) => {
    if (disabled) return;
    if (e.key === 'Tab' && e.ctrlKey) return;
    const strongHit = e.shiftKey || e.altKey || e.ctrlKey || e.metaKey;
    const isInput = e.target instanceof HTMLInputElement;
    if (e.key === 'Escape') {
      const ae = document.activeElement;
      if (ae instanceof HTMLElement) {
        setSearchText('');
        ae.blur();
      }
    } else if (e.key === 'Tab') {
      if (e.shiftKey) {
        const i = document.querySelector('.nav-search__field input');
        if (i instanceof HTMLInputElement) i.focus();
      } else onBlur('next');
      e.preventDefault();
      e.stopPropagation();
    } else if (e.key === 'ArrowUp') {
      if (index > 0) {
        setIndex(index - 1);
      } else if (!(e.target instanceof HTMLInputElement)) {
        const i = document.querySelector('.nav-search__field input');
        if (i instanceof HTMLInputElement) i.focus();
      }
      e.preventDefault();
      e.stopPropagation();
    } else if (e.key === 'ArrowDown') {
      if (index < len - 1) {
        setIndex(index + 1);
      }
      e.preventDefault();
      e.stopPropagation();
    } else if (
      e.key === 'Enter' ||
      ((e.key === ' ' || e.key === 'Espace') && !isInput)
    ) {
      if (focusedEntity) {
        if (focusedEntity.type === 'SCHEMA') {
          if (strongHit) keepSchemaInfo(focusedEntity.name);
          else previewSchemaInfo(focusedEntity.name);
          onDone();
        } else if (
          focusedEntity.type === 'BASE TABLE' ||
          focusedEntity.type === 'MATERIALIZED VIEW' ||
          focusedEntity.type === 'VIEW'
        ) {
          if (strongHit)
            extraTableTab(focusedEntity.schema, focusedEntity.name);
          else
            previewTable(focusedEntity.schema, {
              type: focusedEntity.type,
              name: focusedEntity.name,
            });
          onDone();
        } else if (focusedEntity.type === 'DOMAIN') {
          if (strongHit) keepDomain(focusedEntity.schema, focusedEntity.name);
          else previewDomain(focusedEntity.schema, focusedEntity.name);
          onDone();
        } else if (focusedEntity.type === 'FUNCTION') {
          if (strongHit) keepFunction(focusedEntity.schema, focusedEntity.name);
          else previewFunction(focusedEntity.schema, focusedEntity.name);
          onDone();
        } else if (focusedEntity.type === 'SEQUENCE') {
          if (strongHit) keepSequence(focusedEntity.schema, focusedEntity.name);
          else previewSequence(focusedEntity.schema, focusedEntity.name);
          onDone();
        }
      }
    } else if (
      !isInput &&
      e.key !== ' ' &&
      e.key !== 'Espace' &&
      (e.key.length <= 1 || e.key === 'Backspace' || e.key === 'Delete')
    ) {
      const input = document.querySelector('.nav-search__field input');
      if (input instanceof HTMLInputElement) {
        input.focus();
      }
    }
  });

  const onInputKeyDown = useEvent(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (disabled) return;
      if (e.key === 'Tab' && e.ctrlKey) return;
      if (e.target instanceof HTMLInputElement && !e.target.value) {
        // if (e.key === 'ArrowUp') onBlur('up');
        // else
        if (e.key === 'ArrowDown') onBlur('down');
      }
      if (e.key === 'Escape') {
        setSearchText('');
        (e.target as HTMLInputElement).blur();
      }
      if (e.key === 'Tab') {
        if (e.shiftKey) onBlur('prev');
        else onBlur('next');
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      const el = e.target as HTMLInputElement;
      if (
        el.selectionStart === el.selectionEnd &&
        // el.selectionEnd === el.value.length &&
        (e.key === 'ArrowUp' ||
          e.key === 'ArrowDown' ||
          e.key === 'Enter' ||
          e.key === 'Tab')
      ) {
        onKeyDown(e);
      }
    },
  );
  const onInputFocus = useEvent(() => {
    if (disabled) return;
    setFocus(true);
  });
  const onInputBlur = useEvent(() => {
    if (disabled) return;
    setFocus(false);
  });
  const onCloseClick = useEvent(() => {
    if (disabled) return;
    setSearchText('');
  });
  const onLengthChange = useEvent((l: number) => {
    if (disabled) return;
    setLen(l);
  });
  const onMouseDown = useEvent((i: number) => {
    if (disabled) return;
    setIndex(i);
  });
  const onDivBlur = useEvent(() => {
    if (disabled) return;
    setFocus(false);
  });
  const onDivFocus = useEvent(() => {
    if (disabled) return;
    setFocus(true);
  });

  return (
    <>
      <div className={`nav-search__field ${focus ? 'focus' : ''}`}>
        <input
          type="text"
          onChange={onChange}
          onKeyDown={onInputKeyDown}
          value={searchText}
          onFocus={onInputFocus}
          onBlur={onInputBlur}
          onKeyUp={onKeyUp}
          disabled={disabled}
        />
        {searchText ? (
          <i className="fa fa-close" onClick={onCloseClick} tabIndex={0} />
        ) : (
          <i className="fa fa-search" />
        )}
      </div>
      <div
        tabIndex={disabled ? -1 : 0}
        onKeyDown={onKeyDown}
        style={{ outline: 'none' }}
        onKeyUp={onKeyUp}
        onFocus={onDivFocus}
        onBlur={onDivBlur}
        ref={contentRef}
      >
        <NavSearchCore
          onMouseDown={onMouseDown}
          search={search}
          schemas={schemas}
          tabs={tabs}
          onLengthChange={onLengthChange}
          onFocusChange={onSearchFocusChange}
          index={!focus ? undefined : index >= len && len ? len - 1 : index}
        />
      </div>
    </>
  );
}
