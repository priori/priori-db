import * as React from "react";
import {
  connect,
  open,
  newConnection,
  cancelConnection,
  saveConnection,
  editConnection,
  removeConnection,
  cancelSelectedConnection,
  closeConnectionError
} from "../../../actions";
import { newConf, editingAll, editConnectionSelected } from "../../../state";
import { AppState } from "../../../types";
import { ConnectionConfiguration } from "../../../db/pgpass";
import { Component } from "react";
import { NewConnection } from "./Configuration";

export class Home extends Component<AppState, {} > {

  render() {
    if (this.props.newConnection || this.props.passwords.length === 0 ) {
      return (
        <div>
          <div className="connection-error">
            {this.props.connectionError && this.props.connectionError.message}
          </div>
          <NewConnection
            onSave={(e: ConnectionConfiguration) => {
              saveConnection(e);
            }}
            onCancel={this.props.passwords.length === 0 ? undefined :() => cancelConnection()}
            onSubmit={(e: ConnectionConfiguration) => newConnection(e)}
          />
        </div>
      );
    }
    if (this.props.editConnection) {
      const index = this.props.editConnection.index;
      return (
        <div>
          <div className="connection-error">
            {this.props.connectionError && this.props.connectionError.message}
          </div>
          <NewConnection
            connection={this.props.editConnection.connection}
            onSave={(e: ConnectionConfiguration) => {
              saveConnection(e, index);
            }}
            onCancel={this.props.passwords.length == 0 ? undefined : () => cancelConnection()}
            onSubmit={(e: ConnectionConfiguration) => newConnection(e, index)}
            onRemove={() => removeConnection(index)}
          />
        </div>
      );
    }
    return (
      <div>
        {this.props.connectionError ? (
          <div
            style={{
              position: "fixed",
              top: 0,
              right: 0,
              left: 0,
              bottom: 0,
              background: "rgba(256,256,256,.5)",
              zIndex: 1
            }}
          >
            <div
              style={{
                padding: "20px",
                background: "white",
                boxShadow: "0 1px 3px rgba(0,0,0,.4)",
                maxWidth: "500px",
                color: "#d33",
                margin: "20px auto"
              }}
            >
              {typeof this.props.connectionError == "string"
                ? this.props.connectionError
                : this.props.connectionError.message ||
                  JSON.stringify(this.props.connectionError)}{" "}
              <button style={{marginTop:"5px"}} onClick={_ => closeConnectionError()}>Close</button>{" "}
              <button style={{marginTop:"5px"}} onClick={_ => editConnectionSelected()}>Edit</button>
            </div>
          </div>
        ) : null}

        {this.props.passwords && this.props.passwords.length ? (
          <div className="connections">
              {this.props.passwords.map((p, i) => (
                <div 
                className={"connection"+(this.props.editConnections?" connection--editing":"")}
                 onClick={() => this.props.editConnections ? editConnection(p, i) : open(p)} key={i}>
                {this.props.editConnections ? <i className="fa fa-pencil" /> : null }
                  <span className="connection--user">{p.user}</span>@
                  <span className="connection--host">{p.host}</span>
                  <span className={"connection--port"+(p.port == 5432 ? " connection--port--default":"")}>:{p.port}</span>
                  <span className={"connection--database"+(p.database == "*" ? " connection--database--any" : "")}>/{p.database}</span>
                </div>
              ))}
          </div>
        ) : null}
        {this.props.bases ? (
          <div
            className="bases-wrapper"
            onClick={() => cancelSelectedConnection()}
          >
            <button onClick={() => editConnectionSelected() } className="connections--edit-button2">
              <i className="fa fa-pencil" />
            </button>
            <div className="bases">
              <div className="bases-inner-wrapper">
                {this.props.bases.map(b => (
                  <div
                    className="base"
                    key={b}
                    onClick={e => {
                      e.stopPropagation();
                      connect(b);
                    }}
                  >
                    {b}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          undefined
        )}
        <button onClick={() => editingAll() } className="connections--edit-button">
          <i className="fa fa-pencil" />
        </button>

        <button onClick={() => newConf()} className="connections--add-button">
          <i className="fa fa-plus" />
        </button>
      </div>
    );
  }
}
