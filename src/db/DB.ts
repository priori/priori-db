import { grantError } from 'util/errors';
import { list, first, query, openConnection } from './Connection';
import {
  EntityType,
  SequencePrivileges,
  TablePrivileges,
  Type,
} from '../types';

function schemaCompare(a: string, b: string, publics: string[]) {
  const aPublic = publics.includes(a);
  const bPublic = publics.includes(b);
  return aPublic && !bPublic
    ? -1
    : !aPublic && bPublic
    ? 1
    : (a === 'information_schema' || a === 'pg_catalog') &&
      !(b === 'information_schema' || b === 'pg_catalog')
    ? 1
    : !(a === 'information_schema' || a === 'pg_catalog') &&
      (b === 'information_schema' || b === 'pg_catalog')
    ? -1
    : a.localeCompare(b);
}

export function label(s: string) {
  return `"${s.replaceAll('"', '""')}"`;
}

function str(s: string) {
  return `'${s.replace(/'/g, "''").replace(/\\/g, '\\\\')}'`;
}

export const DB = {
  async updateSchemaComment(schema: string, comment: string) {
    await query(`
      COMMENT ON SCHEMA ${label(schema)} IS ${str(comment)}
    `);
  },

  async renameSchema(schema: string, name: string) {
    await query(`
      ALTER SCHEMA ${label(schema)} RENAME TO ${label(name)}
    `);
  },

  async tableComment(schema: string, table: string) {
    const res = await first(`
      SELECT obj_description('${label(schema)}.${label(
        table,
      )}'::regclass) "comment"
    `);
    return res.comment as string | null;
  },

  async alterSchemaOwner(schema: string, owner: string) {
    await query(`
      ALTER SCHEMA ${label(schema)} OWNER TO ${label(owner)}
    `);
  },

  async alterTableOwner(schema: string, table: string, owner: string) {
    await query(`
      ALTER TABLE ${label(schema)}.${label(table)}
      OWNER TO ${label(owner)}
    `);
  },

  async alterFuncOwner(schema: string, name: string, owner: string) {
    await query(`
      ALTER FUNCTION ${label(schema)}.${name}
      OWNER TO ${label(owner)}
    `);
  },

  async alterSequenceOwner(schema: string, name: string, owner: string) {
    await query(`
      ALTER SEQUENCE ${label(schema)}.${label(name)}
      OWNER TO ${label(owner)}
    `);
  },

  async alterTypeOwner(schema: string, name: string, owner: string) {
    await query(`
      ALTER TYPE ${label(schema)}.${label(name)}
      OWNER TO ${label(owner)}
    `);
  },

  async tableSize(schema: string, table: string) {
    const c = await openConnection();
    try {
      await c.query('BEGIN');
      await c.query("SET statement_timeout TO '1s'");
      const r = await c.query(`
      SELECT
      pg_size_pretty(pg_total_relation_size('${label(schema)}.${label(
        table,
      )}'::regclass)) "pretty",
      pg_total_relation_size('${label(schema)}.${label(
        table,
      )}'::regclass) "size",
        pg_size_pretty(pg_table_size('${label(schema)}.${label(
          table,
        )}'::regclass)) "onlyTable",
        pg_size_pretty(pg_indexes_size('${label(schema)}.${label(
          table,
        )}'::regclass)) "indexes"
        `);
      await c.query('COMMIT');
      const info = r.rows[0] as {
        pretty: string;
        onlyTable: string;
        indexes: string;
        size: string;
      };
      return {
        ...info,
        size: parseInt(info.size, 10),
      };
    } catch (e) {
      await c.query('ROLLBACK');
      throw grantError(e);
    } finally {
      c.release(true);
    }
  },

  async dropRole(name: string) {
    await query(`DROP ROLE ${label(name)}`);
  },

  async updateRoleComment(name: string, text: string) {
    await query(`COMMENT ON ROLE ${label(name)} IS ${str(text)}`);
  },

  async renameRole(name: string, name2: string) {
    await query(`ALTER ROLE ${label(name)} RENAME TO ${label(name2)}`);
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
    },
  ) {
    const c = await openConnection();
    try {
      await c.query('BEGIN');
      if (update.name && update.name !== column)
        await c.query(
          `ALTER TABLE ${label(schema)}.${label(table)} RENAME COLUMN ${label(
            column,
          )} TO ${label(update.name)}`,
        );
      if (update.comment !== undefined) {
        if (update.comment) {
          await c.query(
            `COMMENT ON COLUMN ${label(schema)}.${label(table)}.${label(
              update.name || column,
            )} IS ${str(update.comment)}`,
          );
        } else {
          await c.query(
            `COMMENT ON COLUMN ${label(schema)}.${label(table)}.${label(
              update.name || column,
            )} IS NULL`,
          );
        }
      }
      if (update.type !== undefined) {
        await c.query(
          `ALTER TABLE ${label(schema)}.${label(table)} ALTER COLUMN ${label(
            update.name || column,
          )} TYPE ${update.type}${
            update.length
              ? `(${update.length}${update.scale ? `, ${update.scale}` : ''})`
              : ''
          }`,
        );
      }
      if (update.notNull !== undefined) {
        if (update.notNull) {
          await c.query(
            `ALTER TABLE ${label(schema)}.${label(table)} ALTER COLUMN ${label(
              update.name || column,
            )} SET NOT NULL`,
          );
        } else {
          await c.query(
            `ALTER TABLE ${label(schema)}.${label(table)} ALTER COLUMN ${label(
              update.name || column,
            )} DROP NOT NULL`,
          );
        }
      }
      if (update.default !== undefined) {
        if (update.default) {
          await c.query(
            `ALTER TABLE ${label(schema)}.${label(table)} ALTER COLUMN ${label(
              update.name || column,
            )} SET DEFAULT ${update.default}`,
          );
        } else {
          await c.query(
            `ALTER TABLE ${label(schema)}.${label(table)} ALTER COLUMN ${label(
              update.name || column,
            )} DROP DEFAULT`,
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
    update: { comment?: string | null; name?: string; schema?: string },
  ) {
    return DB.updateEntity('SEQUENCE', schema, table, update);
  },

  async updateSequenceValue(schema: string, name: string, value: string) {
    if (!value || !value.match(/^(\d+|\.)+$/))
      throw new Error(`Invalid sequence value (${value})`);
    await query(
      `ALTER SEQUENCE ${label(schema)}.${label(name)} RESTART WITH ${value}`,
    );
  },

  async updateTable(
    schema: string,
    table: string,
    update: { comment?: string | null; name?: string; schema?: string },
  ) {
    return DB.updateEntity('TABLE', schema, table, update);
  },

  async updateView(
    schema: string,
    table: string,
    update: { comment?: string | null; name?: string; schema?: string },
  ) {
    return DB.updateEntity('VIEW', schema, table, update);
  },

  async updateDomain(
    schema: string,
    table: string,
    update: { comment?: string | null; name?: string; schema?: string },
  ) {
    return DB.updateEntity('DOMAIN', schema, table, update);
  },

  async updateMView(
    schema: string,
    table: string,
    update: { comment?: string | null; name?: string; schema?: string },
  ) {
    return DB.updateEntity('MATERIALIZED VIEW', schema, table, update);
  },

  async updateFunction(
    schema: string,
    name: string,
    update: { comment?: string | null; name?: string; schema?: string },
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
    update: { comment?: string | null; name?: string; schema?: string },
  ) {
    const c = await openConnection();
    try {
      await c.query('BEGIN');
      if (update.comment) {
        await c.query(
          `COMMENT ON ${entityType} ${label(schema)}.${label(table)} IS ${str(
            update.comment,
          )}`,
        );
      } else if (update.comment !== undefined) {
        await c.query(
          `COMMENT ON ${entityType} ${label(schema)}.${label(table)} IS NULL`,
        );
      }
      if (update.name) {
        await c.query(
          `ALTER ${entityType} ${label(schema)}.${label(
            table,
          )} RENAME TO ${label(update.name)}`,
        );
      }
      if (update.schema) {
        await c.query(
          `ALTER ${entityType} ${label(schema)}.${label(
            table,
          )} SET SCHEMA ${label(update.schema)}`,
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
      `ALTER TABLE ${label(schema)}.${label(table)} DROP COLUMN ${label(col)}`,
    );
  },

  async removeIndex(schema: string, _: string, index: string) {
    await query(`DROP INDEX ${label(schema)}.${label(index)}`);
  },

  async commentIndex(
    schema: string,
    _: string,
    index: string,
    comment: string,
  ) {
    await query(
      `COMMENT ON INDEX ${label(schema)}.${label(index)} IS ${
        comment ? str(comment) : 'NULL'
      }`,
    );
  },

  async commentColumn(
    schema: string,
    table: string,
    col: string,
    comment: string,
  ) {
    await query(
      `COMMENT ON COLUMN ${label(schema)}.${label(table)}.${label(col)} IS ${
        comment ? str(comment) : 'NULL'
      }`,
    );
  },

  async renameIndex(schema: string, _: string, index: string, newName: string) {
    await query(
      `ALTER INDEX ${label(schema)}.${label(index)} RENAME TO ${label(
        newName,
      )}`,
    );
  },

  async renameColumn(
    schema: string,
    table: string,
    col: string,
    newName: string,
  ) {
    await query(
      `ALTER TABLE ${label(schema)}.${label(table)} RENAME COLUMN ${label(
        col,
      )} TO ${label(newName)}`,
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
    ),
  ) {
    const c = await openConnection();
    try {
      await c.query('BEGIN');
      if (update.comment) {
        await c.query(
          `COMMENT ON COLUMN ${label(schema)}.${label(tabela)}.${label(
            column,
          )} IS $1;`,
          [update.comment],
        );
      } else if (update.comment !== undefined) {
        await c.query(
          `COMMENT ON COLUMN ${label(schema)}.${label(tabela)}.${label(
            column,
          )} IS NULL`,
        );
      }
      if (update.name) {
        await c.query(
          `ALTER TABLE ${label(schema)}.${label(tabela)} RENAME COLUMN ${label(
            column,
          )} TO ${label(update.name)}`,
        );
      }
      if (update.type) {
        await c.query(
          `ALTER TABLE ${label(schema)}.${label(tabela)} ALTER COLUMN ${label(
            column,
          )} TYPE ${update.type}${
            update.length
              ? `(${update.length}${update.scale ? `, ${update.scale}` : ''})`
              : ''
          }`,
        );
      }
      if (update.notNull !== undefined) {
        if (update.notNull) {
          await c.query(
            `ALTER TABLE ${label(schema)}.${label(tabela)} ALTER COLUMN ${label(
              column,
            )} SET NOT NULL`,
          );
        } else {
          await c.query(
            `ALTER TABLE ${label(schema)}.${label(tabela)} ALTER COLUMN ${label(
              column,
            )} DROP NOT NULL`,
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
      [schema, table],
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
      [schema, table],
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
      [schema, table],
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
      [schema, name],
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
      [schema, name],
    );
  },

  async lastValue(schema: string, name: string) {
    const r = await first(
      `SELECT last_value FROM ${label(schema)}.${label(name)}`,
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
        ) || '' column_default,
        i.indisprimary IS NOT NULL is_primary,

        CASE
          WHEN
            (information_schema._pg_char_max_length(information_schema._pg_truetypid(a.*, t.*), information_schema._pg_truetypmod(a.*, t.*))) IS NULL AND
            pg_catalog.format_type(a.atttypid, null) = 'numeric'
          THEN (information_schema._pg_numeric_precision(information_schema._pg_truetypid(a.*, t.*), information_schema._pg_truetypmod(a.*, t.*)))
          ELSE (information_schema._pg_char_max_length(information_schema._pg_truetypid(a.*, t.*), information_schema._pg_truetypmod(a.*, t.*)))
          END length,

        (information_schema._pg_numeric_scale(information_schema._pg_truetypid(a.*, t.*), information_schema._pg_truetypmod(a.*, t.*))) scale,

        (
          SELECT
            pg_catalog.col_description (c.oid, a.attnum::int)
          FROM
            pg_catalog.pg_class c
          WHERE
            c.oid = ${regclass}::oid AND
            c.relname = $1
        ) AS "comment"
      FROM pg_attribute a
      LEFT JOIN pg_type t
      ON t.oid = a.atttypid
      LEFT JOIN pg_attrdef ad
      ON a.attrelid = ad.adrelid AND a.attnum = ad.adnum
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
      [tableName],
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

  async pks(schemaName: string, tableName: string) {
    const cols = await this.listCols(schemaName, tableName);
    return cols.filter((c) => c.is_primary).map((c) => c.column_name);
  },

  async defaultSort(schema: string, tableName: string) {
    const e = await first(
      `
      SELECT pg_get_indexdef(c.oid) "definition"
      FROM pg_class c
      INNER JOIN pg_index i ON i.indexrelid = c.oid
      WHERE c.relkind = 'i' AND
        i.indrelid = (
          SELECT t.oid FROM pg_class t
          WHERE t.relnamespace = (
            SELECT oid FROM pg_namespace WHERE nspname = $1
          ) AND
          t.relname = $2
        ) AND
        i.indisprimary`,
      [schema, tableName],
    );
    if (e && e.definition && typeof e.definition === 'string') {
      const order = e.definition.replace(/.*\((.*)\)/g, '$1');
      if (order) {
        const parts = [] as string[];
        let i = 0;
        let prevComa = 0;
        let inString = false;
        while (i < order.length) {
          const ch = order.charAt(i);
          if (ch === '"') {
            inString = !inString;
          }
          if (ch === ',' && !inString) {
            parts.push(order.substring(prevComa, i));
            prevComa = i + 1;
          }
          i += 1;
        }
        parts.push(order.substring(prevComa, i));
        return parts.map((p) => {
          let name = p.trim();
          if (name.startsWith('"')) {
            if (!name.endsWith('"'))
              throw new Error(`Not possible to parse order ${order}`);
            name = name.substring(1, name.length - 1).replace(/""/g, '"');
          }
          return { field: name, direction: 'asc' };
        });
      }
    }
    return null;
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
          SELECT "name" FROM (
          	SELECT pg_get_indexdef(c.oid,generate_series(1,20),true) "name" ) as aux
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
      [schemaName, tableName],
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

  async listConstrants(schema: string, table: string) {
    return list(
      `
      SELECT conname "name",
        CASE
          WHEN contype = 'c' THEN 'CHECK'
          WHEN contype = 'f' THEN 'FOREIGN KEY'
          WHEN contype = 'p' THEN 'PRIMARY KEY'
          WHEN contype = 'u' THEN 'UNIQUE'
          WHEN contype = 't' THEN 'TRIGGER'
          WHEN contype = 'x' THEN 'EXCLUSION'
        END "type",
        pg_get_constraintdef(con.oid) definition,
        obj_description(con.oid) as "comment"
      FROM pg_catalog.pg_constraint con
      INNER JOIN pg_catalog.pg_class rel
      ON rel.oid = con.conrelid
      INNER JOIN pg_catalog.pg_namespace nsp
      ON nsp.oid = connamespace
      WHERE nsp.nspname = $1 AND  rel.relname = $2
        `,
      [schema, table],
    ) as Promise<
      {
        name: string;
        type: string;
        definition: string;
        comment: string | null;
      }[]
    >;
  },

  async updatePrivileges(
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
  ) {
    const c = await openConnection();
    try {
      await c.query('BEGIN');
      if (privileges.update !== undefined) {
        await c.query(
          `${privileges.update ? 'GRANT' : 'REVOKE'} UPDATE ON ${label(
            schema,
          )}.${label(table)} ${privileges.update ? ' TO ' : ' FROM '} ${label(
            grantee,
          )}`,
        );
      }
      if (privileges.select !== undefined) {
        await c.query(
          `${privileges.select ? 'GRANT' : 'REVOKE'} SELECT ON ${label(
            schema,
          )}.${label(table)} ${privileges.select ? ' TO ' : ' FROM '} ${label(
            grantee,
          )}`,
        );
      }
      if (privileges.insert !== undefined) {
        await c.query(
          `${privileges.insert ? 'GRANT' : 'REVOKE'} INSERT ON ${label(
            schema,
          )}.${label(table)} ${privileges.insert ? ' TO ' : ' FROM '} ${label(
            grantee,
          )}`,
        );
      }
      if (privileges.delete !== undefined) {
        await c.query(
          `${privileges.delete ? 'GRANT' : 'REVOKE'} DELETE ON ${label(
            schema,
          )}.${label(table)} ${privileges.delete ? ' TO ' : ' FROM '} ${label(
            grantee,
          )}`,
        );
      }
      if (privileges.truncate !== undefined) {
        await c.query(
          `${privileges.truncate ? 'GRANT' : 'REVOKE'} TRUNCATE ON ${label(
            schema,
          )}.${label(table)} ${privileges.truncate ? ' TO ' : ' FROM '} ${label(
            grantee,
          )}`,
        );
      }
      if (privileges.references !== undefined) {
        await c.query(
          `${privileges.references ? 'GRANT' : 'REVOKE'} REFERENCES ON ${label(
            schema,
          )}.${label(table)} ${
            privileges.references ? ' TO ' : ' FROM '
          } ${label(grantee)}`,
        );
      }
      if (privileges.trigger !== undefined) {
        await c.query(
          `${privileges.trigger ? 'GRANT' : 'REVOKE'} TRIGGER ON ${label(
            schema,
          )}.${label(table)} ${privileges.trigger ? ' TO ' : ' FROM '} ${label(
            grantee,
          )}`,
        );
      }
      await c.query('COMMIT');
    } catch (e) {
      c.query('ROLLBACK');
      throw grantError(e);
    } finally {
      c.release(true);
    }
  },

  async updateSequencePrivileges(
    schema: string,
    table: string,
    grantee: string,
    privileges: {
      update?: boolean;
      select?: boolean;
      usage?: boolean;
    },
  ) {
    const c = await openConnection();
    try {
      await c.query('BEGIN');
      if (privileges.update !== undefined) {
        await c.query(
          `${privileges.update ? 'GRANT' : 'REVOKE'} UPDATE ON SEQUENCE ${label(
            schema,
          )}.${label(table)} ${privileges.update ? ' TO ' : ' FROM '} ${label(
            grantee,
          )}`,
        );
      }
      if (privileges.select !== undefined) {
        await c.query(
          `${privileges.select ? 'GRANT' : 'REVOKE'} SELECT ON SEQUENCE ${label(
            schema,
          )}.${label(table)} ${privileges.select ? ' TO ' : ' FROM '} ${label(
            grantee,
          )}`,
        );
      }
      if (privileges.usage !== undefined) {
        await c.query(
          `${privileges.usage ? 'GRANT' : 'REVOKE'} USAGE ON SEQUENCE ${label(
            schema,
          )}.${label(table)} ${privileges.usage ? ' TO ' : ' FROM '} ${label(
            grantee,
          )}`,
        );
      }
      await c.query('COMMIT');
    } catch (e) {
      c.query('ROLLBACK');
      throw grantError(e);
    } finally {
      c.release(true);
    }
  },

  async updateSchemaPrivileges(
    schema: string,
    grantee: string,
    privileges: {
      create?: boolean;
      usage?: boolean;
    },
  ) {
    const c = await openConnection();
    try {
      await c.query('BEGIN');
      if (privileges.create !== undefined) {
        await c.query(
          `${privileges.create ? 'GRANT' : 'REVOKE'} CREATE ON SCHEMA ${label(
            schema,
          )} ${privileges.create ? ' TO ' : ' FROM '} ${label(grantee)}`,
        );
      }
      if (privileges.usage !== undefined) {
        await c.query(
          `${privileges.usage ? 'GRANT' : 'REVOKE'} USAGE ON SCHEMA ${label(
            schema,
          )} ${privileges.usage ? ' TO ' : ' FROM '} ${label(grantee)}`,
        );
      }
      await c.query('COMMIT');
    } catch (e) {
      c.query('ROLLBACK');
      throw grantError(e);
    } finally {
      c.release(true);
    }
  },

  async publicsSchemas() {
    const res = await list(`SELECT current_schema() "name"`);
    return (res as { name: string }[]).map((r) => r.name);
  },

  async rolePrivileges(role: string) {
    const res = (await list(
      `
      SELECT
        (SELECT n.nspname FROM pg_namespace n WHERE n.oid = t.relnamespace) "schema",
        "relname" as "name",
        'table' "type",
        aux."privilege" privilege_type
      FROM pg_class t,
        (SELECT 'DELETE' "privilege" UNION SELECT 'INSERT' UNION SELECT 'REFERENCES'
        UNION SELECT 'SELECT' UNION SELECT 'TRIGGER' UNION SELECT 'TRUNCATE'
        UNION SELECT 'UPDATE') aux
      WHERE
        relkind IN ('m','v','r') AND
        pg_catalog.has_table_privilege($1, oid, aux."privilege" )

      UNION
      SELECT nspname, nspname, 'schema', "privilege"
      FROM pg_catalog.pg_namespace,
      	(SELECT 'CREATE' "privilege" UNION SELECT 'USAGE') aux
      WHERE
         nspname != 'pg_toast' AND
         nspname NOT LIKE 'pg_temp_%' AND
         nspname NOT LIKE 'pg_toast_temp_%' AND
         pg_catalog.has_schema_privilege($1, nspname, "privilege")

      UNION
      SELECT
        (SELECT n.nspname FROM pg_namespace n WHERE n.oid = p.pronamespace) "schema",
        p.proname || '('||oidvectortypes(proargtypes)||')' "name",
        'function',
        'EXECUTE'
      FROM pg_proc p
      WHERE pg_catalog.has_function_privilege($1, p.oid, 'EXECUTE')

      UNION
      SELECT
        (SELECT n.nspname FROM pg_namespace n WHERE n.oid = p.pronamespace) "schema",
        p.proname || '('||oidvectortypes(proargtypes)||')' "name",
        'function',
        'EXECUTE'
      FROM pg_proc p
      WHERE pg_catalog.has_function_privilege($1, p.oid, 'EXECUTE')

      UNION
      SELECT
        (SELECT n.nspname FROM pg_namespace n WHERE n.oid = t.relnamespace) "schema",
        "relname" as "name",
        'sequence' "type",
        aux."privilege" privilege_type
      FROM pg_class t,
        (SELECT 'USAGE' "privilege" UNION SELECT 'SELECT' UNION SELECT 'UPDATE') aux
      WHERE
        relkind = 'S' AND
        pg_catalog.has_sequence_privilege($1, oid, aux."privilege")

      UNION
      SELECT
        (SELECT n.nspname FROM pg_namespace n WHERE n.oid = pg_type.typnamespace),
        typname,
        'type',
        'USAGE'
      FROM pg_catalog.pg_type
      LEFT JOIN pg_catalog.pg_enum ON pg_enum.enumtypid = pg_type.oid
      WHERE
        pg_catalog.has_type_privilege($1, pg_type.oid, 'USAGE') AND (
          typtype = 'd' OR
          pg_enum.enumtypid IS NOT NULL)

      ORDER BY "schema", name`,
      [role],
    )) as {
      schema: string;
      name: string;
      privilege_type: string;
      type: 'table' | 'schema' | 'function' | 'sequence' | 'type';
    }[];

    const tables: {
      schema: string;
      table: string;
      privileges: TablePrivileges;
    }[] = [];
    const tablesOnly = res.filter((a) => a.type === 'table');
    for (const r of tablesOnly) {
      const ps = tablesOnly.filter(
        (t2) => t2.name === r.name && t2.schema === r.schema,
      );
      if (!tables.find((t) => t.table === r.name && r.schema === t.schema)) {
        tables.push({
          schema: r.schema,
          table: r.name,
          privileges: {
            delete: !!ps.find((r2) => r2.privilege_type === 'DELETE'),
            insert: !!ps.find((r2) => r2.privilege_type === 'INSERT'),
            references: !!ps.find((r2) => r2.privilege_type === 'REFERENCES'),
            select: !!ps.find((r2) => r2.privilege_type === 'SELECT'),
            trigger: !!ps.find((r2) => r2.privilege_type === 'TRIGGER'),
            truncate: !!ps.find((r2) => r2.privilege_type === 'TRUNCATE'),
            update: !!ps.find((r2) => r2.privilege_type === 'UPDATE'),
          },
        });
      }
    }
    const publics = await this.publicsSchemas();
    tables.sort(
      (a, b) =>
        schemaCompare(a.schema, b.schema, publics) ||
        a.table.localeCompare(b.table),
    );

    const sequences: {
      schema: string;
      name: string;
      privileges: SequencePrivileges;
    }[] = [];
    const sequencesOnly = res.filter((a) => a.type === 'sequence');
    for (const r of sequencesOnly) {
      const ss = sequencesOnly.filter(
        (t2) => t2.name === r.name && t2.schema === r.schema,
      );
      if (!sequences.find((t) => t.name === r.name && r.schema === t.schema)) {
        sequences.push({
          schema: r.schema,
          name: r.name,
          privileges: {
            usage: !!ss.find((r2) => r2.privilege_type === 'USAGE'),
            select: !!ss.find((r2) => r2.privilege_type === 'SELECT'),
            update: !!ss.find((r2) => r2.privilege_type === 'UPDATE'),
          },
        });
      }
    }

    const schemas = [] as {
      name: string;
      privileges: { usage: boolean; create: boolean };
    }[];
    const schemasOnly = res.filter((e) => e.type === 'schema');
    for (const s of schemasOnly
      .map((e) => e.schema)
      .filter((s2, i, a) => a.indexOf(s2) === i)) {
      schemas.push({
        name: s,
        privileges: {
          usage: !!schemasOnly.find(
            (r2) => r2.schema === s && r2.privilege_type === 'USAGE',
          ),
          create: !!schemasOnly.find(
            (r2) => r2.schema === s && r2.privilege_type === 'CREATE',
          ),
        },
      });
    }
    schemas.sort((a, b) => schemaCompare(a.name, b.name, publics));

    const functions = [] as {
      schema: string;
      name: string;
    }[];
    const functionsOnly = res.filter((e) => e.type === 'function');
    for (const f of functionsOnly) {
      functions.push({
        schema: f.schema,
        name: f.name,
      });
    }
    functions.sort(
      (a, b) =>
        schemaCompare(a.schema, b.schema, publics) ||
        a.name.localeCompare(b.name),
    );

    const types = [] as {
      schema: string;
      name: string;
    }[];

    const typesOnly = res.filter((e) => e.type === 'type');
    for (const f of typesOnly) {
      types.push({
        schema: f.schema,
        name: f.name,
      });
    }
    types.sort(
      (a, b) =>
        schemaCompare(a.schema, b.schema, publics) ||
        a.name.localeCompare(b.name),
    );

    return {
      tables,
      schemas,
      sequences,
      functions,
      types,
    };
  },

  async functionsPrivileges(schema: string, func: string) {
    const res = await list(
      `
      SELECT rolname "role"
      FROM pg_roles
      WHERE
        pg_catalog.has_function_privilege(rolname, '${label(
          schema,
        )}.${func}', 'EXECUTE')
        -- AND NOT rolname ~ '^pg_'
      `,
      [],
    );
    const rs = res.map((e) => e.role as string);
    rs.sort((a, b) => {
      if (a.startsWith('pg_') && !b.startsWith('pg_')) return 1;
      if (!a.startsWith('pg_') && b.startsWith('pg_')) return -1;
      return a.localeCompare(b);
    });
    return rs;
  },

  async sequencePrivileges(schema: string, name: string) {
    const res = await list(
      `
        SELECT rolname grantee, 'UPDATE' privilege_type
        FROM pg_roles
        WHERE
          pg_catalog.has_sequence_privilege(rolname, '${label(schema)}.${label(
            name,
          )}', 'UPDATE')
        UNION
        SELECT rolname grantee, 'SELECT' privilege_type
        FROM pg_roles
        WHERE
          pg_catalog.has_sequence_privilege(rolname, '${label(schema)}.${label(
            name,
          )}', 'SELECT')
        UNION
        SELECT rolname grantee, 'USAGE' privilege_type
        FROM pg_roles
        WHERE
          pg_catalog.has_sequence_privilege(rolname, '${label(schema)}.${label(
            name,
          )}', 'USAGE')
      `,
      [],
    );
    const byGrantee = [...new Set(res.map((r) => r.grantee))].map(
      (grantee) => ({
        roleName: grantee as string,
        privileges: {
          update: !!res.find(
            (r) => r.grantee === grantee && r.privilege_type === 'UPDATE',
          ),
          select: !!res.find(
            (r) => r.grantee === grantee && r.privilege_type === 'SELECT',
          ),
          usage: !!res.find(
            (r) => r.grantee === grantee && r.privilege_type === 'USAGE',
          ),
        },
      }),
    );
    byGrantee.sort((a, b) => {
      if (a.roleName.startsWith('pg_') && !b.roleName.startsWith('pg_'))
        return 1;
      if (!a.roleName.startsWith('pg_') && b.roleName.startsWith('pg_'))
        return -1;
      return a.roleName.localeCompare(b.roleName);
    });
    return byGrantee;
  },

  async schemaPrivileges(schema: string) {
    const res = await list(
      `
      SELECT rolname grantee, 'USAGE' privilege_type
      FROM pg_roles
      WHERE
        pg_catalog.has_schema_privilege(rolname, $1, 'USAGE')
      UNION
      SELECT rolname grantee, 'CREATE' privilege_type
      FROM pg_roles
      WHERE
        pg_catalog.has_schema_privilege(rolname, $1, 'CREATE')
    `,
      [schema],
    );
    const byGrantee = [...new Set(res.map((r) => r.grantee))].map(
      (grantee) => ({
        roleName: grantee as string,
        privileges: {
          create: !!res.find(
            (r) => r.grantee === grantee && r.privilege_type === 'CREATE',
          ),
          usage: !!res.find(
            (r) => r.grantee === grantee && r.privilege_type === 'USAGE',
          ),
        },
      }),
    );
    byGrantee.sort((a, b) => {
      if (a.roleName.startsWith('pg_') && !b.roleName.startsWith('pg_'))
        return 1;
      if (!a.roleName.startsWith('pg_') && b.roleName.startsWith('pg_'))
        return -1;
      return a.roleName.localeCompare(b.roleName);
    });
    return byGrantee;
  },

  async tablePrivileges(schema: string, table: string) {
    /*
    const res = await list(
      `
      SELECT
        "privilege_type",
        COALESCE(
          (SELECT pg_authid."rolname"
          FROM pg_authid
          WHERE pg_authid.oid = grantee), 'PUBLIC') "grantee"
      FROM
        (SELECT
            (aclexplode(COALESCE(pg_class.relacl, acldefault('r'::"char", pg_class.relowner)))).grantee AS "grantee",
            (aclexplode(COALESCE(pg_class.relacl, acldefault('r'::"char", pg_class.relowner)))).privilege_type AS "privilege_type"
          FROM pg_class
          WHERE
            (SELECT n.nspname FROM pg_namespace n WHERE n.oid = pg_class.relnamespace) = $1 AND
            relname = $2
        ) aux `,
      [schema, table],
    ); */
    const res = await list(
      `
      SELECT
      	"grantee",
        aux."privilege" privilege_type
      FROM pg_class t,
        (SELECT 'DELETE' "privilege" UNION SELECT 'INSERT' UNION SELECT 'REFERENCES'
        UNION SELECT 'SELECT' UNION SELECT 'TRIGGER' UNION SELECT 'TRUNCATE'
        UNION SELECT 'UPDATE') aux,
        (SELECT rolname "grantee" FROM pg_roles) roles
      WHERE
      	(SELECT n.nspname FROM pg_namespace n WHERE n.oid = t.relnamespace) = $1
        AND
         "relname" = $2 AND
        relkind IN ('m','v','r') AND
        pg_catalog.has_table_privilege(grantee, oid, aux."privilege" )
        `,
      [schema, table],
    ); /*
    const res3 = await list(
      `
      SELECT
        grantee,
        privilege_type
      FROM information_schema.table_privileges
      WHERE
        table_schema = $1 AND
        table_name = $2`,
      [schema, table],
    );
    console.log(res, res2, res3);
    */
    const byGrantee = [...new Set(res.map((r) => r.grantee))].map(
      (grantee) => ({
        roleName: grantee as string,
        privileges: {
          delete: !!res.find(
            (r) => r.grantee === grantee && r.privilege_type === 'DELETE',
          ),
          insert: !!res.find(
            (r) => r.grantee === grantee && r.privilege_type === 'INSERT',
          ),
          references: !!res.find(
            (r) => r.grantee === grantee && r.privilege_type === 'REFERENCES',
          ),
          select: !!res.find(
            (r) => r.grantee === grantee && r.privilege_type === 'SELECT',
          ),
          trigger: !!res.find(
            (r) => r.grantee === grantee && r.privilege_type === 'TRIGGER',
          ),
          truncate: !!res.find(
            (r) => r.grantee === grantee && r.privilege_type === 'TRUNCATE',
          ),
          update: !!res.find(
            (r) => r.grantee === grantee && r.privilege_type === 'UPDATE',
          ),
        },
      }),
    );
    byGrantee.sort((a, b) => {
      if (a.roleName.startsWith('pg_') && !b.roleName.startsWith('pg_'))
        return 1;
      if (!a.roleName.startsWith('pg_') && b.roleName.startsWith('pg_'))
        return -1;
      return a.roleName.localeCompare(b.roleName);
    });
    return byGrantee;
  },

  async listRoles() {
    const r = await (list(
      `
        SELECT rolname "name", usename IS NOT NULL "isUser"
        FROM pg_roles
        LEFT JOIN pg_user
        ON usename = rolname
      `,
      [],
    ) as Promise<{ name: string; isUser: boolean }[]>);
    r.sort((a, b) => {
      if (a.name.startsWith('pg_') && !b.name.startsWith('pg_')) return 1;
      if (!a.name.startsWith('pg_') && b.name.startsWith('pg_')) return -1;
      return a.name.localeCompare(b.name);
    });
    return r;
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
              ELSE relkind::text END as type
          FROM pg_class t
          WHERE
            relkind IN ('m','v','r','S')
          UNION
          SELECT
            pg_type.typnamespace schema_id,
            typname "name",
            CASE WHEN
              pg_enum.enumtypid IS NOT NULL THEN 'ENUM'
              ELSE 'DOMAIN' END "type"
          FROM pg_catalog.pg_type
          LEFT JOIN pg_catalog.pg_enum ON pg_enum.enumtypid = pg_type.oid
          WHERE
            typtype = 'd' OR
            pg_enum.enumtypid IS NOT NULL
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
              e.type === 'BASE TABLE'),
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
        .filter(
          (e) =>
            e.schema_id === s.schema_id &&
            (e.type === 'DOMAIN' || e.type === 'ENUM'),
        )
        .map((v) => ({ name: v.name, type: v.type })) as {
        type: EntityType & 'DOMAIN';
        name: string;
      }[],
    }));
  },

  async inOpenTransaction(id: number) {
    return (
      (await first(`
        SELECT
          count(*) > 0 open
        FROM pg_stat_activity
        WHERE
          state IN ('idle in transaction') AND
          xact_start IS NOT NULL AND
          pid = ${id}
    `)) as { open: boolean }
    )?.open;
  },

  async existsSomePendingProcess(...ids: number[]): Promise<boolean> {
    if (ids.length === 0) return false;
    return (
      (await first(`
        SELECT
          count(*) > 0 has
          -- xact_start <- data
        FROM pg_stat_activity
        WHERE
          state IN ('idle in transaction','active') and
          xact_start IS NOT NULL AND
          pid IN (${ids.join(', ')})
    `)) as { has: boolean }
    )?.has;
  },

  async newIndex(
    schema: string,
    table: string,
    cols: {
      name: string;
      sort?: 'asc' | 'desc' | undefined;
      nulls?: 'last' | 'first' | undefined;
    }[],
    method?: string | undefined,
    unique?: boolean | undefined,
  ) {
    const q = `CREATE${unique ? ' UNIQUE' : ''} INDEX ON ${label(
      schema,
    )}.${label(table)}${method ? ` USING ${method} ` : ''}(${cols
      .map(
        (c) =>
          `${label(c.name)}${
            c.sort === 'asc' ? ' ASC' : c.sort ? ' DESC' : ''
          }${
            c.nulls === 'first' ? ' NULLS FIRST' : c.nulls ? ' NULLS LAST' : ''
          }`,
      )
      .join(', ')})`;
    await query(q);
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
    },
  ) {
    const c = await openConnection();
    try {
      await c.query('BEGIN');
      await query(
        `ALTER TABLE ${label(schema)}.${label(table)} ADD COLUMN ${label(
          col.name,
        )} ${col.type}${
          col.length ? `(${col.length}${col.scale ? `,${col.scale}` : ''})` : ''
        }${col.notNull ? ' NOT NULL' : ''}${
          col.default ? ` DEFAULT ${col.default}` : ''
        }`,
      );
      if (col.comment)
        await c.query(
          `COMMENT ON COLUMN ${label(schema)}.${label(table)}.${label(
            col.name,
          )} IS ${str(col.comment)}`,
        );
      await c.query('COMMIT');
    } catch (err) {
      await c.query('ROLLBACK');
      throw err;
    } finally {
      c.release(true);
    }
  },

  async update(
    schema: string,
    table: string,
    updates: {
      where: { [fieldName: string]: string | number | null };
      values: { [fieldName: string]: string | null };
    }[],
    inserts: { [fieldName: string]: string | null }[],
  ) {
    const c = await openConnection();
    try {
      await c.query('BEGIN');
      for (const { where, values } of updates) {
        let count = 1;
        await c.query(
          `UPDATE ${label(schema)}.${label(table)} SET ${Object.keys(values)
            // eslint-disable-next-line no-plusplus
            .map((k) => `${label(k)} = $${count++}`)
            .join(', ')} WHERE ${Object.keys(where)
            // eslint-disable-next-line no-plusplus
            .map((k) => `${label(k)} = $${count++}`)
            .join(' AND ')}`,
          [...Object.values(values), ...Object.values(where)],
        );
      }
      for (const insert of inserts) {
        await c.query(
          `INSERT INTO ${label(schema)}.${label(table)} (${Object.keys(insert)
            .map((k) => label(k))
            .join(', ')}) VALUES (${Object.keys(insert)
            .map((_, i) => `$${i + 1}`)
            .join(', ')})`,
          Object.values(insert),
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
      `DROP TABLE ${label(schema)}.${label(name)} ${cascade ? 'CASCADE' : ''}`,
    );
  },

  async dropFunction(schema: string, name: string, cascade = false) {
    await query(
      `DROP FUNCTION ${label(schema)}.${name} ${cascade ? 'CASCADE' : ''}`,
    );
  },

  async dropDomain(schema: string, name: string, cascade = false) {
    await query(
      `DROP DOMAIN ${label(schema)}.${label(name)} ${cascade ? 'CASCADE' : ''}`,
    );
  },

  async dropSequence(schema: string, name: string, cascade = false) {
    await query(
      `DROP SEQUENCE ${label(schema)}.${label(name)} ${
        cascade ? 'CASCADE' : ''
      }`,
    );
  },

  async revokeFunction(schema: string, name: string, role: string) {
    const hasPublicPrivilege = (
      await first(`SELECT
        pg_catalog.has_function_privilege((0)::oid, '${label(
          schema,
        )}.${name}', 'EXECUTE') has`)
    ).has;
    if (hasPublicPrivilege) {
      const roles = (await list(
        `
        SELECT rolname "role"
        FROM pg_roles
        WHERE pg_catalog.has_function_privilege(rolname, '${label(
          schema,
        )}.${name}', 'EXECUTE')
        `,
        [],
      )) as { role: string }[];
      await query(`
          REVOKE EXECUTE ON FUNCTION ${label(schema)}.${name} FROM PUBLIC;
          ${roles
            .map(
              (r) =>
                `GRANT EXECUTE ON FUNCTION ${label(schema)}.${name} TO ${label(
                  r.role,
                )}`,
            )
            .join(';')};
          REVOKE EXECUTE ON FUNCTION ${label(schema)}.${name} FROM ${label(
            role,
          )}
      `);
    } else
      await query(`
        REVOKE EXECUTE ON FUNCTION ${label(schema)}.${name} FROM ${label(role)}
      `);
  },

  async grantFunction(schema: string, name: string, role: string) {
    await query(`
      GRANT EXECUTE ON FUNCTION ${label(schema)}.${name} TO ${label(role)}
    `);
  },

  async domainPrivileges(schema: string, name: string) {
    const res = (await list(
      `
      SELECT rolname "role"
      FROM pg_roles
      WHERE pg_catalog.has_type_privilege(rolname, '${label(schema)}.${label(
        name,
      )}', 'USAGE')`,
      [],
    )) as { role: string }[];
    const r = res.map((r2) => r2.role);
    r.sort((a, b) => {
      if (a.startsWith('pg_') && !b.startsWith('pg_')) return 1;
      if (!a.startsWith('pg_') && b.startsWith('pg_')) return -1;
      return a.localeCompare(b);
    });
    return r;
  },

  async grantDomain(schema: string, name: string, role: string) {
    await query(`
      GRANT USAGE ON TYPE ${label(schema)}.${label(name)} TO ${label(role)}
    `);
  },

  async revokeDomain(schema: string, name: string, role: string) {
    const hasPublicPrivilege = (
      await first(`SELECT
        pg_catalog.has_type_privilege((0)::oid, '${label(
          schema,
        )}.${name}', 'USAGE') has`)
    ).has;
    if (hasPublicPrivilege) {
      const roles = (await list(
        `
        SELECT rolname "role"
        FROM pg_roles
        WHERE pg_catalog.has_type_privilege(rolname, '${label(schema)}.${label(
          name,
        )}', 'USAGE')
        `,
        [],
      )) as { role: string }[];
      await query(`
          REVOKE USAGE ON TYPE ${label(schema)}.${label(name)} FROM PUBLIC;
          ${roles
            .map(
              (r) =>
                `GRANT USAGE ON TYPE ${label(schema)}.${label(name)} TO ${label(
                  r.role,
                )}`,
            )
            .join(';')};
          REVOKE USAGE ON TYPE ${label(schema)}.${label(name)} FROM ${label(
            role,
          )}
      `);
    } else
      await query(`
        REVOKE USAGE ON TYPE ${label(schema)}.${label(name)} FROM ${label(role)}
      `);
  },
};

