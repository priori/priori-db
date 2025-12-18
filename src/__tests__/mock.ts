import { TextEncoder } from 'util';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(window as any).openDatabase = jest.fn(() => {
  return {
    transaction: () => {},
  };
});

// Cast needed because Node's util.TextEncoder uses ArrayBufferLike while DOM expects ArrayBuffer
global.TextEncoder = TextEncoder as unknown as typeof globalThis.TextEncoder;
