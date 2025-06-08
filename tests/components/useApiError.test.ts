import { renderHook, act } from '@testing-library/react';
import { useApiError } from '../../app/components/useApiError';

describe('useApiError', () => {
  it('should initialize with empty error', () => {
    const { result } = renderHook(() => useApiError());
    expect(result.current.error).toBe('');
  });

  it('should set a generic error for string error', () => {
    const { result } = renderHook(() => useApiError());
    act(() => {
      result.current.handleApiError('some error');
    });
    expect(result.current.error).toBe('Error sending message. Please try again.');
  });

  it('should set a specific error for 429', () => {
    const { result } = renderHook(() => useApiError());
    act(() => {
      result.current.handleApiError({ response: { status: 429 } });
    });
    expect(result.current.error).toMatch(/too quickly/i);
  });

  it('should set a specific error for 408', () => {
    const { result } = renderHook(() => useApiError());
    act(() => {
      result.current.handleApiError({ response: { status: 408 } });
    });
    expect(result.current.error).toMatch(/too long/i);
  });

  it('should set a generic error for 500', () => {
    const { result } = renderHook(() => useApiError());
    act(() => {
      result.current.handleApiError({ response: { status: 500 } });
    });
    expect(result.current.error).toBe('Error sending message. Please try again.');
  });

  it('should set a custom error from response.data.error', () => {
    const { result } = renderHook(() => useApiError());
    act(() => {
      result.current.handleApiError({ response: { data: { error: 'Custom error' } } });
    });
    expect(result.current.error).toBe('Custom error');
  });

  it('should set a generic error for unknown object', () => {
    const { result } = renderHook(() => useApiError());
    act(() => {
      result.current.handleApiError({});
    });
    expect(result.current.error).toBe('Error sending message. Please try again.');
  });

  it('should clear error if called with falsy', () => {
    const { result } = renderHook(() => useApiError());
    act(() => {
      result.current.setError('Some error');
      result.current.handleApiError(undefined);
    });
    expect(result.current.error).toBe('');
  });
});
