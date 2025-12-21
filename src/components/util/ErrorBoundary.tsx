import React from 'react';

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: unknown }
> {
  // stack: string | undefined | null;
  // stack2: string | undefined | null;
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, info: React.ErrorInfo) {
    // this.stack = info.componentStack;
    // this.stack2 = React.captureOwnerStack();
    // eslint-disable-next-line no-console
    console.error(
      error,
      // Example "componentStack":
      //   in ComponentThatThrows (created by App)
      //   in ErrorBoundary (created by App)
      //   in div (created by App)
      //   in App
      info.componentStack,
      // Warning: `captureOwnerStack` is not available in production.
      React.captureOwnerStack(),
    );
  }

  override render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <div
          className="frame settings-frame"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            userSelect: 'text',
          }}
        >
          <div style={{ marginTop: '1em', color: 'red' }}>
            <i className="fa fa-warning" style={{ marginRight: '0.5em' }} /> An
            error occurred while rendering this frame.
            {this.state.error instanceof Error ? (
              <pre style={{ marginTop: '1em', color: 'red' }}>
                {String(this.state.error.stack)}
              </pre>
            ) : this.state.error ? (
              <pre style={{ marginTop: '1em', color: 'red' }}>
                {String(this.state.error)}
              </pre>
            ) : null}
            {/* {this.stack ? (
              <div>
                <strong>Info Component Stack:</strong>
              </div>
            ) : null}
            {this.stack ? (
              <pre style={{ marginTop: '1em', color: 'red' }}>{this.stack}</pre>
            ) : null}
            {this.stack2 ? (
              <div>
                <strong>React Captured Owner Stack:</strong>
              </div>
            ) : null}
            {this.stack2 ? (
              <pre style={{ marginTop: '1em', color: 'red' }}>
                {this.stack2}
              </pre>
            ) : null} */}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
