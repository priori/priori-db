/* eslint-disable no-return-assign */
import * as React from 'react';
import { NewSchemaForm } from 'components/util/NewSchemaForm';
import { useEffect, useContext } from 'react';
import { AppState, FrameType } from 'types';
import { useWindowCloseConfirm } from 'util/useWindowCloseConfirm';
import { hasOpenConnection } from 'db/Connection';
import { useEvent } from 'util/useEvent';
import { assert } from 'util/assert';
import { fullScreen } from 'util/fullScreen';
import { useShortcuts } from 'util/shortcuts';
import { horizontalResize } from 'util/resize';
import { Nav } from './Nav/Nav';
import { Tabs } from './Tabs';
import {
  askToCloseWindow,
  cancelAskToCloseWindow,
  cancelCreateSchema,
  createSchema,
  useAskToClose,
  askToCloseCurrent,
  newQueryTab,
  nextTab,
  prevTab,
} from '../../../state/actions';
import { Frame } from './Frame';
import { CloseConfirmation } from './CloseConfirmation';
import { Errors } from '../Errors';

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
    if (await hasOpenConnection()) {
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

  const [leftWidth, setLeftWidth] = React.useState(250);

  const [hover, setHover] = React.useState(false);

  const hideClick = useEvent((e: React.MouseEvent) => {
    if (
      e.target instanceof HTMLElement &&
      !e.target.closest('.nav, .header--title')
    ) {
      setLeftWidth(leftWidth ? 0 : 250);
      setHover(false);
      setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
      }, 1);
    }
  });

  const [rootClass, setClass] = React.useState<string | undefined>();

  const onResizeMouseDown = useEvent(async (e: React.MouseEvent) => {
    setClass('resizing');
    let el: HTMLElement | null = null;
    const inc2 = await horizontalResize(
      e,
      (inc) => {
        if (inc + leftWidth > 320) {
          return false;
        }
        if (leftWidth + inc < 90) {
          setClass(undefined);
          const el2 = document.querySelector('.resize--indicator');
          if (el2 instanceof HTMLElement) {
            el = el2;
            el.style.opacity = '0.03';
          }
        } else {
          setClass('resizing');
          if (el) {
            el.style.opacity = '';
            el = null;
          }
        }
        setLeftWidth(leftWidth + inc < 90 ? 0 : leftWidth + inc);
        return true;
      },
      document.documentElement,
      leftWidth,
    );
    setClass(undefined);
    if (inc2 === undefined) {
      setLeftWidth(leftWidth);
    } else {
      setLeftWidth(leftWidth + inc2 < 90 ? 0 : leftWidth + inc2);
    }
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 1);
  });

  return (
    <div className={rootClass}>
      <Errors errors={state.errors} />
      {close && (
        <CloseConfirmation onConfirm={close.func} onDecline={onDecline} />
      )}
      <div className="header-and--nav">
        <div className="header" style={{ width: Math.max(leftWidth, 33) }}>
          {state.title}
          <span
            className="header--menu"
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            style={{
              left: leftWidth <= 40 ? 0 : Math.max(leftWidth - 37, 0),
              opacity: leftWidth <= 40 ? 1 : undefined,
              width: leftWidth <= 40 ? 40 : undefined,
            }}
            onClick={hideClick}
          >
            {leftWidth <= 40 ? (
              <i className="fa fa-bars" />
            ) : (
              <i className="fa fa-chevron-left" />
            )}{' '}
            {hover && leftWidth <= 40 ? (
              <Nav
                title={state.title}
                style={{ width: 225, height: 500, zIndex: 10 }}
                schemas={state.schemas}
                tabs={state.tabs}
                roles={state.roles ?? []}
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
        />
      </div>
      <Tabs
        tabs={state.tabs}
        style={{ left: Math.max(leftWidth, 40) }}
        onActiveTabMouseDown={onActiveTabMouseDown}
      />
      {leftWidth > 40 ? (
        <div
          className="resize-helper"
          style={{ left: leftWidth - 1 }}
          onMouseDown={onResizeMouseDown}
        />
      ) : null}
      <div className="app-content" style={{ left: leftWidth }}>
        <TabsContext.Provider value={tabsConfigurations}>
          {tabs.map((t) => (
            <div
              key={t.props.uid}
              className={`frame ${classNames[t.props.type]}`}
              onBlurCapture={onBlurCapture}
              onFocus={onFocus}
              tabIndex={0}
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
      {state.newSchema ? (
        <NewSchemaForm
          onCreateSchema={createSchema}
          onClose={cancelCreateSchema}
        />
      ) : null}
    </div>
  );
}
