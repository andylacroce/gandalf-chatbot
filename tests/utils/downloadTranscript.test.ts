// Tests for downloadTranscript utility
import { downloadTranscript } from '../../src/utils/downloadTranscript';

describe('downloadTranscript', () => {
  beforeEach(() => {
    global.fetch = jest.fn(() => Promise.resolve({
      ok: true,
      blob: () => Promise.resolve(new Blob(['test transcript'], { type: 'text/plain' })),
      status: 200,
    })) as any;
    document.body.innerHTML = '';
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('triggers download with correct filename', async () => {
    const createObjectURL = jest.fn(() => 'blob:url');
    const revokeObjectURL = jest.fn();
    Object.defineProperty(window.URL, 'createObjectURL', { value: createObjectURL });
    Object.defineProperty(window.URL, 'revokeObjectURL', { value: revokeObjectURL });
    const click = jest.fn();
    // Create a real <a> element and mock its methods
    const anchor = document.createElement('a');
    anchor.setAttribute = jest.fn();
    anchor.click = click;
    anchor.remove = jest.fn();
    document.createElement = jest.fn(() => anchor) as any;

    await downloadTranscript([{ role: 'user', content: 'hi' }]);
    expect(global.fetch).toHaveBeenCalledWith('/api/transcript', expect.any(Object));
    expect(createObjectURL).toHaveBeenCalled();
    expect(click).toHaveBeenCalled();
  });

  it('throws on fetch error', async () => {
    (global.fetch as any).mockImplementationOnce(() => Promise.resolve({ ok: false, status: 500 }));
    await expect(downloadTranscript([{ role: 'user', content: 'hi' }])).rejects.toThrow('Failed to fetch transcript');
  });
});
