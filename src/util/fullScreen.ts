interface DocumentWithFullscreen extends Document {
  webkitIsFullScreen?: boolean;
  webkitExitFullscreen?: () => void;
}
interface HTMLElementWithFullscreen extends HTMLElement {
  webkitRequestFullScreen?: () => void;
}
export function fullScreen() {
  if ((document as DocumentWithFullscreen).webkitIsFullScreen) {
    const doc = document as DocumentWithFullscreen;
    if (doc.webkitExitFullscreen) doc.webkitExitFullscreen();
  } else {
    const el = document.documentElement as HTMLElementWithFullscreen;
    if (el.webkitRequestFullScreen) el.webkitRequestFullScreen();
  }
}
