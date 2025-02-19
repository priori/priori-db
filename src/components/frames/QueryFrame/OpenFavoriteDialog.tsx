import { Dialog } from 'components/util/Dialog/Dialog';
import { useEffect, useState } from 'react';
import { showError } from 'state/actions';
import { currentState } from 'state/state';
import {
  favorites,
  listConnectionConfigurations,
} from 'util/browserDb/actions';
import { useEvent } from 'util/useEvent';
import { useEventListener } from 'util/useEventListener';
import { useService } from 'util/useService';
import { fDate } from './useQuerySelector';

export function OpenFavoriteDialog({
  onBlur,
  onOpen,
}: {
  onBlur: () => void;
  onOpen: (f: {
    id: number;
    sql: string;
    title: string;
    created_at: number;
    editor_content: string;
    editor_cursor_start_line: number;
    editor_cursor_end_line: number;
    editor_cursor_start_char: number;
    editor_cursor_end_char: number;
  }) => void;
}) {
  useEventListener(window, 'resize', onBlur);
  const appState = currentState();
  const configsService = useService(() => listConnectionConfigurations(), []);
  const [state, setState] = useState<null | number>(null);
  const onConfigsSelectChange = useEvent(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setState(parseInt(e.target.value, 10));
    },
  );
  const config =
    state === -1
      ? null
      : state !== null
        ? configsService.lastValidData![state]
        : appState.currentConnectionConfiguration;
  const service = useService(() => favorites(config), [config]);
  useEffect(() => {
    if (service.error) {
      showError(service.error);
    }
  }, [service.error]);
  const fs = service.lastValidData;
  if (!fs || !configsService.lastValidData) return null;
  const configs = configsService.lastValidData;
  const configValue = configs.findIndex(
    (c) =>
      config &&
      c.database === config.database &&
      c.host === config.host &&
      c.port === config.port &&
      c.user === config.user,
  );
  const selected = null;

  return (
    <Dialog relativeTo="previousSibling" onBlur={onBlur}>
      <div
        style={{
          width:
            ((document.querySelector('.app-content') as HTMLDivElement)
              .offsetWidth ?? 0) - 80,
          height: 'calc(100vh - 120px)',
          fontFamily: 'system-ui',
          textAlign: 'left',
          display: 'flex',
          flexDirection: 'column',
          lineHeight: 'normal',
        }}
      >
        <h1
          style={{
            fontSize: 25,
            margin: 0,
            lineHeight: '39px',
          }}
        >
          <i className="fa fa-star" style={{ fontSize: 'inherit' }} /> Favorites
          <select
            style={{
              margin: 0,
              float: 'right',
              maxWidth: 300,
            }}
            value={configValue}
            onChange={onConfigsSelectChange}
          >
            <option value="-1" />
            {configs.map((p, i) => (
              <option value={i} key={i}>{`${p.user}@${p.host}${
                p.port !== 5432 ? `:${p.port}` : ''
              }/${p.database}`}</option>
            ))}
          </select>
        </h1>
        <div
          style={{ flex: 1, overflow: 'auto', marginTop: 20, marginBottom: 20 }}
        >
          {fs.length ? (
            <div className="query-selector--favorites">
              {fs.map((q) => (
                <div
                  className={`query-selector--query ${selected && selected === `favorite${q.id}` ? ' selected' : ''}`}
                  key={q.id}
                  onClick={() => {
                    onOpen(q);
                  }}
                >
                  <h1>
                    {q.title ? <div>{q.title}</div> : null}
                    <span>{fDate(new Date(q.created_at))}</span>
                  </h1>
                  <div className="query-selector--sql">{q.sql}</div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
        <div>
          <button
            className="button"
            onClick={onBlur}
            style={{ fontWeight: 'normal' }}
          >
            Cancel
          </button>
        </div>
      </div>
    </Dialog>
  );
}
