import { useTab } from 'components/main/connected/ConnectedApp';
import { currentState } from 'state/state';
import { useService } from 'util/useService';
import React from 'react';
import { useMoreTime } from 'components/util/DataGrid/dataGridCoreUtils';
import { db } from 'db/db';
import { SettingsParams } from './SettingsParams';
import { Info } from '../Info';

export function SettingsFrame() {
  const state = currentState();
  const c = state.currentConnectionConfiguration!;
  const service = useService(async () => {
    const [basicDbInfo, params, extraInfo] = await Promise.all([
      db().basicInfo(),
      db().variables.load(),
      db().extraInfo(),
    ]);
    return { ...basicDbInfo, params, extraInfo };
  }, []);
  useTab({
    f5() {
      service.reload();
    },
  });
  const reloading = useMoreTime(service.status === 'reloading', 100);
  if (service.status === 'starting') {
    return (
      <div
        style={{
          transition: 'opacity 0.2s',
          opacity: 0.5,
        }}
      >
        <h1>
          <span className="adjustment-icon2">
            <div />
          </span>
          Settings
        </h1>
      </div>
    );
  }
  return (
    <div
      style={{
        transition: 'opacity 0.2s',
        opacity: reloading ? 0.6 : 1,
      }}
    >
      <h1>
        <span className="adjustment-icon2">
          <div />
        </span>
        Settings
      </h1>
      <div style={{ display: 'flex' }}>
        <div style={{ flex: 1 }}>
          <h2 style={{ whiteSpace: 'nowrap', marginTop: 0, marginBottom: 7 }}>
            Current Connection
          </h2>
          <div>
            <span
              style={{
                userSelect: 'text',
                display: 'inline-block',
                marginBottom: 7,
                marginRight: 7,
              }}
            >
              {c.user}
              <wbr />@<wbr />
              {c.host}
              <wbr />
              {c.port !== 5432 ? (
                <>
                  :<wbr />
                  {c.port}
                </>
              ) : (
                ''
              )}
              <wbr />/<wbr />
              {state.database}
            </span>
            <button
              type="button"
              style={{ marginRight: 7, marginBottom: 7 }}
              disabled
            >
              Edit <i className="fa fa-pencil" />
            </button>{' '}
            <button type="button" disabled>
              Disconnect <i className="fa fa-chain-broken" />
            </button>
          </div>
        </div>
        <div
          style={{
            fontSize: 13,
            maxWidth: 400,
            color: 'gray',
            textAlign: 'right',
            userSelect: 'text',
          }}
        >
          {service.lastValidData?.version.split(',').map((v, i) => (
            <React.Fragment key={i}>
              {i ? ',' : null}
              {i ? <br /> : null}
              {v}
            </React.Fragment>
          ))}
          {service.lastValidData?.size ? (
            <div style={{ marginTop: 3, color: '#555' }}>
              <strong style={{ fontSize: 14 }}>
                <i
                  className="fa-hdd-o fa"
                  style={{
                    fontWeight: 'bold',
                    fontSize: 18,
                    position: 'relative',
                    top: 1,
                  }}
                />{' '}
                {service.lastValidData.size}
              </strong>
            </div>
          ) : null}
        </div>
      </div>
      {service.status === 'error' ? (
        <div
          style={{
            color: 'red',
            marginTop: 30,
            textAlign: 'center',
            padding: 30,
            background: '#f8f8f8',
            marginBottom: 30,
          }}
        >
          <i className="fa fa-exclamation-triangle" /> Error:{' '}
          {`${service.error}`}
        </div>
      ) : null}
      {service.lastValidData?.extraInfo
        ? Object.entries(service.lastValidData.extraInfo).map(
            ([key, value]) => <Info key={key} title={key} info={value} />,
          )
        : null}

      {service.lastValidData?.params ? (
        <SettingsParams
          params={service.lastValidData.params}
          refresh={() => service.reload()}
        />
      ) : null}

      <h2>App Settings</h2>
      <p>Theme:</p>
      <select disabled>
        <option value="default">Soft Gray (Default)</option>
        <option value="light">Bright Light</option>
        <option value="dark">Dark</option>
      </select>
    </div>
  );
}
