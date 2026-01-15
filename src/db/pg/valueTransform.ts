/* eslint no-use-before-define: "off" */

import { defaults } from 'pg';
import { QueryResultDataField, SimpleValue } from 'db/db';
import { isDate } from 'node:util/types';

// based in https://github.com/brianc/node-postgres/blob/master/packages/pg/lib/utils.js
function escapeElement(elementRepresentation: any): string {
  const escaped = elementRepresentation
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"');
  return `"${escaped}"`;
}

function dateToStringUTC(date: Date): string {
  let year = date.getUTCFullYear();
  const isBCYear = year < 1;
  if (isBCYear) year = Math.abs(year) + 1; // negative years are 1 off their BC representation

  let ret = `${String(year).padStart(4, '0')}-${String(
    date.getUTCMonth() + 1,
  ).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}T${String(
    date.getUTCHours(),
  ).padStart(2, '0')}:${String(date.getUTCMinutes()).padStart(2, '0')}:${String(
    date.getUTCSeconds(),
  ).padStart(2, '0')}.${String(date.getUTCMilliseconds()).padStart(3, '0')}`;

  ret += '+00:00';
  if (isBCYear) ret += ' BC';
  return ret;
}

function dateToString(date: Date): string {
  let offset = -date.getTimezoneOffset();

  let year = date.getFullYear();
  const isBCYear = year < 1;
  if (isBCYear) year = Math.abs(year) + 1; // negative years are 1 off their BC representation

  let ret = `${String(year).padStart(4, '0')}-${String(
    date.getMonth() + 1,
  ).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}T${String(
    date.getHours(),
  ).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(
    date.getSeconds(),
  ).padStart(2, '0')}.${String(date.getMilliseconds()).padStart(3, '0')}`;

  if (offset < 0) {
    ret += '-';
    offset *= -1;
  } else {
    ret += '+';
  }

  ret += `${String(Math.floor(offset / 60)).padStart(2, '0')}:${String(
    offset % 60,
  ).padStart(2, '0')}`;
  if (isBCYear) ret += ' BC';
  return ret;
}

function arrayString(val: unknown[]): string {
  const result: string[] = ['{'];
  for (let i = 0; i < val.length; i += 1) {
    if (i > 0) {
      result.push(',');
    }
    if (val[i] === null || typeof val[i] === 'undefined') {
      result.push('NULL');
    } else if (Array.isArray(val[i])) {
      result.push(arrayString(val[i] as unknown[]));
    } else if (ArrayBuffer.isView(val[i])) {
      let item: any = val[i];
      if (!(item instanceof Buffer)) {
        const buf = Buffer.from(item.buffer, item.byteOffset, item.byteLength);
        if (buf.length === item.byteLength) {
          item = buf;
        } else {
          item = buf.slice(item.byteOffset, item.byteOffset + item.byteLength);
        }
      }
      result.push('\\\\x');
      result.push(item.toString('hex'));
    } else {
      const currVal = val[i];
      if (typeof currVal === 'number' || typeof currVal === 'boolean') {
        result.push(currVal.toString());
      } else if (
        typeof currVal === 'string' &&
        !/(\s|[",'}{]|\\)/.test(currVal) &&
        currVal.length
      ) {
        result.push(currVal);
      } else result.push(escapeElement(prepareValue(currVal)));
    }
  }
  result.push('}');
  return result.join('');
}

function prepareValue(
  val: unknown,
  seen: undefined | unknown[] = undefined,
): any {
  // null and undefined are both null for postgres
  if (val == null) {
    return null;
  }
  if (typeof val === 'object') {
    if (val instanceof Buffer) {
      return val;
    }
    if (ArrayBuffer.isView(val)) {
      const buf = Buffer.from(val.buffer, val.byteOffset, val.byteLength);
      if (buf.length === val.byteLength) {
        return buf;
      }
      return buf.slice(val.byteOffset, val.byteOffset + val.byteLength); // Node.js v4 does not support those Buffer.from params
    }
    if (isDate(val)) {
      if (defaults.parseInputDatesAsUTC) {
        return dateToStringUTC(val);
      }
      return dateToString(val);
    }
    if (Array.isArray(val)) {
      return arrayString(val);
    }
    return prepareObject(val, seen);
  }
  return val.toString();
}

function prepareObject(
  val: any,
  seen: unknown[] | undefined = undefined,
): unknown {
  if (val && typeof val.toPostgres === 'function') {
    const seen2: unknown[] = seen || [];
    if (seen2.indexOf(val) !== -1) {
      throw new Error(
        `circular reference detected while preparing "${val}" for query`,
      );
    }
    seen2.push(val);
    return prepareValue(val.toPostgres(prepareValue), seen2);
  }
  return JSON.stringify(val);
}

const JSON_TYPE_IDS = new Set([114, 3802]);

function isJsonField(field?: QueryResultDataField | { dataTypeID?: number }) {
  if (!field) return false;
  if ('type' in field && field.type) return /^jsonb?$/i.test(field.type);
  const { dataTypeID } = field as { dataTypeID?: number };
  return dataTypeID ? JSON_TYPE_IDS.has(dataTypeID) : false;
}

function arrayToPgText(value: SimpleValue[]): string {
  const prepared = prepareValue(value);
  if (typeof prepared === 'string') return prepared;
  return JSON.stringify(value);
}

export function coerceArraysToText(
  rows: SimpleValue[][],
  fields?: Array<QueryResultDataField | { dataTypeID?: number }>,
): SimpleValue[][] {
  for (const row of rows) {
    for (let i = 0; i < row.length; i += 1) {
      const cell = row[i];
      if (Array.isArray(cell)) {
        if (!isJsonField(fields?.[i])) {
          row[i] = arrayToPgText(cell);
        }
      }
    }
  }
  return rows;
}
