import * as React from "react";
import { Component } from "react";
import { ConnectionConfiguration } from "../../../db/pgpass";

export interface NewConectionState {
  passwordNeeded?: boolean;
  port?: string;
  database?: string;
  user?: string;
  password?: string;
  host?: string;
}
export class NewConnection extends Component<any, NewConectionState> {
  componentWillMount() {
    this.state = {
      passwordNeeded: false,
      port: this.props.connection ? this.props.connection.port : "",
      host: this.props.connection ? this.props.connection.host : "",
      database: this.props.connection ? this.props.connection.database : "",
      user: this.props.connection ? this.props.connection.user : "",
      password: this.props.connection ? this.props.connection.password : ""
    };
  }

  render() {
    return (
      <div className="new-connection">
        Host:{" "}
        <input
          placeholder="localhost"
          defaultValue={this.props.connection ? this.props.connection.host : ""}
          onChange={e =>
            this.setState({ host: (e.target as HTMLInputElement).value })
          }
        />
        <br />
        Port:{" "}
        <input
          placeholder="5432"
          defaultValue={this.props.connection ? this.props.connection.port : ""}
          onChange={e =>
            this.setState({ port: (e.target as HTMLInputElement).value })
          }
        />
        <br />
        Database:{" "}
        <input
          placeholder="postgres"
          defaultValue={
            this.props.connection ? this.props.connection.database : ""
          }
          onChange={e =>
            this.setState({ database: (e.target as HTMLInputElement).value })
          }
        />
        <br />
        User:{" "}
        <input
          placeholder="postgres"
          defaultValue={this.props.connection ? this.props.connection.user : ""}
          onChange={e =>
            this.setState({ user: (e.target as HTMLInputElement).value })
          }
        />
        <br />
        <span className={this.state.passwordNeeded ? "error" : undefined}>
          Password:{" "}
          <input
            defaultValue={
              this.props.connection ? this.props.connection.password : ""
            }
            onChange={e =>
              this.setState({ password: (e.target as HTMLInputElement).value })
            }
            type="password"
          />
        </span>
        <br />
        <div style={{ marginTop: "4px", marginBottom: "4px" }}>
          <button onClick={() => this.submit()}>
            <i className="fa fa-chain" /> Save &amp; Connect
          </button>{" "}
            {this.props.onCancel ? <button onClick={() => this.cancel()} className="cancel">
            <i className="fa fa-rotate-left" /> Cancel
          </button> : null }
        </div>
        <button onClick={() => this.save()}>
          <i className="fa fa-save" /> Just Save
        </button>{" "}
        {this.props.onRemove ? (
          <button style={{ color: "#e00" }} onClick={() => this.remove()}>
            <i className="fa fa-remove" /> Remove
          </button>
        ) : null}{" "}
      </div>
    );
  }

  remove() {
    if (confirm("Do you really want to remove this connection configuration?"))
      this.props.onRemove();
  }

  cancel() {
    this.props.onCancel();
  }

  save() {
    const { database, host, port, user, password } = this.state;
    if (!password) {
      this.setState({ passwordNeeded: true });
      return;
    } else {
      this.setState({ passwordNeeded: false });
    }
    this.props.onSave({
      database: database || "postgres",
      host: host || "localhost",
      port: (port && parseInt(port)) || 5432,
      user: user || "postgres",
      password
    } as ConnectionConfiguration);
  }

  submit() {
    const { database, host, port, user, password } = this.state;
    if (!password) {
      this.setState({ passwordNeeded: true });
      return;
    } else {
      this.setState({ passwordNeeded: false });
    }
    this.props.onSubmit({
      database: database || "postgres",
      host: host || "localhost",
      port: (port && parseInt(port)) || 5432,
      user: user || "postgres",
      password
    } as ConnectionConfiguration);
  }
}
