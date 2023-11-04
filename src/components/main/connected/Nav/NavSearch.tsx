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
  keepOpenTable,
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
}: {
  schemas: NavSchema[];
  tabs: Tabs;
  onBlur: (e: 'next' | 'prev' | 'up' | 'down') => void;
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
    setFocusedEntity(s);
  });
  const onChange = useEvent((e: React.ChangeEvent<HTMLInputElement>) => {
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
      const input = document.querySelector('.nav--search input');
      if (input instanceof HTMLInputElement) {
        setSearchText('');
        input.focus();
      }
    }
  });
  const onKeyUp = useEvent((e: React.KeyboardEvent<unknown>) => {
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
      if (focusedEntity.type === 'SCHEMA') keepSchemaInfo(focusedEntity.name);
      else if (
        focusedEntity.type === 'BASE TABLE' ||
        focusedEntity.type === 'MATERIALIZED VIEW' ||
        focusedEntity.type === 'VIEW'
      ) {
        keepOpenTable(focusedEntity.schema, {
          type: focusedEntity.type,
          name: focusedEntity.name,
        });
      } else if (focusedEntity.type === 'DOMAIN') {
        keepDomain(focusedEntity.schema, focusedEntity.name);
      } else if (focusedEntity.type === 'FUNCTION') {
        keepFunction(focusedEntity.schema, focusedEntity.name);
      } else if (focusedEntity.type === 'SEQUENCE') {
        keepSequence(focusedEntity.schema, focusedEntity.name);
      }
    }
  });

  const onKeyDown = useEvent((e: React.KeyboardEvent<unknown>) => {
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
        const i = document.querySelector('.nav--search input');
        if (i instanceof HTMLInputElement) i.focus();
      } else onBlur('next');
      e.preventDefault();
      e.stopPropagation();
    } else if (e.key === 'ArrowUp') {
      if (index > 0) {
        setIndex(index - 1);
      } else if (!(e.target instanceof HTMLInputElement)) {
        const i = document.querySelector('.nav--search input');
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
        } else if (
          focusedEntity.type === 'BASE TABLE' ||
          focusedEntity.type === 'MATERIALIZED VIEW' ||
          focusedEntity.type === 'VIEW'
        ) {
          if (strongHit)
            keepOpenTable(focusedEntity.schema, {
              type: focusedEntity.type,
              name: focusedEntity.name,
            });
          else
            previewTable(focusedEntity.schema, {
              type: focusedEntity.type,
              name: focusedEntity.name,
            });
        } else if (focusedEntity.type === 'DOMAIN') {
          if (strongHit) keepDomain(focusedEntity.schema, focusedEntity.name);
          else previewDomain(focusedEntity.schema, focusedEntity.name);
        } else if (focusedEntity.type === 'FUNCTION') {
          if (strongHit) keepFunction(focusedEntity.schema, focusedEntity.name);
          else previewFunction(focusedEntity.schema, focusedEntity.name);
        } else if (focusedEntity.type === 'SEQUENCE') {
          if (strongHit) keepSequence(focusedEntity.schema, focusedEntity.name);
          else previewSequence(focusedEntity.schema, focusedEntity.name);
        }
      }
    } else if (
      !isInput &&
      e.key !== ' ' &&
      e.key !== 'Espace' &&
      (e.key.length <= 1 || e.key === 'Backspace' || e.key === 'Delete')
    ) {
      const input = document.querySelector('.nav--search input');
      if (input instanceof HTMLInputElement) {
        input.focus();
      }
    }
  });
  const onInputKeyDown = useEvent(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
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
    setFocus(true);
  });
  const onInputBlur = useEvent(() => {
    setFocus(false);
  });
  const onCloseClick = useEvent(() => {
    setSearchText('');
  });
  const onLengthChange = useEvent((l: number) => {
    setLen(l);
  });
  const onMouseDown = useEvent((i: number) => {
    setIndex(i);
  });
  const onDivBlur = useEvent(() => {
    setFocus(false);
  });
  const onDivFocus = useEvent(() => {
    setFocus(true);
  });

  return (
    <>
      <div className={`nav--search ${focus ? 'focus' : ''}`}>
        <input
          type="text"
          onChange={onChange}
          onKeyDown={onInputKeyDown}
          value={searchText}
          onFocus={onInputFocus}
          onBlur={onInputBlur}
          onKeyUp={onKeyUp}
        />
        {searchText ? (
          <i className="fa fa-close" onClick={onCloseClick} />
        ) : (
          <i className="fa fa-search" />
        )}
      </div>
      <div
        tabIndex={0}
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
