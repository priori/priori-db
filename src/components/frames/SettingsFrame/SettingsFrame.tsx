import { useTab } from 'components/main/connected/ConnectedApp';
import { currentState } from 'state/state';
import { useService } from 'util/useService';
import React from 'react';
import { useMoreTime } from 'components/util/DataGrid/dataGridCoreUtils';
import { db } from 'db/db';
import { Dialog } from 'components/util/Dialog/Dialog';
import { ConnectionConfigurationForm } from 'components/main/home/ConnectionConfigurationForm';
import {
  listConnectionConfigurations,
  updateConnectionConfiguration,
} from 'util/browserDb/actions';
import { ConnectionConfiguration } from 'types';
import { reload } from 'util/useWindowCloseConfirm';
import { SettingsParams } from './SettingsParams';
import { Info } from '../Info';

export function SettingsFrame() {
  const [edit, setEdit] = React.useState(false);
  const state = currentState();
  const c = state.currentConnectionConfiguration!;
  const service = useService(async () => {
    const [basicDbInfo, params, extraInfo, conList] = await Promise.all([
      db().basicInfo(),
      db().variables.load(),
      db().extraInfo(),
      listConnectionConfigurations(),
    ]);
    const currentCon = conList.find((c2) => c.id === c2.id);
    return { ...basicDbInfo, params, extraInfo, currentCon };
  }, []);
  const c2 = service.lastValidData?.currentCon;
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
              {c2 &&
              (c2.user !== c.user ||
                c2.host !== c.host ||
                c2.port !== c.port ||
                c2.database !== c.database) ? (
                <>
                  <div style={{ color: '#bbb' }}>
                    <i
                      className="fa fa-chain"
                      style={{
                        color: '#1976d2',
                        position: 'relative',
                        bottom: -1,
                      }}
                    />{' '}
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
                  </div>
                  <div style={{ fontStyle: 'italic', fontSize: 12 }}>
                    {c2.user}
                    <wbr />@<wbr />
                    {c2.host}
                    <wbr />
                    {c2.port !== 5432 ? (
                      <>
                        :<wbr />
                        {c2.port}
                      </>
                    ) : (
                      ''
                    )}
                    <wbr />/<wbr />
                    {state.database} <i className="fa fa-pencil" />
                  </div>
                </>
              ) : (
                <>
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
                </>
              )}
            </span>
            <button
              type="button"
              style={{ marginRight: 7, marginBottom: 7 }}
              onClick={() => setEdit(true)}
            >
              Edit <i className="fa fa-pencil" />
            </button>
            {edit ? (
              <Dialog
                relativeTo="previousSibling"
                onBlur={() => setEdit(false)}
              >
                <div style={{ height: 400, textAlign: 'left' }}>
                  <ConnectionConfigurationForm
                    connection={service.lastValidData?.currentCon}
                    onCancel={() => {
                      setEdit(false);
                    }}
                    onJustSave={async (e: ConnectionConfiguration) => {
                      await updateConnectionConfiguration(e);
                      service.reload();
                      setEdit(false);
                    }}
                  />
                </div>
              </Dialog>
            ) : null}{' '}
            <button
              type="button"
              onClick={() => {
                reload();
              }}
            >
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
