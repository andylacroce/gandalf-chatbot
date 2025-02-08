import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import axios from 'axios';
import ChatPage from './ChatPage';

jest.mock('axios');

describe('ChatPage Component', () => {
  it('renders ChatPage component', () => {
    const { getByPlaceholderText, getByAltText } = render(<ChatPage />);
    expect(getByPlaceholderText('Type in your message here...')).toBeInTheDocument();
    expect(getByAltText('Gandalf')).toBeInTheDocument();
  });

  it('sends a message and receives a reply', async () => {
    jest.mocked(axios.post).mockResolvedValue({
      data: {
        reply: 'You shall not pass!',
        audioFileUrl: '/api/audio?file=gandalf_reply.mp3',
      },
    });

    const { getByPlaceholderText, getByText, getByRole } = render(<ChatPage />);
    const input = getByPlaceholderText('Type in your message here...');
    const sendButton = getByRole('button', { name: /Send/i });

    fireEvent.change(input, { target: { value: 'Hello, Gandalf!' } });
    fireEvent.click(sendButton);

    expect(axios.post).toHaveBeenCalledWith('/api/chat', { message: 'Hello, Gandalf!' });

    await waitFor(() => {
      expect(getByText('Hello, Gandalf!')).toBeInTheDocument();
      expect(getByText('You shall not pass!')).toBeInTheDocument();
    });
  });

  it('displays an error message when the API call fails', async () => {
    jest.mocked(axios.post).mockRejectedValue(new Error('API call failed'));

    const { getByPlaceholderText, getByRole, getByText } = render(<ChatPage />);
    const input = getByPlaceholderText('Type in your message here...');
    const sendButton = getByRole('button', { name: /Send/i });

    fireEvent.change(input, { target: { value: 'Hello, Gandalf!' } });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(getByText('Error sending message. Please try again.')).toBeInTheDocument();
    });
  });

  it('disables the input and button while loading', async () => {
    const { getByPlaceholderText, getByRole } = render(<ChatPage />);
    const input = getByPlaceholderText('Type in your message here...');
    const sendButton = getByRole('button', { name: /Send/i });

    fireEvent.change(input, { target: { value: 'Hello, Gandalf!' } });
    fireEvent.click(sendButton);

    expect(input).toBeDisabled();
    expect(sendButton).toBeDisabled();

    await waitFor(() => {
      expect(input).not.toBeDisabled();
      expect(sendButton).not.toBeDisabled();
    });
  });

  it('plays audio when a reply with an audio URL is received', async () => {
    const audioPlayMock = jest.spyOn(window.HTMLMediaElement.prototype, 'play').mockImplementation(() => Promise.resolve());

    jest.mocked(axios.post).mockResolvedValue({
      data: {
        reply: 'You shall not pass!',
        audioFileUrl: '/api/audio?file=gandalf_reply.mp3',
      },
    });

    const { getByPlaceholderText, getByRole } = render(<ChatPage />);
    const input = getByPlaceholderText('Type in your message here...');
    const sendButton = getByRole('button', { name: /Send/i });

    fireEvent.change(input, { target: { value: 'Hello, Gandalf!' } });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(audioPlayMock).toHaveBeenCalled();
    });

    audioPlayMock.mockRestore();
  });
});