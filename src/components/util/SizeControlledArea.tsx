import { Component, CSSProperties, ReactNode } from 'react';

interface SizeControlledAreaProps {
  render: (width: number, height: number) => ReactNode;
  style: CSSProperties;
  className: string | undefined;
}
export class SizeControlledArea extends Component<
  SizeControlledAreaProps,
  { width: number; height: number } | { width: undefined; height: undefined }
> {
  private el: HTMLDivElement | null = null;

  private timeout2: ReturnType<typeof setTimeout> | null = null;

  constructor(props: SizeControlledAreaProps) {
    super(props);
    this.state = {
      width: undefined,
      height: undefined,
    };
    this.ref = this.ref.bind(this);
    this.resizeListener = this.resizeListener.bind(this);
    window.addEventListener('resize', this.resizeListener);
  }

  override componentWillUnmount() {
    window.removeEventListener('resize', this.resizeListener);
  }

  private resizeListener() {
    if (this.timeout2) clearTimeout(this.timeout2);
    this.timeout2 = setTimeout(() => {
      if (!this.el || !this.el.parentElement) return;
      this.setState({
        width: this.el.offsetWidth,
        height: this.el.offsetHeight,
      });
    }, 250);
  }

  ref(el: HTMLDivElement | null) {
    if (!el) return;
    this.el = el;
    this.setState({
      width: el.offsetWidth,
      height: el.offsetHeight,
    });
  }

  override render() {
    return (
      <div
        style={this.props.style}
        className={this.props.className}
        ref={this.ref}
      >
        {typeof this.state.width !== 'undefined' &&
        typeof this.state.height !== 'undefined'
          ? this.props.render(this.state.width, this.state.height)
          : null}
      </div>
    );
  }
}
