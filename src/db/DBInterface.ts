import {
  EntityType,
  Filter,
  Notice,
  QueryResultData,
  SequencePrivileges,
  SimpleValue,
  Sort,
  TableColumnType,
  TablePrivileges,
} from 'types';
import { DomainInfo, SequenceInfo, TableInfo } from './db';
import { PgQueryExecutor } from './pg/QueryExecutor';

export interface DBInterface {
  function(
    schema: string,
    name: string,
  ): Promise<{
    pgProc: {
      [key: string]: SimpleValue;
    };
    comment: string;
    definition: string;
    privileges: string[];
    owner: string;
  }>;
  role(name: string): Promise<{
    role: {
      [k: string]: string | number | boolean | null;
    };
    info: {
      definition: string;
      comment: string;
    };
    user: {
      [k: string]: string | number | boolean | null;
    };
    privileges: {
      tables: {
        schema: string;
        table: string;
        privileges: TablePrivileges;
      }[];
      schemas: {
        name: string;
        privileges: {
          create: boolean;
          usage: boolean;
        };
      }[];
      functions: {
        schema: string;
        name: string;
      }[];
      sequences: {
        schema: string;
        name: string;
        privileges: SequencePrivileges;
      }[];
      types: {
        schema: string;
        name: string;
      }[];
    };
  }>;
  schema(name: string): Promise<{
    privileges: {
      roleName: string;
      privileges: {
        create: boolean;
        usage: boolean;
      };
    }[];
    owner: string;
    comment: string;
    pgNamesspace: {
      [key: string]: SimpleValue;
    };
  }>;
  sequence(schema: string, name: string): Promise<SequenceInfo>;
  domain(schema: string, name: string): Promise<DomainInfo>;
  updateSchemaComment(schema: string, comment: string): Promise<void>;
  select({
    schema,
    table,
    sort,
    filter,
  }: {
    schema: string;
    table: string;
    sort: Sort | null;
    filter: Filter | undefined;
  }): Promise<QueryResultData>;
  createTable(newTable: {
    name: string;
    owner: string;
    schema: string;
    tableSpace: string;
    comment: string;
    like?: string;
    columns: {
      name: string;
      type: TableColumnType | null;
      length: string;
      precision: string;
      notNull: boolean;
      primaryKey: boolean;
    }[];
  }): Promise<void>;
  renameSchema(schema: string, name: string): Promise<void>;
  alterSchemaOwner(schema: string, owner: string): Promise<void>;
  alterTableOwner(schema: string, table: string, owner: string): Promise<void>;
  alterFuncOwner(schema: string, name: string, owner: string): Promise<void>;
  alterSequenceOwner(
    schema: string,
    name: string,
    owner: string,
  ): Promise<void>;
  alterTypeOwner(schema: string, name: string, owner: string): Promise<void>;
  tableSize(
    schema: string,
    table: string,
  ): Promise<{
    size: number;
    pretty: string;
    onlyTable: string;
    indexes: string;
  }>;
  dropRole(name: string): Promise<void>;
  updateRoleComment(name: string, text: string): Promise<void>;
  renameRole(name: string, name2: string): Promise<void>;
  updateColumn(
    schema: string,
    table: string,
    column: string,
    update: {
      name?: string;
      comment?: string | null;
      type?: string;
      length?: number;
      scale?: number;
      notNull?: boolean;
      default?: string | null;
    },
  ): Promise<void>;
  updateSequence(
    schema: string,
    table: string,
    update: { comment?: string | null; name?: string; schema?: string },
  ): Promise<void>;
  updateSequenceValue(
    schema: string,
    name: string,
    value: string,
  ): Promise<void>;
  updateTable(
    schema: string,
    table: string,
    update: { comment?: string | null; name?: string; schema?: string },
  ): Promise<void>;
  updateView(
    schema: string,
    table: string,
    update: { comment?: string | null; name?: string; schema?: string },
  ): Promise<void>;
  updateDomain(
    schema: string,
    table: string,
    update: { comment?: string | null; name?: string; schema?: string },
  ): Promise<void>;
  updateMView(
    schema: string,
    table: string,
    update: { comment?: string | null; name?: string; schema?: string },
  ): Promise<void>;
  updateFunction(
    schema: string,
    name: string,
    update: { comment?: string | null; name?: string; schema?: string },
  ): Promise<void>;
  removeCol(schema: string, table: string, col: string): Promise<void>;
  removeIndex(schema: string, _: string, index: string): Promise<void>;
  commentIndex(
    schema: string,
    _: string,
    index: string,
    comment: string,
  ): Promise<void>;
  commentColumn(
    schema: string,
    table: string,
    col: string,
    comment: string,
  ): Promise<void>;
  renameIndex(
    schema: string,
    _: string,
    index: string,
    newName: string,
  ): Promise<void>;
  renameColumn(
    schema: string,
    table: string,
    col: string,
    newName: string,
  ): Promise<void>;
  tableInfo(schema: string, name: string): Promise<TableInfo>;
  types(): Promise<TableColumnType[]>;
  pks(schemaName: string, tableName: string): Promise<string[]>;
  defaultSort(
    schema: string,
    tableName: string,
  ): Promise<{ field: string; direction: string }[] | null>;
  updatePrivileges(
    schema: string,
    table: string,
    grantee: string,
    privileges: {
      update?: boolean;
      select?: boolean;
      insert?: boolean;
      delete?: boolean;
      truncate?: boolean;
      references?: boolean;
      trigger?: boolean;
    },
  ): Promise<void>;
  updateSequencePrivileges(
    schema: string,
    table: string,
    grantee: string,
    privileges: {
      update?: boolean;
      select?: boolean;
      usage?: boolean;
    },
  ): Promise<void>;
  updateSchemaPrivileges(
    schema: string,
    grantee: string,
    privileges: {
      create?: boolean;
      usage?: boolean;
    },
  ): Promise<void>;
  listRoles(): Promise<
    {
      name: string;
      isUser: boolean;
    }[]
  >;
  listAll(): Promise<
    {
      name: string;
      internal: boolean;
      current: boolean;
      tables: {
        type: EntityType & ('MATERIALIZED VIEW' | 'VIEW' | 'BASE TABLE');
        name: string;
      }[];
      functions: {
        type: EntityType & 'FUNCTION';
        name: string;
      }[];
      sequences: {
        type: EntityType & 'SEQUENCE';
        name: string;
      }[];
      domains: {
        type: EntityType & 'DOMAIN';
        name: string;
      }[];
    }[]
  >;
  newIndex(
    schema: string,
    table: string,
    cols: {
      name: string;
      sort?: 'asc' | 'desc' | undefined;
      nulls?: 'last' | 'first' | undefined;
    }[],
    method?: string | undefined,
    unique?: boolean | undefined,
  ): Promise<void>;
  newColumn(
    schema: string,
    table: string,
    col: {
      name: string;
      type: string;
      length?: number;
      scale?: number;
      comment: string | null;
      notNull?: boolean;
      default?: string;
    },
  ): Promise<void>;
  update(
    schema: string,
    table: string,
    updates: {
      where: { [fieldName: string]: string | number | null };
      values: { [fieldName: string]: string | null };
    }[],
    inserts: { [fieldName: string]: string | null }[],
  ): Promise<void>;
  createSchema(schemaName: string): Promise<void>;
  dropSchema(schemaName: string, cascade?: boolean): Promise<void>;
  dropTable(schema: string, name: string, cascade?: boolean): Promise<void>;
  dropFunction(schema: string, name: string, cascade?: boolean): Promise<void>;
  dropDomain(schema: string, name: string, cascade?: boolean): Promise<void>;
  dropSequence(schema: string, name: string, cascade?: boolean): Promise<void>;
  revokeFunction(schema: string, name: string, role: string): Promise<void>;
  grantFunction(schema: string, name: string, role: string): Promise<void>;
  grantDomain(schema: string, name: string, role: string): Promise<void>;
  revokeDomain(schema: string, name: string, role: string): Promise<void>;
  hasOpenConnection(): Promise<boolean>;
  closeAll(): Promise<void>;
  newQueryExecutor(
    onNotice: (n: Notice) => void,
    onPid: (pid: number | null) => void,
    onError: (e: Error) => void,
  ): PgQueryExecutor;
  buildFilterWhere(filter: Filter): string;
  inOpenTransaction(id: number): Promise<boolean>;
}
