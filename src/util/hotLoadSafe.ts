import { AppState, ConnectionType } from 'types';
import { Pool } from 'mysql2/promise';
import * as pg from 'pg';

export default {
  listener: undefined as ((_: AppState) => void) | undefined,
  current: undefined as AppState | undefined,
  pool: null as null | pg.Pool,
  connectionType: null as ConnectionType | null,
  mysql: null as null | Pool,
};
