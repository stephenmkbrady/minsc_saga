import { render, screen } from '@testing-library/react';
import App from './App';

test('renders Matrix Integration component', () => {
  render(<App />);
  const connectingText = screen.getByText(/Connecting to Matrix.../i);
  expect(connectingText).toBeInTheDocument();
});
