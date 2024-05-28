import { Dialog } from 'components/util/Dialog/Dialog';
import { useEffect, useState } from 'react';
import { showError } from 'state/actions';
import { currentState } from 'state/state';
import {
  lastQueries,
  listConnectionConfigurations,
} from 'util/browserDb/actions';
import { QueryGroupEntryIDB } from 'util/browserDb/entities';
import { useEvent } from 'util/useEvent';
import { useEventListener } from 'util/useEventListener';
import { useService } from 'util/useService';
import { QuerySelectorGroup } from './QuerySelector';

export function OpenRecentQueryDialog({
  onBlur,
  onOpen,
}: {
  onBlur: () => void;
  onOpen: (g: {
    content: string;
    cursorStart: { line: number; ch: number };
    cursorEnd: { line: number; ch: number };
    queryGroup: QueryGroupEntryIDB;
    page: number;
  }) => void;
}) {
  useEventListener(window, 'resize', onBlur);
  const appState = currentState();
  const [limit, setLimit] = useState(80);
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
  const configs = configsService.lastValidData;
  const service = useService(() => lastQueries(config, limit), [config, limit]);
  useEffect(() => {
    if (service.error) {
      showError(service.error);
    }
  }, [service.error]);
  const queries = service.lastValidData;
  const onScroll = useEvent((e: React.UIEvent<HTMLDivElement>) => {
    if (!queries?.length) return;
    if (e.target instanceof HTMLElement) {
      const { scrollTop, scrollHeight, clientHeight } = e.target;
      if (scrollTop + clientHeight > scrollHeight - 100) {
        if (limit === queries.length) setLimit(limit + 100);
      }
    }
  });
  const onGroupSelect = useEvent(
    (g: {
      content: string;
      cursorStart: { line: number; ch: number };
      cursorEnd: { line: number; ch: number };
      queryGroup: QueryGroupEntryIDB;
      page: number;
    }) => {
      onOpen(g);
    },
  );
  if (!configs) return null;
  const configValue = configs.findIndex(
    (c) =>
      config &&
      c.database === config.database &&
      c.host === config.host &&
      c.port === config.port &&
      c.user === config.user,
  );
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
          Last Executed Queries
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
          style={{
            flex: 1,
            overflow: 'auto',
            marginTop: 20,
            marginBottom: 20,
          }}
          onScroll={onScroll}
        >
          <div className="query-selector--queries">
            {queries?.map((g) => (
              <QuerySelectorGroup
                key={g.id}
                group={g}
                onSelect={onGroupSelect}
                selected={false}
              />
            ))}
          </div>
        </div>
        <div>
          <button
            type="button"
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
