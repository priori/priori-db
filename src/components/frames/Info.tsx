import React from 'react';
import { SimpleValue } from 'types';
import { equals } from 'util/equals';

function Info0({
  info,
  title,
}: {
  info: {
    [info: string]: SimpleValue;
  };
  title: string;
}) {
  if (!info) return null;
  if (
    Object.keys(info).length > 10 ||
    Object.values(info).some(
      (v) =>
        (typeof v === 'string' && v.length > 22) ||
        (typeof v === 'object' && JSON.stringify(v).length > 22),
    )
  ) {
    return (
      <>
        <h2 style={{ userSelect: 'text' }}>{title}</h2>
        <div className="fields">
          {Object.entries(info).map(([k, v]) => (
            <div key={k} className="field">
              <strong>{k}:</strong>{' '}
              <span
                className={
                  typeof v === 'string' && v.length > 20
                    ? 'value-hover'
                    : undefined
                }
              >
                {typeof v === 'string' ? v : JSON.stringify(v)}
              </span>
            </div>
          ))}
        </div>
      </>
    );
  }
  return (
    <>
      <h2 style={{ userSelect: 'text' }}>{title}</h2>
      <table>
        <thead>
          <tr>
            {Object.keys(info).map((key) => (
              <th key={key}>{key}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            {Object.entries(info).map(([key, val], i) => (
              <td
                key={key}
                style={
                  i
                    ? {
                        fontWeight:
                          val === false ||
                          val === true ||
                          val === undefined ||
                          val === null
                            ? 'bold'
                            : undefined,
                        textAlign: 'center',
                      }
                    : undefined
                }
              >
                {val === null || val === undefined
                  ? '-'
                  : typeof val === 'string'
                    ? val
                    : JSON.stringify(val)}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </>
  );
}
export const Info = React.memo(Info0, (a, b) => equals(a, b));
