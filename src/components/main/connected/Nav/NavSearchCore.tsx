import { assert } from 'util/assert';
import React, { useEffect, useMemo, useState } from 'react';
import { NavSchema, Tab } from 'types';
import { equals } from 'util/equals';
import { useEvent } from 'util/useEvent';
import { Entity } from './Nav';
import { NavItem } from './NavItem';

function buildEntitites(schemas: NavSchema[]) {
  const entities = [] as Entity[];
  for (const s of schemas) {
    entities.push({
      name: s.name,
      type: 'SCHEMA',
      fullText: s.name,
      fullTextLowerCase: s.name.toLowerCase(),
      nameLowerCase: s.name.toLowerCase(),
    });
  }
  for (const s of schemas) {
    for (const t of s.tables) {
      entities.push({
        name: t.name,
        nameLowerCase: t.name.toLowerCase(),
        schema: s.name,
        type: t.type,
        fullText: `${s.name}.${t.name}`,
        fullTextLowerCase: `${s.name.toLowerCase()}.${t.name.toLowerCase()}`,
      });
    }
  }
  for (const s of schemas) {
    for (const g of [s.domains, s.sequences, s.functions]) {
      for (const t of g) {
        entities.push({
          name: t.name,
          schema: s.name,
          type: t.type,
          nameLowerCase: t.name.toLowerCase(),
          fullText: `${s.name}.${t.name}`,
          fullTextLowerCase: `${s.name.toLowerCase()}.${t.name.toLowerCase()}`,
        });
      }
    }
  }
  return entities;
}

type Matcher = {
  match(s: string): boolean;
  mark(s: string): React.ReactNode;
  type: 'name' | 'fulltext';
};

function buildMatchers(search: string) {
  const regex = new RegExp(
    `.*?${search
      .split('')
      .map((ch) => ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .join('.*?')}`,
    'g',
  );
  const startWith = {
    match(s: string) {
      return s.startsWith(search);
    },
    mark(s: string) {
      return (
        <>
          <mark>{s.substring(0, search.length)}</mark>
          {s.substring(search.length)}
        </>
      );
    },
  };
  return [
    {
      ...startWith,
      type: 'fulltext',
    },
    {
      ...startWith,
      type: 'name',
    },
    {
      match(s: string) {
        return s.indexOf(search) >= 0;
      },
      mark(s: string) {
        const i = s.indexOf(search);
        return (
          <>
            {s.substring(0, i)}
            <mark>{s.substring(i, i + search.length)}</mark>
            {s.substring(i + search.length)}
          </>
        );
      },
      type: 'fulltext',
    },
    {
      match(s: string) {
        return s.match(regex) !== null;
      },
      mark(s: string) {
        const render = [] as React.ReactNode[];
        let searchI = 0;
        let i = 0;
        while (i < s.length) {
          const ch = s[i];
          if (search[searchI] === ch) {
            let searchI2 = 1;
            while (
              search[searchI + searchI2] &&
              s[i + searchI2] &&
              search[searchI + searchI2] === s[i + searchI2]
            )
              searchI2 += 1;
            searchI += searchI2;
            render.push(<mark key={i}>{s.substring(i, i + searchI2)}</mark>);
            i += searchI2;
          } else {
            let gapI = 1;
            while (i + gapI < s.length && search[searchI] !== s[i + gapI])
              gapI += 1;
            render.push(s.substring(i, i + gapI));
            i += gapI;
          }
        }
        return render;
      },
      type: 'fulltext',
    },
  ] as Matcher[];
}

export type Match = {
  node: React.ReactNode;
  entity: Entity;
};

function buildMatches(
  entities: Entity[],
  matchers: Matcher[],
  lowerCaseMode: boolean,
  limit: number,
  set = new Set<Entity>(),
) {
  const r = [] as Match[];
  const es = [...entities];
  for (const m of matchers) {
    let c = 0;
    while (c < es.length) {
      const e = es[c];
      if (
        (!set.has(e) &&
          m.type === 'fulltext' &&
          ((lowerCaseMode && m.match(e.fullTextLowerCase)) ||
            (!lowerCaseMode && m.match(e.fullText)))) ||
        (!set.has(e) &&
          m.type === 'name' &&
          ((lowerCaseMode && m.match(e.nameLowerCase)) ||
            (!lowerCaseMode && m.match(e.name))))
      ) {
        es.splice(c, 1);
        set.add(e);
        r.push({
          entity: e,
          node:
            m.type === 'fulltext' ? (
              m.mark(e.fullText)
            ) : (
              <>
                {e.schema}.{m.mark(e.name)}
              </>
            ),
        });
        if (r.length >= limit) {
          return r;
        }
      } else {
        c += 1;
      }
    }
  }
  return r;
}

export const NavSearchCore = React.memo(
  ({
    search,
    schemas,
    focus,
    tabs,
    onLengthChange,
    index,
    onFocusChange,
    onMouseDown,
  }: {
    focus: boolean;
    search: string | null;
    schemas: NavSchema[];
    tabs: Tab[];
    onLengthChange: (l: number) => void;
    index: number | undefined;
    onFocusChange: (m: Entity | null) => void;
    onMouseDown: (i: number) => void;
  }) => {
    const [scroll, setScroll] = useState(0);
    const [showAll, setShowAll] = useState(false);
    const entities = useMemo(() => buildEntitites(schemas), [schemas]);
    const matchers = useMemo(
      () => (search ? buildMatchers(search) : null),
      [search],
    );
    const limit = showAll ? Infinity : scroll ? 81 : 40;
    const matches = useMemo(
      () =>
        matchers
          ? buildMatches(
              entities,
              matchers,
              search === search?.toLowerCase(),
              limit,
            )
          : null,
      [entities, matchers, search, limit],
    );
    useEffect(() => {
      if (search) {
        setShowAll(false);
      }
    }, [setShowAll, search]);
    const onScroll = useEvent((e: React.UIEvent<HTMLDivElement>) => {
      setScroll((e.target as HTMLDivElement).scrollTop);
    });
    const len = matches ? matches.length : 0;
    useEffect(() => {
      onLengthChange(len);
    }, [len, onLengthChange]);
    const f = matches && index !== undefined ? matches[index]?.entity : null;
    useEffect(() => {
      onFocusChange(f);
    }, [f, onFocusChange]);

    const height304 = useEvent((el: HTMLDivElement | null) => {
      if (el) {
        setTimeout(() => {
          el.style.height = '304px';
        }, 1);
      }
    });
    const height120 = useEvent((el: HTMLDivElement | null) => {
      if (el) {
        setTimeout(() => {
          el.style.height = '120px';
        }, 1);
      }
    });

    if (focus && !search) {
      return (
        <div
          className="nav-search"
          ref={height120}
          style={{ display: 'flex', alignItems: 'center', overflow: 'hidden' }}
        >
          <i className="fa fa-search" />
        </div>
      );
    }

    if (!search) return null;
    assert(matches);
    return (
      <div className="nav-search" onScroll={onScroll} ref={height304}>
        {matches
          .filter(
            (_, i) => i <= 80 || showAll || (index !== undefined && index > 80),
          )
          .map((m: Match, i) =>
            i === 80 && !showAll ? (
              <div className="more" onClick={() => setShowAll(true)}>
                <i className="fa fa-ellipsis-h" />
              </div>
            ) : (
              <NavItem
                key={`${m.entity.type}\n${m.entity.schema || ''}\n${
                  m.entity.name || ''
                }`}
                entity={m.entity}
                tabs={tabs}
                focus={index === i}
                index={i}
                onMouseDown={onMouseDown}
              >
                {m.node}
              </NavItem>
            ),
          )}
      </div>
    );
  },
  (a, b) =>
    a.schemas === b.schemas &&
    a.search === b.search &&
    a.focus === b.focus &&
    equals(a.tabs, b.tabs) &&
    a.onLengthChange === b.onLengthChange &&
    a.onFocusChange === b.onFocusChange &&
    a.onMouseDown === b.onMouseDown &&
    a.index === b.index,
);
