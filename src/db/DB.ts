import { grantError } from 'util/errors';
import { list, first, query, openConnection } from './Connection';
import { EntityType, Type } from '../types';

function label(s: string) {
  return `"${s.replaceAll('"', '""')}"`;
}

function str(s: string) {
  return `'${s.replace(/'/g, "''").replace(/\\/g, '\\\\')}'`;
}

export const DB = {
  async tableComment(schema: string, table: string) {
    const res = await first(
      `SELECT obj_description('${label(schema)}.${label(
        table
      )}'::regclass) "comment"`
    );
    return res.comment as string | null;
  },

  async updateColumn(
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
    }
  ) {
    const c = await openConnection();
    try {
      await c.query('BEGIN');
      if (update.name && update.name !== column)
        await c.query(
          `ALTER TABLE ${label(schema)}.${label(table)} RENAME COLUMN ${label(
            column
          )} TO ${label(update.name)}`
        );
      if (update.comment !== undefined) {
        if (update.comment) {
          await c.query(
            `COMMENT ON COLUMN ${label(schema)}.${label(table)}.${label(
              update.name || column
            )} IS ${str(update.comment)}`
          );
        } else {
          await c.query(
            `COMMENT ON COLUMN ${label(schema)}.${label(table)}.${label(
              update.name || column
            )} IS NULL`
          );
        }
      }
      if (update.type !== undefined) {
        await c.query(
          `ALTER TABLE ${label(schema)}.${label(table)} ALTER COLUMN ${label(
            update.name || column
          )} TYPE ${update.type}${
            update.length
              ? `(${update.length}${update.scale ? `, ${update.scale}` : ''})`
              : ''
          }`
        );
      }
      if (update.notNull !== undefined) {
        if (update.notNull) {
          await c.query(
            `ALTER TABLE ${label(schema)}.${label(table)} ALTER COLUMN ${label(
              update.name || column
            )} SET NOT NULL`
          );
        } else {
          await c.query(
            `ALTER TABLE ${label(schema)}.${label(table)} ALTER COLUMN ${label(
              update.name || column
            )} DROP NOT NULL`
          );
        }
      }
      if (update.default !== undefined) {
        if (update.default) {
          await c.query(
            `ALTER TABLE ${label(schema)}.${label(table)} ALTER COLUMN ${label(
              update.name || column
            )} SET DEFAULT ${update.default}`
          );
        } else {
          await c.query(
            `ALTER TABLE ${label(schema)}.${label(table)} ALTER COLUMN ${label(
              update.name || column
            )} DROP DEFAULT`
          );
        }
      }
      await c.query('COMMIT');
    } catch (e) {
      await c.query('ROLLBACK');
      throw grantError(e);
    } finally {
      c.release(true);
    }
  },

  async updateSequence(
    schema: string,
    table: string,
    update: { comment?: string | null; name?: string; schema?: string }
  ) {
    return DB.updateEntity('SEQUENCE', schema, table, update);
  },

  async updateSequenceValue(schema: string, name: string, value: string) {
    if (!value || !value.match(/^(\d+|\.)+$/))
      throw new Error(`Invalid sequence value (${value})`);
    await query(
      `ALTER SEQUENCE ${label(schema)}.${label(name)} RESTART WITH ${value}`
    );
  },

  async updateTable(
    schema: string,
    table: string,
    update: { comment?: string | null; name?: string; schema?: string }
  ) {
    return DB.updateEntity('TABLE', schema, table, update);
  },

  async updateView(
    schema: string,
    table: string,
    update: { comment?: string | null; name?: string; schema?: string }
  ) {
    return DB.updateEntity('VIEW', schema, table, update);
  },

  async updateDomain(
    schema: string,
    table: string,
    update: { comment?: string | null; name?: string; schema?: string }
  ) {
    return DB.updateEntity('DOMAIN', schema, table, update);
  },

  async updateMView(
    schema: string,
    table: string,
    update: { comment?: string | null; name?: string; schema?: string }
  ) {
    return DB.updateEntity('MATERIALIZED VIEW', schema, table, update);
  },

  async updateFunction(
    schema: string,
    name: string,
    update: { comment?: string | null; name?: string; schema?: string }
  ) {
    return DB.updateEntity('FUNCTION', schema, name, update);
  },

  async updateEntity(
    entityType:
      | 'TABLE'
      | 'VIEW'
      | 'MATERIALIZED VIEW'
      | 'FUNCTION'
      | 'SEQUENCE'
      | 'DOMAIN',
    schema: string,
    table: string,
    update: { comment?: string | null; name?: string; schema?: string }
  ) {
    const c = await openConnection();
    try {
      await c.query('BEGIN');
      if (update.comment) {
        await c.query(
          `COMMENT ON ${entityType} ${label(schema)}.${label(table)} IS ${str(
            update.comment
          )}`
        );
      } else if (update.comment !== undefined) {
        await c.query(
          `COMMENT ON ${entityType} ${label(schema)}.${label(table)} IS NULL`
        );
      }
      if (update.name) {
        await c.query(
          `ALTER ${entityType} ${label(schema)}.${label(
            table
          )} RENAME TO ${label(update.name)}`
        );
      }
      if (update.schema) {
        await c.query(
          `ALTER ${entityType} ${label(schema)}.${label(
            table
          )} SET SCHEMA ${label(update.schema)}`
        );
      }
      await c.query('COMMIT');
    } catch (err) {
      await c.query('ROLLBACK');
      throw err;
    } finally {
      c.release(true);
    }
  },

  async removeCol(schema: string, table: string, col: string) {
    await query(
      `ALTER TABLE ${label(schema)}.${label(table)} DROP COLUMN ${label(col)}`
    );
  },

  async removeIndex(schema: string, _: string, index: string) {
    await query(`DROP INDEX ${label(schema)}.${label(index)}`);
  },

  async commentIndex(
    schema: string,
    _: string,
    index: string,
    comment: string
  ) {
    await query(
      `COMMENT ON INDEX ${label(schema)}.${label(index)} IS ${
        comment ? str(comment) : 'NULL'
      }`
    );
  },

  async commentColumn(
    schema: string,
    table: string,
    col: string,
    comment: string
  ) {
    await query(
      `COMMENT ON COLUMN ${label(schema)}.${label(table)}.${label(col)} IS ${
        comment ? str(comment) : 'NULL'
      }`
    );
  },

  async renameIndex(schema: string, _: string, index: string, newName: string) {
    await query(
      `ALTER INDEX ${label(schema)}.${label(index)} RENAME TO ${label(newName)}`
    );
  },

  async renameColumn(
    schema: string,
    table: string,
    col: string,
    newName: string
  ) {
    await query(
      `ALTER TABLE ${label(schema)}.${label(table)} RENAME COLUMN ${label(
        col
      )} TO ${label(newName)}`
    );
  },

  async updateCol(
    schema: string,
    tabela: string,
    column: string,
    update: {
      comment?: string;
      name?: string;
      type?: string;
      scale?: number;
      length?: number;
      notNull?: boolean;
    } & (
      | {
          comment?: string;
          name?: string;
          notNull?: boolean;
        }
      | {
          comment?: string | null;
          name?: string;
          type: string;
          scale?: number;
          length?: number;
          notNull?: boolean;
        }
    )
  ) {
    const c = await openConnection();
    try {
      await c.query('BEGIN');
      if (update.comment) {
        await c.query(
          `COMMENT ON COLUMN ${label(schema)}.${label(tabela)}.${label(
            column
          )} IS $1;`,
          [update.comment]
        );
      } else if (update.comment !== undefined) {
        await c.query(
          `COMMENT ON COLUMN ${label(schema)}.${label(tabela)}.${label(
            column
          )} IS NULL`
        );
      }
      if (update.name) {
        await c.query(
          `ALTER TABLE ${label(schema)}.${label(tabela)} RENAME COLUMN ${label(
            column
          )} TO ${label(update.name)}`
        );
      }
      if (update.type) {
        await c.query(
          `ALTER TABLE ${label(schema)}.${label(tabela)} ALTER COLUMN ${label(
            column
          )} TYPE ${update.type}${
            update.length
              ? `(${update.length}${update.scale ? `, ${update.scale}` : ''})`
              : ''
          }`
        );
      }
      if (update.notNull !== undefined) {
        if (update.notNull) {
          await c.query(
            `ALTER TABLE ${label(schema)}.${label(tabela)} ALTER COLUMN ${label(
              column
            )} SET NOT NULL`
          );
        } else {
          await c.query(
            `ALTER TABLE ${label(schema)}.${label(tabela)} ALTER COLUMN ${label(
              column
            )} DROP NOT NULL`
          );
        }
      }
      await c.query('COMMIT');
    } catch (e) {
      await c.query('ROLLBACK');
      throw e;
    } finally {
      c.release(true);
    }
  },

  async pgTable(schema: string, table: string) {
    return (await first(
      `
      SELECT *
      FROM pg_catalog.pg_tables
      WHERE
        schemaname = $1 AND tablename = $2`,
      [schema, table]
    )) as
      | {
          tableowner: string;
          tablespace: string;
          hasindexes: boolean;
          hasrules: boolean;
          hastriggers: boolean;
          rowsecurity: boolean;
          uid: number;
        }
      | string;
  },

  async pgView(schema: string, table: string) {
    return (await first(
      `
      SELECT *
      FROM pg_catalog.pg_views
      WHERE
        schemaname = $1 AND viewname = $2`,
      [schema, table]
    )) as
      | {
          viewowner: string;
          definition: string;
        }
      | string;
  },

  async pgMView(schema: string, table: string) {
    return (await first(
      `
      SELECT *
      FROM pg_catalog.pg_matviews
      WHERE
        schemaname = $1 AND matviewname = $2`,
      [schema, table]
    )) as
      | {
          matviewowner: string;
          tablespace: string;
          hasindexes: boolean;
          ispopulated: boolean;
          definition: string;
        }
      | string;
  },

  async pgType(schema: string, name: string) {
    return first(
      `
      SELECT pg_type.*
      FROM pg_type
      JOIN pg_namespace n ON n.oid = typnamespace
      WHERE nspname = $1 AND pg_type.typname = $2
    `,
      [schema, name]
    );
  },

  async pgClass(schema: string, name: string) {
    return first(
      `
      SELECT pg_class.*
      FROM pg_class
      INNER JOIN pg_namespace n ON n.oid = relnamespace AND nspname = $1
      WHERE relname = $2
      `,
      [schema, name]
    );
  },

  async lastValue(schema: string, name: string) {
    const r = await first(
      `SELECT last_value FROM ${label(schema)}.${label(name)}`
    );
    return r.last_value;
  },

  async types() {
    const types = (await list(`
      SELECT *
      FROM
        (SELECT
          format_type(t.oid,NULL) AS "name",
          CASE
            WHEN typelem > 0
            THEN typelem ELSE t.oid END as elemoid,
          typlen length,
          typtype "type",
          t.oid,
          nspname,
          (SELECT COUNT(1) FROM pg_type t2 WHERE t2.typname = t.typname) > 1 AS isdup,
          CASE
            WHEN t.typcollation != 0
            THEN TRUE
            ELSE FALSE
          END AS is_collatable
          FROM
            pg_type t
          JOIN
            pg_namespace nsp ON typnamespace=nsp.oid
          WHERE
            (NOT (typname = 'unknown' AND nspname = 'pg_catalog')) AND
            typisdefined AND typtype IN ('b', 'c', 'd', 'e', 'r') AND
            NOT EXISTS (SELECT 1 FROM pg_class WHERE relnamespace=typnamespace AND relname = typname AND relkind != 'c') AND
            (
              typname NOT LIKE '_%' OR
              NOT EXISTS (SELECT 1
                FROM pg_class
                WHERE
                  relnamespace=typnamespace AND
                  relname = substring(typname FROM 2)::name AND
                  relkind != 'c')
            ) AND
            nsp.nspname != 'information_schema'
          UNION SELECT 'smallserial', 0, 2, 'b', 0, 'pg_catalog', false, false
          UNION SELECT 'bigserial', 0, 8, 'b', 0, 'pg_catalog', false, false
          UNION SELECT 'serial', 0, 4, 'b', 0, 'pg_catalog', false, false
        ) AS dummy
      ORDER BY nspname <> 'pg_catalog', nspname <> 'public', nspname, 1`)) as {
      name: string;
      elemoid: number;
      length: number;
      type: string;
      oid: number;
      nspname: string;
      isdup: boolean;
      is_collatable: boolean;
    }[];

    return types.map((type) => {
      let allowLength = !!(!type.name.endsWith('[]') && type.length === -1);
      if (type.name.endsWith('[]')) {
        const name = type.name.substr(0, type.name.length - 2);
        const el = types.find((el2) => el2.name === name);
        allowLength = (el && el.length === -1) || false;
      }
      return {
        ...type,
        allowLength,
        allowPrecision: type.name === 'numeric' || type.name === 'numeric[]',
      } as Type;
    });
  },

  async listCols(schemaName: string, tableName: string) {
    const regclass = `'${label(schemaName)}.${label(tableName)}'::regclass`;
    const res = await list(
      `
      SELECT
        a.attname column_name,
        a.attnotnull OR ((t.typtype = 'd'::"char") AND t.typnotnull) not_null,
        pg_catalog.format_type(a.atttypid, null) data_type,
        (
          CASE
              WHEN (a.attgenerated = ''::"char")
              THEN pg_get_expr(ad.adbin, ad.adrelid)
              ELSE NULL::text
          END
        )::information_schema.character_data column_default,
        i.indisprimary IS NOT NULL is_primary,
        CASE
          WHEN
            cols.character_maximum_length IS NULL AND
            pg_catalog.format_type(a.atttypid, null) = 'numeric'
          THEN cols.numeric_precision
          ELSE cols.character_maximum_length
          END length,
        cols.numeric_scale scale,
        (
          SELECT
            pg_catalog.col_description (c.oid, a.attnum::int)
          FROM
            pg_catalog.pg_class c
          WHERE
            c.oid = ${regclass}::oid AND
            c.relname = $2
        ) AS comment
      FROM pg_attribute a
      LEFT JOIN pg_type t
      ON t.oid = a.atttypid
      LEFT JOIN pg_attrdef ad
      ON a.attrelid = ad.adrelid AND a.attnum = ad.adnum
      LEFT JOIN information_schema.columns cols
      ON
        a.attname = cols.column_name AND
        cols.table_schema = $1 AND
        cols.table_name   = $2
      LEFT JOIN pg_index i
      ON
        i.indisprimary AND
        i.indrelid = ${regclass} AND
        a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
      WHERE
        a.attrelid = ${regclass} AND
        a.attnum > 0 AND
        NOT a.attisdropped
        `,
      [schemaName, tableName]
    );
    return res as {
      column_name: string;
      data_type: string;
      column_default: string;
      not_null: boolean | string;
      comment: string | null;
      length: number;
      scale: number;
      is_primary: boolean;
    }[];
  },

  async listIndexes(schemaName: string, tableName: string) {
    const res = await list(
      `
      SELECT
        c.relname "name",
        pg_get_indexdef(c.oid) "definition",
        (select amname FROM pg_am WHERE pg_am.oid = c.relam) "type",
        i.indisprimary pk,
        ARRAY (
          ${
            '' /*
          SELECT a.attname || ''
          FROM pg_attribute a
          WHERE
          	a.attrelid = c.oid and
            a.attnum = ANY(i.indkey) */
          }
          SELECT name FROM (
          	SELECT pg_get_indexdef(c.oid,generate_series(1,20),true) name ) as aux
          WHERE aux.name != '' AND aux.name IS NOT NULL
        ) cols,
        (SELECT description FROM pg_description d WHERE d.objoid = c.oid) "comment"
      FROM pg_class c
      INNER JOIN pg_index i ON i.indexrelid = c.oid
      WHERE c.relkind = 'i' AND
        i.indrelid = (
          SELECT t.oid FROM pg_class t
          WHERE t.relnamespace = (select oid FROM pg_namespace WHERE nspname = $1) AND
          t.relname = $2)`,
      [schemaName, tableName]
    );
    return res as {
      name: string;
      comment: string | null;
      definition: string | null;
      type: string;
      pk: boolean;
      cols: string[];
    }[];
  },

  async listAll() {
    const sql = `
      SELECT current_schema() "currentSchema", (
        SELECT array_to_json(array_agg(aux.*))
        FROM
          (select oid schema_id, nspname "name"
             FROM pg_catalog.pg_namespace
          WHERE
            nspname != 'pg_toast' AND
            nspname NOT LIKE 'pg_temp_%' AND
            nspname NOT LIKE 'pg_toast_temp_%') as aux) "schemas",
        (SELECT array_to_json(array_agg(aux.*))
        FROM (
          SELECT
            relnamespace schema_id,
            relname as "name",
            CASE
              WHEN relkind IN ('v') THEN 'VIEW'
              WHEN relkind IN ('m') THEN 'MATERIALIZED VIEW'
              WHEN relkind IN ('r') THEN 'BASE TABLE'
              when relkind in ('S') then 'SEQUENCE'
              ELSE relkind||'' END as type
          FROM pg_class t
          WHERE
            relkind IN ('m','v','r','S')
          UNION
          SELECT
            pg_type.typnamespace schema_id,
            typname "name",
            'DOMAIN' "type"
          FROM pg_catalog.pg_type
            WHERE typtype = 'd'
          UNION
          SELECT
              p.pronamespace schema_id,
              p.proname || '('||oidvectortypes(proargtypes)||')' "name",
              -- prolang = 12 internal,
              'FUNCTION' "type"
          FROM pg_proc p
          ORDER BY "name"
          ) aux) entities
          `;
    const { schemas, entities, currentSchema } = (await first(sql)) as {
      schemas: { name: string; schema_id: number }[];
      entities: {
        type: EntityType;
        name: string;
        schema_id: number;
      }[];
      currentSchema: string;
    };
    schemas.sort((a, b) => {
      if (a.name === 'pg_catalog') return 1;
      if (b.name === 'pg_catalog') return -1;
      if (a.name === 'information_schema') return 1;
      if (b.name === 'information_schema') return -1;
      if (a.name === currentSchema) return -1;
      if (b.name === currentSchema) return 1;
      return a.name.localeCompare(b.name);
    });
    return schemas.map((s) => ({
      name: s.name,
      internal: s.name === 'pg_catalog' || s.name === 'information_schema',
      current: s.name === currentSchema,
      tables: entities
        .filter(
          (e) =>
            e.schema_id === s.schema_id &&
            (e.type === 'MATERIALIZED VIEW' ||
              e.type === 'VIEW' ||
              e.type === 'BASE TABLE')
        )
        .map((v) => ({ name: v.name, type: v.type })) as {
        type: EntityType & ('MATERIALIZED VIEW' | 'VIEW' | 'BASE TABLE');
        name: string;
      }[],
      functions: entities
        .filter((e) => e.schema_id === s.schema_id && e.type === 'FUNCTION')
        .map((v) => ({ name: v.name, type: v.type })) as {
        type: EntityType & 'FUNCTION';
        name: string;
      }[],
      sequences: entities
        .filter((e) => e.schema_id === s.schema_id && e.type === 'SEQUENCE')
        .map((v) => ({ name: v.name, type: v.type })) as {
        type: EntityType & 'SEQUENCE';
        name: string;
      }[],
      domains: entities
        .filter((e) => e.schema_id === s.schema_id && e.type === 'DOMAIN')
        .map((v) => ({ name: v.name, type: v.type })) as {
        type: EntityType & 'DOMAIN';
        name: string;
      }[],
    }));
  },

  async inOpenTransaction(id: number) {
    return (
      (await first(`
        select
          count(*) > 0 open
        from pg_stat_activity
        where
          state IN ('idle in transaction') and
          xact_start is not null and
          pid = ${id}
    `)) as { open: boolean }
    )?.open;
  },

  async existsSomePendingProcess(...ids: number[]): Promise<boolean> {
    if (ids.length === 0) return false;
    return (
      (await first(`
        select
          count(*) > 0 has
          -- xact_start <- data
        from pg_stat_activity
        where
          state IN ('idle in transaction','active') and
          xact_start is not null and
          pid IN (${ids.join(', ')})
    `)) as { has: boolean }
    )?.has;
  },

  async newColumn(
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
    }
  ) {
    const c = await openConnection();
    try {
      await c.query('BEGIN');
      await query(
        `ALTER TABLE ${label(schema)}.${label(table)} ADD COLUMN ${label(
          col.name
        )} ${col.type}${
          col.length ? `(${col.length}${col.scale ? `,${col.scale}` : ''})` : ''
        }${col.notNull ? ' NOT NULL' : ''}${
          col.default ? ` DEFAULT ${col.default}` : ''
        }`
      );
      if (col.comment)
        await c.query(
          `COMMENT ON COLUMN ${label(schema)}.${label(table)}.${label(
            col.name
          )} IS ${str(col.comment)}`
        );
      await c.query('COMMIT');
    } catch (err) {
      await c.query('ROLLBACK');
      throw err;
    } finally {
      c.release(true);
    }
  },

  async cancelBackend(pid: number) {
    return query('SELECT pg_cancel_backend($1)', [pid]);
  },
  async createSchema(schemaName: string) {
    await query(`CREATE SCHEMA ${label(schemaName)}`);
  },
  async dropSchema(schemaName: string, cascade = false) {
    await query(`DROP SCHEMA ${label(schemaName)} ${cascade ? 'CASCADE' : ''}`);
  },
  async dropTable(schema: string, name: string, cascade = false) {
    await query(
      `DROP TABLE ${label(schema)}.${label(name)} ${cascade ? 'CASCADE' : ''}`
    );
  },
  async dropFunction(schema: string, name: string, cascade = false) {
    await query(
      `DROP FUNCTION ${label(schema)}.${label(name)} ${
        cascade ? 'CASCADE' : ''
      }`
    );
  },
  async dropDomain(schema: string, name: string, cascade = false) {
    await query(
      `DROP DOMAIN ${label(schema)}.${label(name)} ${cascade ? 'CASCADE' : ''}`
    );
  },
  async dropSequence(schema: string, name: string, cascade = false) {
    await query(
      `DROP SEQUENCE ${label(schema)}.${label(name)} ${
        cascade ? 'CASCADE' : ''
      }`
    );
  },
};
