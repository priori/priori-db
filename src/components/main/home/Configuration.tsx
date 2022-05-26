import assert from 'assert';
import { Component } from 'react';
import { ConnectionConfiguration } from '../../../db/pgpass';

export interface NewConectionState {
  passwordNeeded?: boolean;
  port?: string;
  database?: string;
  user?: string;
  password?: string;
  host?: string;
}
interface NewConnectionProps {
  connection: undefined | ConnectionConfiguration;
  onRemove: undefined | (() => void);
  onCancel: undefined | (() => void);
  onSubmit: (c: ConnectionConfiguration) => void;
  onSave: (c: ConnectionConfiguration) => void;
}
export class NewConnection extends Component<
  NewConnectionProps,
  NewConectionState
> {
  UNSAFE_componentWillMount() {
    const { connection } = this.props;
    this.state = {
      passwordNeeded: false,
      port: connection ? `${connection.port}` : '',
      host: connection ? connection.host : '',
      database: connection ? connection.database : '',
      user: connection ? connection.user : '',
      password: connection ? connection.password : '',
    };
  }

  remove() {
    if (
      window.confirm(
        'Do you really want to remove this connection configuration?'
      )
    ) {
      assert(!!this.props.onRemove);
      this.props.onRemove();
    }
  }

  cancel() {
    assert(this.props.onCancel);
    this.props.onCancel();
  }

  save() {
    const { database, host, port, user, password } = this.state;
    if (!password) {
      this.setState({ passwordNeeded: true });
      return;
    }
    this.setState({ passwordNeeded: false });
    this.props.onSave({
      database: database || 'postgres',
      host: host || 'localhost',
      port: (port && parseInt(port, 10)) || 5432,
      user: user || 'postgres',
      password,
    } as ConnectionConfiguration);
  }

  submit() {
    const { database, host, port, user, password } = this.state;
    if (!password) {
      this.setState({ passwordNeeded: true });
      return;
    }
    this.setState({ passwordNeeded: false });
    this.props.onSubmit({
      database: database || 'postgres',
      host: host || 'localhost',
      port: (port && parseInt(port, 10)) || 5432,
      user: user || 'postgres',
      password,
    } as ConnectionConfiguration);
  }

  render() {
    const { connection } = this.props;
    return (
      <div className="new-connection">
        Host:{' '}
        <input
          placeholder="localhost"
          defaultValue={connection ? connection.host : ''}
          onChange={(e) =>
            this.setState({ host: (e.target as HTMLInputElement).value })
          }
        />
        <br />
        Port:{' '}
        <input
          placeholder="5432"
          defaultValue={connection ? connection.port : ''}
          onChange={(e) =>
            this.setState({ port: (e.target as HTMLInputElement).value })
          }
        />
        <br />
        Database:{' '}
        <input
          placeholder="postgres"
          defaultValue={connection ? connection.database : ''}
          onChange={(e) =>
            this.setState({ database: (e.target as HTMLInputElement).value })
          }
        />
        <br />
        User:{' '}
        <input
          placeholder="postgres"
          defaultValue={connection ? connection.user : ''}
          onChange={(e) =>
            this.setState({ user: (e.target as HTMLInputElement).value })
          }
        />
        <br />
        <span className={this.state.passwordNeeded ? 'error' : undefined}>
          Password:{' '}
          <input
            defaultValue={connection ? connection.password : ''}
            onChange={(e) =>
              this.setState({ password: (e.target as HTMLInputElement).value })
            }
            type="password"
          />
        </span>
        <br />
        <div style={{ marginTop: '4px', marginBottom: '4px' }}>
          <button onClick={() => this.submit()} type="button">
            <i className="fa fa-chain" /> Save &amp; Connect
          </button>{' '}
          {this.props.onCancel ? (
            <button
              onClick={() => this.cancel()}
              className="cancel"
              type="button"
            >
              <i className="fa fa-rotate-left" /> Cancel
            </button>
          ) : null}
        </div>
        <button onClick={() => this.save()} type="button">
          <i className="fa fa-save" /> Just Save
        </button>{' '}
        {this.props.onRemove ? (
          <button
            style={{ color: '#e00' }}
            onClick={() => this.remove()}
            type="button"
          >
            <i className="fa fa-remove" /> Remove
          </button>
        ) : null}{' '}
      </div>
    );
  }
}
