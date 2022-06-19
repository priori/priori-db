import '@testing-library/jest-dom';
import { render } from '@testing-library/react';
import './mock';
import { App } from '../components/main/App';

describe('App', () => {
  it('should render', () => {
    expect(render(<App />)).toBeTruthy();
  });
});
