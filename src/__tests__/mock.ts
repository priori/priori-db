import { TextEncoder } from 'util';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(window as any).openDatabase = jest.fn(() => {
  return {
    transaction: () => {},
  };
});

global.TextEncoder = TextEncoder;
