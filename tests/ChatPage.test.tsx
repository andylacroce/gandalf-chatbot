/**
 * @fileoverview Test suite for the ChatPage component, testing all major functionality
 * including message sending, error handling, loading states, and audio playback.
 * @module tests/ChatPage
 */

import React from 'react';
import { render, fireEvent, waitFor, waitForElementToBeRemoved } from '@testing-library/react';
import '@testing-library/jest-dom';
import axios from 'axios';
import ChatPage from '../app/components/ChatPage';

// Mock axios to control API responses
jest.mock('axios');

/**
 * Test suite for the ChatPage component
 * Tests all major functionality of the chat interface including:
 * - Rendering
 * - Message sending and receiving
 * - Error handling
 * - Loading states
 * - Audio playback
 * - User interactions
 */
describe('ChatPage Component', () => {
  /**
   * Reset all mocks before each test to ensure test isolation
   */
  beforeEach(() => {
    jest.resetAllMocks();
  });

  /**
   * Test basic rendering of the ChatPage component
   * Verifies that the input field and Gandalf image are properly displayed
   */
  it('renders ChatPage component', () => {
    const { getByPlaceholderText, getByAltText } = render(<ChatPage />);
    expect(getByPlaceholderText('Type in your message here...')).toBeInTheDocument();
    expect(getByAltText('Gandalf')).toBeInTheDocument();
  });

  /**
   * Test the message sending and receiving functionality
   * Mocks the API response and verifies both user message and Gandalf reply are displayed
   */
  it('sends a message and receives a reply', async () => {
    // Mock successful API response
    jest.mocked(axios.post).mockResolvedValue({
      data: {
        reply: 'You shall not pass!',
        audioFileUrl: '/api/audio?file=gandalf_reply.mp3',
      },
    });

    const { getByPlaceholderText, getByText, getByRole } = render(<ChatPage />);
    const input = getByPlaceholderText('Type in your message here...') as HTMLInputElement;
    const sendButton = getByRole('button', { name: /Send/i });

    // Simulate user typing and sending a message
    fireEvent.change(input, { target: { value: 'Hello, Gandalf!' } });
    fireEvent.click(sendButton);

    // Verify API was called with correct parameters
    expect(axios.post).toHaveBeenCalledWith('/api/chat', { message: 'Hello, Gandalf!' });

    // Verify both user message and Gandalf reply appear in the UI
    await waitFor(() => {
      expect(getByText('Hello, Gandalf!')).toBeInTheDocument();
      expect(getByText('You shall not pass!')).toBeInTheDocument();
    });
  });

  /**
   * Test error handling when the API call fails
   * Verifies that the appropriate error message is displayed to the user
   */
  it('displays an error message when the API call fails', async () => {
    // Mock failed API response
    jest.mocked(axios.post).mockRejectedValue(new Error('API call failed'));

    const { getByPlaceholderText, getByRole, getByText } = render(<ChatPage />);
    const input = getByPlaceholderText('Type in your message here...') as HTMLInputElement;
    const sendButton = getByRole('button', { name: /Send/i });

    // Simulate user typing and sending a message
    fireEvent.change(input, { target: { value: 'Hello, Gandalf!' } });
    fireEvent.click(sendButton);

    // Verify error message is displayed
    await waitFor(() => {
      expect(getByText('Error sending message. Please try again.')).toBeInTheDocument();
    });
  });

  /**
   * Test that the input and button are disabled while loading
   * Verifies that the input field and send button are disabled during the API call
   */
  it('disables the input and button while loading', async () => {
    const { getByPlaceholderText, getByRole } = render(<ChatPage />);
    const input = getByPlaceholderText('Type in your message here...') as HTMLInputElement;
    const sendButton = getByRole('button', { name: /Send/i });

    // Simulate user typing and sending a message
    fireEvent.change(input, { target: { value: 'Hello, Gandalf!' } });
    fireEvent.click(sendButton);

    // Verify input and button are disabled
    expect(input).toBeDisabled();
    expect(sendButton).toBeDisabled();

    // Wait for input and button to be re-enabled
    await waitFor(() => {
      expect(input).not.toBeDisabled();
      expect(sendButton).not.toBeDisabled();
    });
  });

  /**
   * Test audio playback when a reply with an audio URL is received
   * Mocks the API response and verifies that the audio is played
   */
  it('plays audio when a reply with an audio URL is received', async () => {
    const audioPlayMock = jest.spyOn(window.HTMLMediaElement.prototype, 'play').mockImplementation(() => Promise.resolve());

    // Mock successful API response
    jest.mocked(axios.post).mockResolvedValue({
      data: {
        reply: 'You shall not pass!',
        audioFileUrl: '/api/audio?file=gandalf_reply.mp3',
      },
    });

    const { getByPlaceholderText, getByRole } = render(<ChatPage />);
    const input = getByPlaceholderText('Type in your message here...');
    const sendButton = getByRole('button', { name: /Send/i });

    // Simulate user typing and sending a message
    fireEvent.change(input, { target: { value: 'Hello, Gandalf!' } });
    fireEvent.click(sendButton);

    // Verify audio is played
    await waitFor(() => {
      expect(audioPlayMock).toHaveBeenCalled();
    });

    audioPlayMock.mockRestore();
  });

  /**
   * Test that the input is cleared after sending a message
   * Verifies that the input field is cleared after the message is sent
   */
  it('clears the input after sending a message', async () => {
    // Mock successful API response
    jest.mocked(axios.post).mockResolvedValue({
      data: {
        reply: 'You shall not pass!',
        audioFileUrl: '/api/audio?file=gandalf_reply.mp3',
      },
    });

    const { getByPlaceholderText, getByRole } = render(<ChatPage />);
    const input = getByPlaceholderText('Type in your message here...');
    const sendButton = getByRole('button', { name: /Send/i });

    // Simulate user typing and sending a message
    fireEvent.change(input, { target: { value: 'Hello, Gandalf!' } });
    fireEvent.click(sendButton);

    // Verify input is cleared
    await waitFor(() => {
      expect((input as HTMLInputElement).value).toBe('');
    });
  });

  /**
   * Test that a message is not sent when the input is empty
   * Verifies that the API is not called when the input field is empty
   */
  it('does not send a message when input is empty', () => {
    const { getByRole } = render(<ChatPage />);
    const sendButton = getByRole('button', { name: /Send/i });

    // Simulate user clicking send button with empty input
    fireEvent.click(sendButton);

    // Verify API was not called
    expect(axios.post).not.toHaveBeenCalled();
  });

  /**
   * Test that a loading indicator is displayed while waiting for a reply
   * Verifies that the loading indicator is displayed during the API call
   */
  it('displays a loading indicator while waiting for a reply', async () => {
    // Mock delayed API response
    jest.mocked(axios.post).mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({
      data: {
        reply: 'You shall not pass!',
        audioFileUrl: '/api/audio?file=gandalf_reply.mp3',
      },
    }), 1000)));

    const { getByPlaceholderText, getByRole, getByTestId } = render(<ChatPage />);
    const input = getByPlaceholderText('Type in your message here...');
    const sendButton = getByRole('button', { name: /Send/i });

    // Simulate user typing and sending a message
    fireEvent.change(input, { target: { value: 'Hello, Gandalf!' } });
    fireEvent.click(sendButton);

    // Verify loading indicator is displayed
    await waitFor(() => {
      expect(getByTestId('loading-indicator')).toBeInTheDocument();
    });

    // Wait for loading indicator to be removed
    await waitForElementToBeRemoved(() => getByTestId('loading-indicator'), { timeout: 5000 });
  });

  /**
   * Test handling of multiple messages in sequence
   * Verifies that multiple messages can be sent and received in order
   */
  it('handles multiple messages in sequence', async () => {
    // Mock successful API response
    jest.mocked(axios.post).mockResolvedValue({
      data: {
        reply: 'You shall not pass!',
        audioFileUrl: '/api/audio?file=gandalf_reply.mp3',
      },
    });

    const { getByPlaceholderText, getByText, getByRole } = render(<ChatPage />);
    const input = getByPlaceholderText('Type in your message here...');
    const sendButton = getByRole('button', { name: /Send/i });

    // Simulate user typing and sending a message
    fireEvent.change(input, { target: { value: 'Hello, Gandalf!' } });
    fireEvent.click(sendButton);

    // Verify first message and reply appear in the UI
    await waitFor(() => {
      expect(getByText('Hello, Gandalf!')).toBeInTheDocument();
      expect(getByText('You shall not pass!')).toBeInTheDocument();
    });

    // Simulate user typing and sending another message
    fireEvent.change(input, { target: { value: 'What is your name?' } });
    fireEvent.click(sendButton);

    // Verify second message and reply appear in the UI
    await waitFor(() => {
      expect(getByText('What is your name?')).toBeInTheDocument();
      expect(getByText('You shall not pass!')).toBeInTheDocument();
    });
  });

  /**
   * Test handling of network errors
   * Verifies that the appropriate error message is displayed when a network error occurs
   */
  it('handles network errors gracefully', async () => {
    // Mock network error
    jest.mocked(axios.post).mockRejectedValue(new Error('Network Error'));

    const { getByPlaceholderText, getByRole, getByText } = render(<ChatPage />);
    const input = getByPlaceholderText('Type in your message here...');
    const sendButton = getByRole('button', { name: /Send/i });

    // Simulate user typing and sending a message
    fireEvent.change(input, { target: { value: 'Hello, Gandalf!' } });
    fireEvent.click(sendButton);

    // Verify error message is displayed
    await waitFor(() => {
      expect(getByText('Error sending message. Please try again.')).toBeInTheDocument();
    });
  });
});