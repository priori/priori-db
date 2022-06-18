import React from 'react';
import { equals } from 'util/equals';
import { passwords as currentPasswords } from './db/pgpass';
import { AppState } from './types';
import * as mutations from './mutations';
import hls from './util/hotLoadSafe';

let current: AppState = hls.current || {
  askToCloseWindow: false,
  uidCounter: 0,
  passwords: currentPasswords,
  connected: false,
  editConnections: false,
  tabs: [],
  tabsOpenOrder: [],
  title: '',
  newConnection: !currentPasswords || !currentPasswords.length || false,
  newSchema: false,
};

type MutationsConfig = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [k: string]: (v: AppState, ...ev: any) => AppState;
};

type Mutations<MC extends MutationsConfig> = {
  [k in keyof MC as k]: MC[k] extends (v: AppState, ...ev: infer Ev) => AppState
    ? (...ev: Ev) => void
    : never;
};

function mutationsToActions<MC extends MutationsConfig>(
  conf: MC
): Mutations<MC> {
  const ms = {} as { [k in keyof MC as k]: (v: unknown) => void };
  for (const k in conf) {
    ms[k] = (...ev) => {
      current = conf[k](current, ...ev);
      hls.current = current;
      if (!hls.listener) throw new Error('Listener não encontrado.');
      hls.listener(current);
    };
  }
  return ms as Mutations<MC>;
}

export function useAppState() {
  const [hookState, setState] = React.useState(current);
  React.useEffect(() => {
    let mounted = true;
    let prevState = current;
    hls.listener = (newState) => {
      if (mounted) {
        if (!equals(prevState, newState)) setState(newState);
      }
      prevState = newState;
    };
    return () => {
      mounted = false;
      hls.listener = undefined;
    };
  }, []);
  return hookState;
}

export function currentState() {
  return current;
}

const actions = mutationsToActions(mutations);
export default actions;
