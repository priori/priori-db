import { QueryArrayResult } from 'pg';

export interface ResultField {
  name: string;
  sort?: string; // ASC, DESC
}

export interface Result {
  rows: Array<{
    [_: string]:
      | string
      | null
      | number
      | boolean
      | { [k: string]: string | null | number | boolean }[]
      | { [k: string]: string | null | number | boolean };
  }>;
  rowCount: number;
  fields: Array<ResultField>;
  prev?: Result;
}

export function toResut(res: QueryArrayResult) {
  if (res instanceof Array) {
    res.forEach((result, index) => {
      if (index > 0) {
        result.prev = res[index - 1];
      }
    });
    return res[res.length - 1];
  }
  return res;
}
