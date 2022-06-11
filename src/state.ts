import React from 'react';
import { equals } from 'components/util/equals';
import { passwords as currentPasswords } from './db/pgpass';
import { AppState } from './types';
import * as mutations from './mutations';

export function throwError(err: unknown) {
  if (err instanceof Error && err.message) alert(err.message);
  else if (typeof err === 'string') alert(err);
  else alert(JSON.stringify(err));
}

let listener: ((_: AppState) => void) | undefined;

let current: AppState = {
  uidCounter: 0,
  passwords: currentPasswords,
  connected: false,
  editConnections: false,
  tabs: [],
  tabsSort: [],
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
    // eslint-disable-next-line @typescript-eslint/no-loop-func
    ms[k] = (...ev) => {
      current = conf[k](current, ...ev);
      if (!listener) throw new Error('Listener não encontrado.');
      listener(current);
    };
  }
  return ms as Mutations<MC>;
}

export function useAppState() {
  const [hookState, setState] = React.useState(current);
  React.useEffect(() => {
    let mounted = true;
    let prevState = current;
    listener = (newState) => {
      if (mounted) {
        if (!equals(prevState, newState)) setState(newState);
      }
      prevState = newState;
    };
    return () => {
      mounted = false;
      listener = undefined;
    };
  }, []);
  return hookState;
}

export function currentState() {
  return current;
}

const actions = mutationsToActions(mutations);
export default actions;
