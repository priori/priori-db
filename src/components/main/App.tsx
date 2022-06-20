import * as React from 'react';
import { NewSchemaForm } from 'components/util/NewSchemaForm';
import { useF5, useShortcuts } from 'util/shortcuts';
import { useEffect, useRef, useContext } from 'react';
import { FrameType, Tab } from 'types';
import { useWindowCloseConfirm } from 'util/useWindowCloseConfirm';
import { hasOpenConnection } from 'db/Connection';
import { useEvent } from 'util/useEvent';
import { currentState, useAppState } from '../../state';
import { Nav } from './Nav';
import { Tabs } from './Tabs';
import { Home } from './home/Home';
import {
  askToCloseWindow,
  cancelAskToCloseWindow,
  cancelCreateSchema,
  createSchema,
  useAskToClose,
} from '../../actions';
import { Frame } from './Frame';

const classNames: Record<FrameType, string> = {
  query: 'query-tab',
  table: 'table-tab',
  newtable: 'new-table',
  schemainfo: 'schema-info',
  tableinfo: 'table-info',
  function: 'function',
  domain: 'domain',
  sequence: 'sequence',
};

const TabContext = React.createContext(0);
export function useTabUid() {
  return useContext(TabContext);
}

interface UseTabConf {
  f5?: () => void;
  onActivate?: () => void;
  onDeactivate?: () => void;
  onClose?: () => boolean;
}
let listeners = [] as (() => void)[];
const confs = {} as { [n: number]: UseTabConf };
export function useTab(conf0: UseTabConf) {
  const prevTabStateRef = useRef(null as Tab | null);
  const uid = useTabUid();
  confs[uid] = conf0;
  useEffect(() => {
    const f = () => {
      const conf = confs[uid];
      const prevTabState = prevTabStateRef.current;
      const tabState = currentState().tabs.find((t) => t.props.uid === uid);
      prevTabStateRef.current = tabState || null;
      if (tabState) {
        if (
          (!prevTabState || !prevTabState.active) &&
          tabState.active &&
          conf &&
          conf.onActivate
        ) {
          conf.onActivate();
        } else if (
          prevTabState &&
          prevTabState.active &&
          (!tabState || !tabState.active) &&
          conf &&
          conf.onDeactivate
        ) {
          conf.onDeactivate();
        }
      }
    };
    listeners.push(f);
    setTimeout(() => f(), 1);
    return () => {
      listeners = listeners.filter((f2) => f2 !== f);
      delete confs[uid];
    };
  }, [uid]);
}

export function App() {
  useShortcuts();

  const state = useAppState();

  useF5(() => {
    const currenTab = state.tabs.find((t) => t.active);
    if (currenTab && confs[currenTab.props.uid]) {
      const conf = confs[currenTab.props.uid];
      if (conf && conf.f5) conf.f5();
    }
  });

  useAskToClose((uid) => {
    if (confs && confs[uid]) {
      const conf = confs[uid];
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

  const [close, setClose] = React.useState<{ func: () => void } | null>(null);
  useWindowCloseConfirm(async (doit) => {
    await new Promise((resolve) => setTimeout(resolve, 100));
    if (await hasOpenConnection()) {
      setClose({ func: doit });
      askToCloseWindow();
    } else {
      doit();
    }
  });

  const onClickNo = useEvent(() => {
    setClose(null);
    cancelAskToCloseWindow();
  });

  if (state.connected) {
    return (
      <div
        ref={() => {
          for (const f of listeners) f();
        }}
      >
        {close && (
          <div
            className="dialog--close-window"
            onKeyDown={(e: React.KeyboardEvent<HTMLDivElement>) => {
              if (e.key === 'Escape') {
                e.currentTarget.blur();
              }
            }}
            tabIndex={0}
            ref={(el) => {
              if (el) el.focus();
            }}
            onBlur={(e) => {
              const dialogEl = e.currentTarget;
              setTimeout(() => {
                if (dialogEl.contains(document.activeElement)) return;
                onClickNo();
              }, 1);
            }}
          >
            <div>
              There is some running query or idle connection in transacion, are
              you sure you want to close?
            </div>
            <button onClick={onClickNo} type="button">
              No
            </button>{' '}
            <button onClick={close.func} type="button">
              Yes
            </button>
          </div>
        )}
        <div className="header">{state.title}</div>
        <Tabs tabs={state.tabs} />
        {state.schemas ? (
          <Nav schemas={state.schemas} tabs={state.tabs} />
        ) : undefined}
        <div className="app-content">
          {tabs.map((t) => (
            <div
              key={t.props.uid}
              className={`frame ${classNames[t.props.type]}${
                t.active ? ' active' : ''
              }`}
            >
              <TabContext.Provider value={t.props.uid}>
                <Frame {...t.props} />
              </TabContext.Provider>
            </div>
          ))}
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
  return <Home {...state} />;
}
