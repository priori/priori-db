import { NoticeMessage } from 'pg-protocol/dist/messages';

interface QFNoticeMessage extends NoticeMessage {
  fullView?: boolean | undefined;
}

export function Notices({
  notices,
  onRemoveNotice,
  onFullViewNotice,
}: {
  notices: QFNoticeMessage[];
  onRemoveNotice: (n: NoticeMessage) => void;
  onFullViewNotice: (n: NoticeMessage) => void;
}) {
  if (notices.length === 0) return null;
  return (
    <div className="notices">
      {notices.map((n, i) => (
        <div className={`notice${n.fullView ? ' full-view' : ''}`} key={i}>
          <span className="notice-type">{n.name}</span>
          <span className="notice-message">{n.message}</span>
          {n.fullView ? (
            <div className="notice-details">
              <span>Line: {n.line}</span> <span>File: {n.file}</span>{' '}
              <span>Code: {n.code}</span> <span>Severity: {n.severity}</span>{' '}
              <span>Routine: {n.routine}</span>
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
                onFullViewNotice(n);
            }}
            onClick={() => onFullViewNotice(n)}
          />
        </div>
      ))}
    </div>
  );
}
