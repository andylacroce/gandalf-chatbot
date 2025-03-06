import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import ChatMessage from './ChatMessage';

/**
 * Test to check if the ChatMessage component renders correctly.
 */
test('renders ChatMessage component', () => {
  const message = { text: 'Hello, World!', sender: 'User' };
  const { getByText } = render(<ChatMessage message={message} />);
  const messageElement = getByText(/Hello, World!/i);
  expect(messageElement).toBeInTheDocument();
});