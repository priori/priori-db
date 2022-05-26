/* eslint-disable no-nested-ternary */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Editor } from '../Editor';
import { Grid } from '../Grid';
import { QueryFrameProps } from '../../types';
import { Frame } from './Frame';
import { AutoConnectPgClient } from '../../db/AutoConnectPgClient';

export class QueryFrame extends Frame<QueryFrameProps, any> {
  editor: Editor | null = null;

  db = new AutoConnectPgClient((notice) => {
    this.notice(notice);
  });

  notice(notice: any) {
    this.setState({
      resetNotices: false,
      notices: this.state.resetNotices
        ? [notice]
        : [...this.state.notices, notice],
    });
  }

  constructor(props: QueryFrameProps) {
    super(props);
    this.state = { notices: [] };
    if (props.active)
      setTimeout(() => {
        (window as any).f5 = () => this.execute();
      }, 1);
  }

  show() {
    setTimeout(() => {
      (window as any).f5 = () => this.execute();
    }, 1);
    super.show();
    (this.editor as Editor).show();
  }

  hide() {
    (window as any).f5 = null;
    super.hide();
    (this.editor as Editor).hide();
  }

  componentWillUnmount() {
    if (this.props.active) (window as any).f5 = null;
    this.db.done();
  }

  execute() {
    if (this.state.running) return;
    const query = (this.editor as Editor).getQuery();
    const start = new Date().getTime();
    this.setState({ running: true, resetNotices: true });
    // eslint-disable-next-line promise/catch-or-return
    this.db.query(query, []).then(
      (res) => {
        (window as any).lastQueryFrameRes = res;
        this.setState({
          running: false,
          res,
          notices:
            // eslint-disable-next-line promise/always-return
            (res && res.fields && res.fields.length) || this.state.resetNotices
              ? []
              : this.state.notices,
          resetNotices: false,
          time: new Date().getTime() - start,
          error: null,
        });
      },
      (err) => {
        this.setState({
          running: false,
          notices: this.state.resetNotices ? [] : this.state.notices,
          resetNotices: false,
          error: err,
          time: null,
          res: null,
        });
      }
    );
  }

  confirmClose() {
    if (
      this.state.running &&
      window.confirm('A query is running. Do you wish to cancel it?')
    )
      return true;
    return false;
  }

  cancel() {
    this.db.stopRunningQuery();
  }

  render() {
    return (
      <div
        className={`frame query-tab${this.props.active ? ' active' : ''}`}
        ref={(el) => {
          this.el = el;
        }}
      >
        <Editor
          ref={(el: Editor) => {
            this.editor = el;
          }}
          style={{ height: '300px' }}
        />
        {this.state.res &&
        this.state.res.fields &&
        this.state.res.fields.length ? (
          <span className="mensagem">
            Query returned {this.state.res.rows.length} row
            {this.state.res.rows.length > 1 ? 's' : ''}, {this.state.time} ms
            execution time.
          </span>
        ) : undefined}
        {/* <span className="mensagem error"></span> */}
        {this.state.running ? (
          <button type="button" style={{ opacity: 0.5 }} disabled>
            Execute
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              this.execute();
            }}
          >
            Execute
          </button>
        )}

        {this.state.running ? (
          <i className="fa fa-circle-o-notch fa-spin fa-3x fa-fw" />
        ) : null}
        {this.state.running ? (
          <div className="running">
            <span
              onClick={() => {
                this.cancel();
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === ' ' || e.key === 'Space' || e.key === 'Enter')
                  this.cancel();
              }}
            >
              Cancel execution
            </span>
          </div>
        ) : null}
        {this.state.error ? (
          <div
            style={{
              fontSize: '20px',
              padding: '10px 0 0 15px',
              color: '#d11',
              lineHeight: '1.5em',
            }}
          >
            #{this.state.error.code} {this.state.error.message}
            {typeof this.state.error.line === 'number' &&
              typeof this.state.error.position === 'number' && (
                <div>
                  Line: {this.state.error.line} Character:{' '}
                  {this.state.error.position}
                </div>
              )}
          </div>
        ) : this.state.res &&
          this.state.res.fields &&
          this.state.res.fields.length ? (
          this.state.notices.length ? (
            <div>
              {this.noticesRender()}
              <Grid
                style={{
                  position: 'absolute',
                  top: '300px',
                  left: 0,
                  bottom: 0,
                  right: 0,
                }}
                result={this.state.res}
              />
            </div>
          ) : (
            <Grid
              style={{
                position: 'absolute',
                top: '300px',
                left: 0,
                bottom: 0,
                right: 0,
              }}
              result={this.state.res}
            />
          )
        ) : (
          <div className="not-grid-result">
            {this.noticesRender()}
            {this.state.res && this.state.res.rowCount ? (
              <div
                style={{
                  fontSize: '20px',
                  padding: '10px 0 0 15px',
                  lineHeight: '1.5em',
                }}
              >
                Query returned successfully: {this.state.res.rowCount} row
                affected, {this.state.time} ms execution time.
              </div>
            ) : this.state.res ? (
              <div
                style={{
                  fontSize: '20px',
                  padding: '10px 0 0 15px',
                  lineHeight: '1.5em',
                }}
              >
                Query returned successfully with no result in {this.state.time}{' '}
                msec.
              </div>
            ) : undefined}
          </div>
        )}
      </div>
    );
  }

  noticesRender() {
    if (this.state.notices.length === 0) return null;
    return (
      <div className="notices">
        {this.state.notices.map((n: any, i: number) => (
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
                  this.removeNotice(n);
              }}
              onClick={() => this.removeNotice(n)}
            />
            <i
              className="fa fa-eye"
              tabIndex={0}
              role="button"
              aria-label="View notice"
              onKeyDown={(e) => {
                if (e.key === ' ' || e.key === 'Space' || e.key === 'Enter')
                  this.fullViewNotice(n);
              }}
              onClick={() => this.fullViewNotice(n)}
            />
          </div>
        ))}
      </div>
    );
  }

  removeNotice(n: any) {
    this.setState({
      notices: this.state.notices.filter((n2: any) => n2 !== n),
    });
  }

  fullViewNotice(n: any) {
    this.setState({
      notices: this.state.notices.map((n2: any) =>
        n2 === n ? { ...n2, message: n2.message, fullView: !n2.fullView } : n2
      ),
    });
  }
}
