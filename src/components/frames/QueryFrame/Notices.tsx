import React from 'react';
import { QueryExecutorNoticeMessage } from './useQueryExecutor';

function label(k: string) {
  return (
    (k[0]?.toUpperCase() ?? '') +
    k.substring(1).replace(/[A-Z]/g, (v) => ` ${v.toUpperCase()}`)
  );
}

export function Notices({
  notices,
  onRemoveNotice,
  onOpenNotice,
}: {
  notices: QueryExecutorNoticeMessage[];
  onRemoveNotice: (n: QueryExecutorNoticeMessage) => void;
  onOpenNotice: (n: QueryExecutorNoticeMessage) => void;
}) {
  if (notices.length === 0) return null;
  return (
    <div className="notices">
      {notices.map((n, i) => (
        <div
          className={`notice${n.type ? ` notice--${n.type.toLocaleLowerCase()}` : ''}`}
          key={i}
        >
          <span className="notice-type">{n.type}</span>
          <span className="notice-message">{n.message}</span>
          {n.open ? (
            <div className="notice-details">
              {Object.keys(n.values).map((k) => (
                <React.Fragment key={k}>
                  <span>
                    <strong>{label(k)}:</strong>{' '}
                    <span className="notice--value">{n.values[k]}</span>
                  </span>
                </React.Fragment>
              ))}
            </div>
          ) : null}
          <i
            className="fa fa-close"
            tabIndex={0}
            role="button"
            aria-label="Close notice"
            onKeyDown={(e) => {
              if (e.key === ' ' || e.key === 'Space' || e.key === 'Enter')
                onRemoveNotice(n);
            }}
            onClick={() => onRemoveNotice(n)}
          />
          <i
            className="fa fa-eye"
            tabIndex={0}
            role="button"
            aria-label="View notice"
            onKeyDown={(e) => {
              if (e.key === ' ' || e.key === 'Space' || e.key === 'Enter')
                onOpenNotice(n);
            }}
            onClick={() => onOpenNotice(n)}
          />
        </div>
      ))}
    </div>
  );
}
