/* eslint-disable no-return-assign */
import { db } from 'db/db';
import * as React from 'react';
import { useContext, useEffect } from 'react';
import { AppState, FrameType } from 'types';
import { assert } from 'util/assert';
import { fullScreen } from 'util/fullScreen';
import { useShortcuts } from 'util/shortcuts';
import { useEvent } from 'util/useEvent';
import { useWindowCloseConfirm } from 'util/useWindowCloseConfirm';
import {
  askToCloseCurrent,
  askToCloseWindow,
  cancelAskToCloseWindow,
  keepTabOpen,
  newQueryTab,
  nextTab,
  prevTab,
  useAskToClose,
} from '../../../state/actions';
import { Errors } from '../Errors';
import { CloseConfirmation } from './CloseConfirmation';
import { Frame } from './Frame';
import { useLeftArea } from './leftArea';
import { Nav } from './Nav/Nav';
import { TabsHeader } from './TabsHeader';

const classNames: Record<FrameType, string> = {
  query: 'query-tab',
  table: 'table-tab',
  newtable: 'new-table',
  schemainfo: 'schema-info',
  tableinfo: 'table-info',
  function: 'function',
  domain: 'domain',
  sequence: 'sequence',
  role: 'role',
};

interface UseTabConfiguration {
  onClose?: () => boolean;
  // onActivate?: () => void;
  // onDeactivate?: () => void;
  save?: () => void;
  open?: () => void;
  f5?: () => void;
}

const TabsContext = React.createContext(
  {} as { [n: number]: UseTabConfiguration },
);
const TabContext = React.createContext(0);

export function useTabUid() {
  return useContext(TabContext);
}

export function useTab(conf0: UseTabConfiguration) {
  const uid = useContext(TabContext);
  const tabsConfs = useContext(TabsContext);
  tabsConfs[uid] = conf0;
  useEffect(() => {
    return () => {
      delete tabsConfs[uid];
    };
  }, [tabsConfs, uid]);
}

export function ConnectedApp({ state }: { state: AppState }) {
  assert(state.connected);
  assert(state.schemas);
  assert(state.currentConnectionConfiguration);

  const [close, setClose] = React.useState<{ func: () => void } | null>(null);

  const tabsConfigurations = React.useMemo(
    () => ({}) as { [n: number]: UseTabConfiguration },
    [],
  );

  const framesEls = React.useMemo(
    () => ({}) as { [k: number]: HTMLDivElement },
    [],
  );

  const activeElements = React.useMemo(() => new WeakMap<HTMLElement>(), []);

  const active = React.useMemo(
    () => state.tabs.find((t) => t.active)?.props.uid,
    [state.tabs],
  );

  useShortcuts({
    nextTab() {
      nextTab();
    },
    prevTab() {
      prevTab();
    },
    open() {
      if (active) {
        const activeConf = tabsConfigurations[active];
        if (activeConf && activeConf.open) {
          activeConf.open();
          return;
        }
      }
      // eslint-disable-next-line consistent-return
      return false;
    },
    save() {
      if (active) {
        const activeConf = tabsConfigurations[active];
        if (activeConf && activeConf.save) {
          activeConf.save();
          return;
        }
      }
      // eslint-disable-next-line consistent-return
      return false;
    },
    closeTab() {
      askToCloseCurrent();
    },
    newTab() {
      newQueryTab();
    },
    f11() {
      fullScreen();
    },
    f5() {
      if (active) {
        const activeConf = tabsConfigurations[active];
        if (activeConf && activeConf.f5) activeConf.f5();
      }
    },
  });

  useEffect(() => {
    if (active) {
      const el = framesEls[active];
      assert(el);
      el.classList.add('active');
      if (activeElements.has(el)) {
        const activeElement = activeElements.get(el);
        if (activeElement)
          setTimeout(() => {
            activeElement.focus();
          }, 1);
        activeElements.delete(el);
      }
    }
    return () => {
      if (active) {
        const el = framesEls[active];
        if (el) {
          if (document.activeElement && el.contains(document.activeElement)) {
            activeElements.set(el, document.activeElement);
          }
          el.classList.remove('active');
        }
      }
    };
  }, [active, activeElements, framesEls]);

  useAskToClose((uid) => {
    if (tabsConfigurations && tabsConfigurations[uid]) {
      const conf = tabsConfigurations[uid];
      if (conf && conf.onClose) {
        return conf.onClose();
      }
    }
    return true;
  });

  const tabs = React.useMemo(() => {
    const sortedTabs = [...state.tabs];
    sortedTabs.sort((a, b) => a.props.uid - b.props.uid);
    return sortedTabs;
  }, [state.tabs]);

  useWindowCloseConfirm(async (doit) => {
    // eslint-disable-next-line no-promise-executor-return
    await new Promise((resolve) => setTimeout(resolve, 100));
    if (await db().hasOpenConnection()) {
      setClose({ func: doit });
      askToCloseWindow();
    } else {
      doit();
    }
  });

  const onDecline = useEvent(() => {
    setClose(null);
    cancelAskToCloseWindow();
  });

  const onBlurCapture = useEvent((e: React.FocusEvent<HTMLDivElement>) => {
    if (
      !e.currentTarget.contains(e.relatedTarget) &&
      e.currentTarget !== e.relatedTarget
    ) {
      activeElements.set(e.currentTarget, e.target);
    }
  });

  const onDoubleClick = useEvent(() => {
    if (active !== undefined) {
      keepTabOpen(active);
    }
  });

  const onFocus = useEvent((e: React.FocusEvent<HTMLDivElement>) => {
    if (e.currentTarget !== e.target) return;
    const el = e.target;
    const activeElement = activeElements.get(el);
    if (activeElement)
      setTimeout(() => {
        activeElements.delete(el);
        activeElement.focus();
      }, 1);
  });

  const onActiveTabMouseDown = useEvent(() => {
    assert(active);
    const el = activeElements.get(framesEls[active]);
    if (el) el.focus();
  });

  const refFuncs = React.useMemo(
    () => ({}) as { [k: number]: (el: HTMLDivElement | null) => void },
    [],
  );

  const { onResizeMouseDown, leftWidth, toggleLeftArea } = useLeftArea();

  const [hover, setHover] = React.useState(false);

  const onHeaderMouseEnter = useEvent(() => {
    setHover(true);
  });

  const onHeaderMouseLeave = useEvent(() => {
    setHover(false);
  });

  const onHeaderMenuClick = useEvent((e: React.MouseEvent) => {
    if (
      e.target instanceof HTMLElement &&
      !e.target.closest('.nav, .header--title')
    ) {
      toggleLeftArea();
      setHover(false);
    }
  });

  const onEmptyDoubleClick = useEvent(() => {
    if (tabs.length === 0) {
      newQueryTab();
    }
  });

  const { database } = state;
  const c = state.currentConnectionConfiguration;
  const title = `${c.user}@${c.host}${
    c.port !== 5432 ? `:${c.port}` : ''
  }/${database}`;

  return (
    <div>
      <Errors errors={state.errors} />
      {close && (
        <CloseConfirmation onConfirm={close.func} onDecline={onDecline} />
      )}
      <div className="header-and--nav">
        <div className="header" style={{ width: Math.max(leftWidth, 33) }}>
          {title}
          <span
            className="header--menu"
            onMouseEnter={onHeaderMouseEnter}
            onMouseLeave={onHeaderMouseLeave}
            style={{
              left: leftWidth <= 40 ? 0 : Math.max(leftWidth - 37, 0),
              opacity: leftWidth <= 40 ? 1 : undefined,
              width: leftWidth <= 40 ? 40 : undefined,
            }}
            onClick={onHeaderMenuClick}
          >
            <i
              className={`fa ${
                leftWidth <= 40 ? 'fa-bars' : 'fa-chevron-left'
              }`}
            />
            {hover && leftWidth <= 40 ? (
              <Nav
                title={title}
                style={{ width: 225, height: 500, zIndex: 10 }}
                schemas={state.schemas}
                tabs={state.tabs}
                roles={state.roles ?? []}
                rolesOpen={state.rolesOpen}
              />
            ) : null}
          </span>
        </div>
        <Nav
          style={{ width: leftWidth }}
          schemas={state.schemas}
          tabs={state.tabs}
          roles={state.roles ?? []}
          disabled={leftWidth <= 40}
          rolesOpen={state.rolesOpen}
        />
      </div>
      <TabsHeader
        tabs={state.tabs}
        left={Math.max(leftWidth, 40)}
        onActiveTabMouseDown={onActiveTabMouseDown}
      />
      {leftWidth > 40 ? (
        <div
          className="resize-helper"
          style={{ left: leftWidth - 1 }}
          onMouseDown={onResizeMouseDown}
        />
      ) : null}
      <div
        className="app-content"
        style={{ left: leftWidth }}
        onDoubleClick={onEmptyDoubleClick}
      >
        <TabsContext.Provider value={tabsConfigurations}>
          {tabs.map((t) => (
            <div
              key={t.props.uid}
              className={`frame ${classNames[t.props.type]}`}
              onBlurCapture={onBlurCapture}
              onFocus={onFocus}
              tabIndex={0}
              onDoubleClick={onDoubleClick}
              ref={
                refFuncs[t.props.uid] ||
                (refFuncs[t.props.uid] = (el) => {
                  if (el) framesEls[t.props.uid] = el;
                  else {
                    delete framesEls[t.props.uid];
                    delete refFuncs[t.props.uid];
                  }
                })
              }
            >
              <TabContext.Provider value={t.props.uid}>
                <Frame {...t.props} />
              </TabContext.Provider>
            </div>
          ))}
        </TabsContext.Provider>
      </div>
    </div>
  );
}
