import { assert } from 'util/assert';
import React from 'react';
import { NavSchema } from 'types';
import { Entity } from './Nav';
import { NavItem } from './NavItem';
import { height304, useNavSearch } from './navSearchUtils';
import { Tabs } from './navUtils';

export const NavSearchCore = React.memo(
  ({
    search,
    schemas,
    tabs,
    onLengthChange,
    index,
    onFocusChange,
    onMouseDown,
  }: {
    search: string | null;
    schemas: NavSchema[];
    tabs: Tabs;
    onLengthChange: (l: number) => void;
    index: number | undefined;
    onFocusChange: (m: Entity | null) => void;
    onMouseDown: (i: number) => void;
  }) => {
    const { matches, onScroll, showAll, setShowAll } = useNavSearch(
      search,
      schemas,
      onLengthChange,
      index,
      onFocusChange,
    );

    // if (focus && !search) {
    //   return (
    //     <div
    //       className="nav-search__result"
    //       ref={height120}
    //       style={{
    //         display: 'flex',
    //         alignItems: 'center',
    //         overflow: 'hidden',
    //         marginBottom: -1,
    //       }}
    //     >
    //       <i className="fa fa-search" />
    //     </div>
    //   );
    // }

    if (!search) return null;
    assert(matches);
    const { active } = tabs;
    return (
      <div className="nav-search__result" onScroll={onScroll} ref={height304}>
        {matches
          .filter(
            (_, i) => i <= 80 || showAll || (index !== undefined && index > 80),
          )
          .map((m, i) => {
            if (i === 80 && !showAll)
              return (
                <div
                  className="nav-search__more"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onClick={() => setShowAll(true)}
                >
                  <i className="fa fa-ellipsis-h" />
                </div>
              );
            const { entity } = m;
            return (
              <NavItem
                key={`${m.entity.type}\n${m.entity.schema || ''}\n${
                  m.entity.name || ''
                }`}
                entity={m.entity}
                isActive={
                  (active &&
                    ((entity.type === 'SCHEMA' &&
                      active.props.type === 'schemainfo' &&
                      entity.name === active.props.schema) ||
                      ((active.props.type === 'table' ||
                        active.props.type === 'tableinfo') &&
                        active.props.schema === entity.schema &&
                        active.props.table === entity.name) ||
                      (active.props.type === 'function' &&
                        active.props.schema === entity.schema &&
                        active.props.name === entity.name) ||
                      (active.props.type === 'domain' &&
                        active.props.schema === entity.schema &&
                        active.props.name === entity.name) ||
                      (active.props.type === 'sequence' &&
                        active.props.schema === entity.schema &&
                        active.props.name === entity.name))) ??
                  false
                }
                isOpen={
                  (entity.type === 'SCHEMA' &&
                    tabs.open.schemaInfo(entity.name)) ||
                  ((entity.type === 'BASE TABLE' ||
                    entity.type === 'MATERIALIZED VIEW' ||
                    entity.type === 'VIEW') &&
                    tabs.open.table(entity.schema, entity.name)) ||
                  ((entity.type === 'FUNCTION' ||
                    entity.type === 'PROCEDURE') &&
                    tabs.open.function(entity.schema, entity.name)) ||
                  (entity.type === 'DOMAIN' &&
                    tabs.open.domain(entity.schema, entity.name)) ||
                  (entity.type === 'SEQUENCE' &&
                    tabs.open.sequence(entity.schema, entity.name))
                }
                focus={index === i}
                index={i}
                onMouseDown={onMouseDown}
              >
                {m.node}
              </NavItem>
            );
          })}
      </div>
    );
  },
  (a, b) =>
    a.schemas === b.schemas &&
    a.search === b.search &&
    a.tabs === b.tabs &&
    a.onLengthChange === b.onLengthChange &&
    a.onFocusChange === b.onFocusChange &&
    a.onMouseDown === b.onMouseDown &&
    a.index === b.index,
);
