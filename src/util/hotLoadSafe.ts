import { AppState } from 'types';
import * as pg from 'pg';

export default {
  listener: undefined as ((_: AppState) => void) | undefined,
  current: undefined as AppState | undefined,
  pool: null as null | pg.Pool,
};
