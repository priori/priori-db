import { Connection } from './Connection';
import { Type } from '../types';

export const DB = {
  async listDatabases() {
    const sql =
      'SELECT DISTINCT catalog_name db_name FROM information_schema.schemata;';
    return Connection.list(sql);
  },

  async listSchemas() {
    const res = await Connection.list(
      `
          SELECT schema_name "name"
          FROM information_schema.schemata
          WHERE
            catalog_name = CAST($1 as text) AND
            schema_name != 'pg_toast' AND
            schema_name NOT LIKE 'pg_temp_%' AND
            schema_name NOT LIKE 'pg_toast_temp_%'
             -- nspacl IS NOT NULL
           ORDER BY 1
        `,
      [Connection.database]
    );
    return res.map((i) => i.name as string);
  },

  async listEntitiesFromSchema(schemaName: string) {
    const entities = (await Connection.list(
      `SELECT
              relname as "name",
              CASE
              WHEN relkind IN ('v') THEN 'VIEW'
              WHEN relkind IN ('m') THEN 'MATERIALIZED VIEW'
              WHEN relkind IN ('r') THEN 'BASE TABLE'
              when relkind in ('S') then 'SEQUENCE'
              ELSE relkind||'' END as type
          FROM pg_class t
          WHERE t.relnamespace = (select n.oid FROM pg_namespace n WHERE n.nspname = $1)  AND
            relkind IN ('m','v','r','S')

            UNION

          select p.proname || '('||oidvectortypes(proargtypes)||')' "name", 'FUNCTION' "type" FROM pg_proc p
          WHERE p.pronamespace= (select n.oid FROM pg_namespace n WHERE n.nspname = $1) -- AND prolang != 12 -- internal

          ORDER BY 1`,
      [schemaName]
    )) as { type: string; name: string }[];

    const tables = entities.filter(
      (e) =>
        e.type === 'VIEW' ||
        e.type === 'BASE TABLE' ||
        e.type === 'MATERIALIZED VIEW'
    );

    return {
      tables,
      domains: [],
      functions: entities.filter((e) => e.type === 'FUNCTION'),
      collations: [],
      sequences: entities.filter((e) => e.type === 'SEQUENCE'),
    };
  },

  async types() {
    const types = (await Connection.list(`SELECT *
            FROM
                (SELECT
                    format_type(t.oid,NULL) AS name,
                    CASE WHEN typelem > 0 THEN typelem ELSE t.oid END as elemoid,
	        typlen length, typtype "type", t.oid, nspname,
                    (SELECT COUNT(1) FROM pg_type t2 WHERE t2.typname = t.typname) > 1 AS isdup,
                    CASE WHEN t.typcollation != 0 THEN TRUE ELSE FALSE END AS is_collatable
                FROM
                    pg_type t
                JOIN
                    pg_namespace nsp ON typnamespace=nsp.oid
                WHERE
                    (NOT (typname = 'unknown' AND nspname = 'pg_catalog'))
                AND
                    typisdefined AND typtype IN ('b', 'c', 'd', 'e', 'r')
            AND NOT EXISTS (SELECT 1 FROM pg_class WHERE relnamespace=typnamespace
            AND relname = typname AND relkind != 'c') AND
            (typname NOT LIKE '_%' OR NOT EXISTS (SELECT 1 FROM pg_class WHERE
            relnamespace=typnamespace AND relname = substring(typname FROM 2)::name
            AND relkind != 'c'))
            AND nsp.nspname != 'information_schema'

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

  async getSchema(schemaId: number) {
    const res = await Connection.list(
      `SELECT n.oid schema_id, n.nspname AS schema_name,
            pg_catalog.pg_get_userbyid(n.nspowner) AS schema_owner,
            pg_catalog.obj_description(n.oid, 'pg_namespace') AS schema_comment
            FROM pg_catalog.pg_namespace n
            WHERE n.oid = CAST($1 as text)
            ORDER BY 1;`,
      [schemaId]
    );
    return res;
  },

  async listTables() {
    // and views
    const res = await Connection.list(
      `SELECT
          s.catalog_name db, s.schema_name, t.table_name, t.table_type,
          t.is_insertable_into, t.is_typed,
          t.primary_key,
          t.primary_key_type,
          n.oid schema_id
          FROM information_schema.schemata s
          INNER JOIN pg_catalog.pg_namespace n ON n.nspname=s.schema_name
          LEFT JOIN (
            SELECT table_catalog db, table_schema schema_name,table_name,
              table_type, is_insertable_into, is_typed
              ,            array_agg(CASE WHEN cp.data_column IS NOT NULL THEN cp.data_column END) primary_key,
              array_agg(CASE WHEN cp.data_column IS NOT NULL THEN cp.data_type END) primary_key_type
              FROM information_schema.tables t
              LEFT JOIN (
                  SELECT a.attname data_column, format_type(a.atttypid, a.atttypmod) AS data_type, i.indrelid
                  FROM   pg_index i
                  JOIN   pg_attribute a ON a.attrelid = i.indrelid
                                      AND a.attnum = ANY(i.indkey)
              AND    i.indisprimary
              ) cp ON cp.indrelid = CONCAT(table_schema,'.',table_name)::regclass
              WHERE table_catalog= CAST($1 as text) AND (table_type in ('BASE TABLE', 'VIEW') OR table_type is null)
              GROUP BY table_catalog , table_schema,table_name,  table_type, is_insertable_into, is_typed
              ORDER BY table_schema, table_type, table_name
          ) AS t ON t.db=s.catalog_name AND t.schema_name=s.schema_name
          WHERE catalog_name = CAST($1 as text) and (n.nspname !~ '^pg_' OR n.nspname='pg_catalog')
          ORDER BY s.schema_name, t.table_type,t.table_name
          `,
      [Connection.database]
    );
    return res;
  },
  async listTablesFromSchema(schemaName: string) {
    // and views
    const res = await Connection.list(
      `SELECT
                  relname as "name",
                  CASE
                    WHEN relkind IN ('m') THEN 'MATERIALIZED VIEW'
                    WHEN relkind IN ('v') THEN 'VIEW'
                    ELSE 'BASE TABLE' END as type
              FROM pg_class t
              WHERE t.relnamespace = (select oid FROM pg_namespace WHERE nspname = $1) AND
                relkind IN ('m','v','r')
              ORDER BY relname`,
      [schemaName]
    );
    return res;
  },
  async listSequences(schemaName: string) {
    const res = await Connection.list(
      `SELECT
            *, sequence_name, data_type, minimum_value, maximum_value, start_value
          FROM information_schema.sequences
          WHERE sequence_catalog= CAST($1 as text) AND
            sequence_schema= CAST($2 as text) ;`,
      [Connection.database, schemaName]
    );
    return res;
  },
  async listFunctions(schemaName: string) {
    const res = await Connection.list(
      `SELECT  p.proname
          FROM  pg_catalog.pg_namespace n
          JOIN pg_catalog.pg_proc p ON p.pronamespace = n.oid
          WHERE n.nspname = CAST($1 as text) `,
      [schemaName]
    );
    return res;
  },
  async listDataTypes() {
    const res =
      await Connection.list(`SELECT DISTINCT pg_catalog.format_type(t.oid, NULL) d_types
          FROM pg_catalog.pg_type t
              LEFT JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
          WHERE (t.typrelid = 0 OR (SELECT c.relkind = 'c' FROM pg_catalog.pg_class c WHERE c.oid = t.typrelid))
          AND NOT EXISTS(SELECT 1 FROM pg_catalog.pg_type el WHERE el.oid = t.typelem AND el.typarray = t.oid)
          AND pg_catalog.pg_type_is_visible(t.oid)
          ORDER BY 1;`);
    return res;
  },
  listCols2(schemaName: string, tableName: string) {
    return Connection.list(`
            SELECT
            cols.column_name,
            cols.data_type,
            cols.column_default,
            i.indisprimary IS NOT NULL is_primary,
            CASE WHEN character_maximum_length IS NULL AND data_type = 'numeric' THEN numeric_precision ELSE character_maximum_length END length,
            numeric_scale scale,
                (
            SELECT
                pg_catalog.col_description(c.oid, cols.ordinal_position::int)
            FROM
                pg_catalog.pg_class c
            WHERE
                c.oid = '${schemaName}.${tableName}'::regclass::oid
                AND c.relname = cols.table_name
        ) AS comment
    FROM information_schema.columns cols
    LEFT JOIN pg_attribute a
    ON a.attrelid = '${schemaName}.${tableName}'::regclass AND a.attname = column_name

    LEFT JOIN pg_index i
    ON i.indisprimary AND i.indrelid = '${schemaName}.${tableName}'::regclass AND
        a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
    WHERE table_schema = '${schemaName}'
        AND table_name   = '${tableName}'
        `);
  },
  async listCols(schemaName: string, tableName: string) {
    const res = await Connection.list(
      `SELECT ordinal_position, column_name, COLUMNS.data_type, COLUMNS.udt_name udt_type,
          CASE WHEN COLUMNS.data_type='ARRAY' THEN e.data_type||'[]' WHEN (column_default ilike 'nextval(%' AND is_nullable='NO') THEN 'serial' ELSE COLUMNS.data_type END field_type,
          column_default, CASE WHEN is_nullable='YES' THEN true else false end is_nullable, COLUMNS.character_maximum_length,
          COLUMNS.numeric_precision, COLUMNS.numeric_scale decimal_precision, c.constraint_type,
          CASE WHEN c.constraint_type='PRIMARY KEY' THEN 'PK' WHEN c.constraint_type='FOREIGN KEY' THEN 'FK' WHEN c.constraint_type='UNIQUE' THEN 'UN' ELSE null END contraint_display,
          c.f_table , c.f_col, c.constraint_name,
          c1.description, false editing
          FROM INFORMATION_SCHEMA.COLUMNS
          LEFT JOIN (
              SELECT c.table_catalog db, c.table_schema sch,c.table_name tb,c.column_name col,pgd.description
              FROM pg_catalog.pg_statio_all_tables as st
              inner join pg_catalog.pg_description pgd on (pgd.objoid=st.relid)
              inner join information_schema.columns c on (pgd.objsubid=c.ordinal_position
                  and  c.table_schema=st.schemaname and c.table_name=st.relname)
          ) c1 ON c1.db=table_catalog AND c1.sch=table_schema AND c1.tb=table_name AND c1.col=column_name
          LEFT JOIN information_schema.element_types e
              ON ((table_catalog, table_schema, table_name, 'TABLE', COLUMNS.dtd_identifier)
              = (e.object_catalog, e.object_schema, e.object_name, e.object_type, e.collection_type_identifier))
          LEFT JOIN (
              SELECT DISTINCT tc.table_catalog dg, tc.constraint_schema sch,
                  tc.table_name tb, kcu.column_name col_name,
                  CASE WHEN tc.constraint_type='FOREIGN KEY' THEN ccu.table_name ELSE null END AS f_table,
                  CASE WHEN tc.constraint_type='FOREIGN KEY' THEN ccu.column_name ELSE null END f_col,
                  tc.constraint_name, tc.constraint_type
              FROM information_schema.table_constraints AS tc
              JOIN information_schema.key_column_usage AS kcu
                  ON tc.constraint_name = kcu.constraint_name
              JOIN information_schema.constraint_column_usage AS ccu
                  ON ccu.constraint_name = tc.constraint_name
                  WHERE tc.constraint_type in ('PRIMARY KEY', 'UNIQUE', 'FOREIGN KEY')
          ) as c ON c.dg=table_catalog AND c.sch=table_schema AND c.tb=table_name AND c.col_name=column_name
          WHERE table_catalog= CAST($1 as text) AND table_schema= CAST($2 as text) AND table_name = $3 ;`,
      [Connection.database, schemaName, tableName]
    );
    return res;
  },
  async listIndexes(schemaName: string, tableName: string) {
    const res = await Connection.list(
      `SELECT
              c.relname "name",
              pg_get_indexdef(c.oid) "definition",
              (select amname FROM pg_am WHERE pg_am.oid = c.relam) "type",
              i.indisprimary pk,
              ARRAY ( SELECT pg_get_indexdef(c.oid,1,true) ) cols
              -- (SELECT description FROM pg_description d WHERE d.objoid = c.oid) "description",
            FROM pg_class c
            INNER JOIN pg_index i ON i.indexrelid = c.oid
            WHERE c.relkind = 'i' AND
              i.indrelid = (SELECT t.oid FROM pg_class t
                            WHERE t.relnamespace = (select oid FROM pg_namespace WHERE nspname = $1) AND
               		  t.relname = $2)`,
      [schemaName, tableName]
    );
    // for ( const i of res ) {
    //     const cols =
    // }
    return res as {
      name: string;
      definition: string;
      type: string;
      pk: boolean;
      cols: {
        column_name: string;
        data_type: string;
        column_default: string;
        is_nullable: boolean | string;
        comment: string;
        length: number;
        scale: number;
        is_primary: boolean;
      }[];
    }[];
  },

  async listTableMetadata(schemaName: string, tableName: string) {
    const sql = `
            SELECT DISTINCT
                a.attnum as num,
                a.attname as name,
                format_type(a.atttypid, a.atttypmod) as typ,
                a.attnotnull as notnull,
                com.description as comment,
                coalesce(i.indisprimary,false) as primary_key,
                def.adsrc as default
            FROM pg_attribute a
            JOIN pg_class pgc ON pgc.oid = a.attrelid
            LEFT JOIN pg_index i ON
                (pgc.oid = i.indrelid AND i.indkey[0] = a.attnum)
            LEFT JOIN pg_description com on
                (pgc.oid = com.objoid AND a.attnum = com.objsubid)
            LEFT JOIN pg_attrdef def ON
                (a.attrelid = def.adrelid AND a.attnum = def.adnum)
            LEFT JOIN pg_namespace nsp ON nsp.oid=pgc.relnamespace
            WHERE a.attnum > 0 AND pgc.oid = a.attrelid
            AND pg_table_is_visible(pgc.oid)
            AND NOT a.attisdropped
            AND nsp.nspname = CAST($1 as text) AND pgc.relname = CAST($2 as text)
            ORDER BY a.attnum;`;
    const res = await Connection.list(sql, [schemaName, tableName]);
    return res;
  },

  // getTypes(){
  //     let sql = `
  //         SELECT oid id, typname short_name,
  //         pg_catalog.format_type(oid, NULL)  type_name,
  //         CASE
  //         WHEN typcategory = 'A' THEN 'array'
  //         WHEN typcategory = 'B' THEN 'boolean'
  //         WHEN typcategory = 'C' THEN 'composite'
  //         WHEN typcategory = 'D' THEN 'datetime'
  //         WHEN typcategory = 'E' THEN 'enum'
  //         WHEN typcategory = 'G' THEN 'geo'
  //         WHEN typcategory = 'I' THEN 'network'
  //         WHEN typcategory = 'N' THEN 'numeric'
  //         WHEN typcategory = 'P' THEN 'pseudo'
  //         WHEN typcategory = 'R' THEN 'range'
  //         WHEN typcategory = 'S' THEN 'string'
  //         WHEN typcategory = 'T' THEN 'timespan'
  //         WHEN typcategory = 'U' THEN 'userdefined'
  //         WHEN typcategory = 'V' THEN 'bit'
  //         WHEN typcategory = 'X' THEN 'unknown'
  //         ELSE 'unknown' END category
  //         FROM pg_type
  //         WHERE typelem = 0
  //         AND typtype != 'c'
  //         ORDER BY typname
  //     `
  //     Connection.list(sql).subscribe((data) => {
  //         if (data['row']){
  //             data['row'].forEach((value) => {
  //                 this.types[value.id] = value;
  //             });
  //         }
  //     });
  // },
  async listUsers() {
    const sql = `SELECT u.usename AS user_name,
            u.usesysid AS user_id,
            CASE WHEN u.usesuper AND u.usecreatedb THEN CAST('superuser, create database' AS pg_catalog.text)
                WHEN u.usesuper THEN CAST('superuser' AS pg_catalog.text)
                WHEN u.usecreatedb THEN CAST('create database' AS pg_catalog.text)
                ELSE CAST('' AS pg_catalog.text)
            END AS user_attr
            FROM pg_catalog.pg_user u`;
    const res = await Connection.list(sql);
    return res;
  },
  /*
    manageSchema(schema:Schema){
        let me=this;
        if (schema.id){ //alter
            let sql="ALTER SCHEMA \""+schema.oldName+"\" RENAME TO \""+schema.name+"\";"
            me.query(sql).subscribe(function(r){
                sql="COMMENT ON SCHEMA \""+schema.name+"\" IS '"+(schema.comment==null?'':schema.comment)+"' ;";
                me.query(sql).subscribe();
            });
        }else{ //create
            let sql="CREATE SCHEMA \""+schema.name+"\" AUTHORIZATION "+schema.owner+" ;"
            me.query(sql).subscribe(function(r){
                if(schema.comment!=null) {
                     sql="COMMENT ON SCHEMA \""+schema.name+"\" IS '"+schema.comment+"' ;";
                     me.query(sql).subscribe();
                }
            });
        }
    },
    dropColumn(schemaName:string, tableName:string, colName:string){
        let sql='ALTER TABLE "'+schemaName+'"."'+tableName+'" DROP COLUMN IF EXISTS "'+colName+'";'
        return this.query(sql);
    },
    editColumn(schemaName:string, tableName:string, oldName:string, newName:string, comment:string, nullable:boolean){
        let sql=' COMMENT ON COLUMN "'+schemaName+'"."'+tableName+'"."'+oldName+'" IS \''+(comment==null?'':comment)+'\'; ';
        if (!nullable) sql+='ALTER TABLE "'+schemaName+'"."'+tableName+'" ALTER COLUMN "'+oldName+'" SET NOT NULL;'
        else sql+='ALTER TABLE "'+schemaName+'"."'+tableName+'" ALTER COLUMN "'+oldName+'" DROP NOT NULL;'

        if (oldName!=newName){
            sql+=' ALTER TABLE "'+schemaName+'"."'+tableName+'" RENAME COLUMN "'+oldName+'" TO "'+newName+'";'
        }
        return this.query(sql);
    },
    dropConstraint(schemaName:string, tableName:string, keyName:string){
        let sql='ALTER TABLE "'+schemaName+'"."'+tableName+'" DROP CONSTRAINT "'+keyName+'";';
        return this.query(sql);
    },
    addField(schemaName:string, tableName:string, f:newField){
        let sql='ALTER TABLE "'+schemaName+'"."'+tableName+'" ADD COLUMN "'+f.name+'" '+f.dataType+';';
        if (!f.nullable) sql+='ALTER TABLE "'+schemaName+'"."'+tableName+'" ALTER COLUMN "'+f.name+'" SET NOT NULL;'
        sql+=' COMMENT ON COLUMN "'+schemaName+'"."'+tableName+'"."'+f.name+'" IS \''+(f.comment==null?'':f.comment)+'\'; ';
        return this.query(sql);
    }
    */
};
