import {
  EntityType,
  Filter,
  FilterOperator,
  Notice,
  QueryExecutor,
  QueryResultData,
  SimpleValue,
  Sort,
  TableColumnType,
} from 'types';
import { DomainInfo, SequenceInfo, TableInfo } from './db';

export interface DBInterface {
  basicInfo(): Promise<{ version: string; size?: string }>;
  extraInfo(): Promise<{
    [title: string]: {
      [key: string]: SimpleValue;
    };
  }>;
  variables: {
    update(name: string, value: string): Promise<void>;
    title: string;
    load(): Promise<
      {
        name: string;
        setting: string;
        description: string;
      }[]
    >;
  };
  schema(name: string): Promise<{
    privileges?: {
      roleName: string;
      host?: string;
      internal?: boolean;
      privileges: {
        [k: string]: boolean | undefined;
      };
    }[];
    owner?: string;
    comment: string;
    info?:
      | undefined
      | {
          [title: string]: {
            [key: string]: SimpleValue;
          };
        };
  }>;
  updateSchemaComment:
    | null
    | ((schema: string, comment: string) => Promise<void>);
  select({
    schema,
    table,
    sort,
    filter,
    limit,
  }: {
    schema: string;
    table: string;
    sort: Sort | null;
    filter: Filter | undefined;
    limit: 1000 | 10_000 | 'unlimited';
  }): Promise<QueryResultData>;

  autoIncrement: boolean;
  createTable(newTable: {
    name: string;
    owner?: string;
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
      autoIncrement?: boolean | undefined;
      enum?: string[];
    }[];
  }): Promise<void>;
  renameSchema: null | ((schema: string, name: string) => Promise<void>);
  alterSchemaOwner?(schema: string, owner: string): Promise<void>;
  alterTableOwner?(schema: string, table: string, owner: string): Promise<void>;
  tableSize(
    schema: string,
    table: string,
  ): Promise<{
    size: number;
    pretty: string;
    onlyTable: string;
    indexes: string;
  }>;
  updateColumn(
    schema: string,
    table: string,
    column: string,
    update: {
      name?: undefined | string;
      comment?: undefined | string | null;
      type?: undefined | string;
      length?: undefined | number;
      scale?: undefined | number;
      notNull?: undefined | boolean;
      default?: undefined | string | null;
      enum?: undefined | string[];
    },
  ): Promise<void>;
  updateTable(
    schema: string,
    table: string,
    update: { comment?: string | null; name?: string; schema?: string },
  ): Promise<void>;
  updateViewComment?: false;
  updateViewSchema?: false;
  updateView(
    schema: string,
    table: string,
    update: { comment?: string | null; name?: string; schema?: string },
  ): Promise<void>;
  updateMView?(
    schema: string,
    table: string,
    update: { comment?: string | null; name?: string; schema?: string },
  ): Promise<void>;
  removeCol(schema: string, table: string, col: string): Promise<void>;
  removeIndex(schema: string, _: string, index: string): Promise<void>;
  commentIndex:
    | undefined
    | ((
        schema: string,
        _: string,
        index: string,
        comment: string,
      ) => Promise<void>);
  commentColumn(
    schema: string,
    table: string,
    col: string,
    comment: string,
  ): Promise<void>;
  renameIndex: (
    schema: string,
    _: string,
    index: string,
    newName: string,
  ) => Promise<void>;
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
  ): Promise<{ field: string; direction: 'asc' | 'desc' }[] | null>;

  listAll(): Promise<
    {
      name: string;
      internal: boolean;
      current: boolean;
      tables: {
        type: EntityType & ('MATERIALIZED VIEW' | 'VIEW' | 'BASE TABLE');
        name: string;
      }[];
      functions?: {
        type: EntityType & ('FUNCTION' | 'PROCEDURE');
        name: string;
      }[];
      sequences?: {
        type: EntityType & 'SEQUENCE';
        name: string;
      }[];
      domains?: {
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
      length?: undefined | number;
      scale?: undefined | number;
      comment: string | null;
      notNull?: undefined | boolean;
      default?: undefined | string | null;
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
    removals: { [fieldName: string]: string | number | null }[],
  ): Promise<void>;
  createSchema(schemaName: string): Promise<void>;
  dropSchema(schemaName: string, cascade?: boolean): Promise<void>;
  dropTable(schema: string, name: string, cascade?: boolean): Promise<void>;
  hasOpenConnection(): Promise<boolean>;
  closeAll(): Promise<void>;
  newQueryExecutor(
    onNotice: (n: Notice) => void,
    onPid: (pid: number | null) => void,
    onError: (e: Error) => void,
  ): QueryExecutor;
  buildFilterWhere(filter: Filter): string;
  inOpenTransaction(id: number): Promise<boolean>;
  indexesTypes: (() => Promise<string[]>) | undefined;
  nullsLast: boolean;
  operators(): Promise<FilterOperator[]>;
  updateColumnViewName: boolean;
  updateColumnViewComment: boolean;
  privileges?: {
    rolesHost?: true;
    schemaPrivilegesTypes?(): Promise<string[]>;
    createRole(role: {
      name: string;
      host?: string;
      password: string;
    }): Promise<void>;
    dropPassword?(name: string, host?: string): Promise<void>;
    updatePassword?(
      name: string,
      password?: string,
      host?: string,
    ): Promise<void>;
    tablePrivilegesTypes(): Promise<string[]>;
    listRoles(): Promise<
      {
        name: string;
        isUser: boolean;
        host?: string;
      }[]
    >;
    role?(
      name: string,
      host?: string,
    ): Promise<{
      definition?: string | null;
      comment?: string | null;
      isUser: boolean;
      info?: {
        [title: string]: {
          [k: string]: string | number | boolean | null;
        };
      };
      user?: {
        [k: string]: string | number | boolean | null;
      };
      privileges: {
        tables: {
          schema: string;
          table: string;
          internal?: boolean;
          privileges: {
            [k: string]: boolean | undefined;
          };
        }[];
        schemas: {
          name: string;
          internal?: boolean;
          privileges: {
            [k: string]: boolean | undefined;
          };
        }[];
        functions: {
          internal?: boolean;
          schema: string;
          name: string;
          privileges: {
            [k: string]: boolean | undefined;
          };
        }[];
        sequences?: {
          internal?: boolean;
          schema: string;
          name: string;
          privileges: {
            [k: string]: boolean | undefined;
          };
        }[];
        types?: {
          internal?: boolean;
          schema: string;
          name: string;
          privileges: {
            [k: string]: boolean | undefined;
          };
        }[];
      };
    }>;
    dropRole?(name: string, host?: string): Promise<void>;
    updateRoleComment?(
      name: string,
      text: string,
      host?: string,
    ): Promise<void>;
    renameRole?(name: string, name2: string, host?: string): Promise<void>;

    updateTablePrivileges(
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
      host?: string,
    ): Promise<void>;

    updateSchemaPrivileges?(
      schema: string,
      grantee: string,
      privileges: {
        [k: string]: boolean | undefined;
      },
      host?: string,
    ): Promise<void>;
  };
  functions?: {
    function(
      schema: string,
      name: string,
    ): Promise<{
      info?: {
        [k: string]: {
          [key: string]: SimpleValue;
        };
      };
      type: 'procedure' | 'function';
      comment: string;
      definition?: string;
      privileges?: {
        roleName: string;
        host?: string;
        privileges: {
          [k: string]: boolean | undefined;
        };
        internal?: boolean;
      }[];
      owner?: string;
    }>;
    rename?: boolean;
    move?: boolean;
    updateFunction(
      schema: string,
      name: string,
      update: { comment?: string | null; name?: string; schema?: string },
    ): Promise<void>;
    dropCascade: boolean;
    dropFunction(
      schema: string,
      name: string,
      cascade?: boolean,
    ): Promise<void>;
    alterFuncOwner?(schema: string, name: string, owner: string): Promise<void>;

    updateFunctionPrivileges?(
      schema: string,
      table: string,
      grantee: string,
      privileges: {
        [k: string]: boolean | undefined;
      },
      host?: string,
    ): Promise<void>;
    privilegesTypes?(): Promise<string[]>;
  };
  domains?: {
    domain(schema: string, name: string): Promise<DomainInfo>;
    updateDomain(
      schema: string,
      table: string,
      update: { comment?: string | null; name?: string; schema?: string },
    ): Promise<void>;
    dropDomain(schema: string, name: string, cascade?: boolean): Promise<void>;
    alterTypeOwner?(schema: string, name: string, owner: string): Promise<void>;
    updateDomainPrivileges(
      schema: string,
      name: string,
      grantee: string,
      privileges: {
        [k: string]: boolean | undefined;
      },
      host?: string,
    ): Promise<void>;
    grantDomain(schema: string, name: string, role: string): Promise<void>;
    revokeDomain(schema: string, name: string, role: string): Promise<void>;
    privilegesTypes?(): Promise<string[]>;
  };
  sequences?: {
    sequence(schema: string, name: string): Promise<SequenceInfo>;
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
    dropSequence(
      schema: string,
      name: string,
      cascade?: boolean,
    ): Promise<void>;
    alterSequenceOwner?(
      schema: string,
      name: string,
      owner: string,
    ): Promise<void>;
    updateSequencePrivileges?(
      schema: string,
      table: string,
      grantee: string,
      privileges: {
        [k: string]: boolean | undefined;
      },
      host?: string,
    ): Promise<void>;
    privilegesTypes?(): Promise<string[]>;
  };
}
