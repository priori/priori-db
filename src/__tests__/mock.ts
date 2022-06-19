(window as any).openDatabase = jest.fn(() => {
  return {
    transaction: () => {},
  };
});
