import { NextApiRequest, NextApiResponse } from 'next';
import handler from './delete-audio';
import fs from 'fs/promises';
import path from 'path';

// Mock fs/promises and path
jest.mock('fs/promises', () => ({
  access: jest.fn(), // Ensure access is a Jest mock function
  unlink: jest.fn(), // Ensure unlink is a Jest mock function
}));
jest.mock('path', () => ({
  join: jest.fn(),
  isAbsolute: jest.fn(),
}));

describe('delete-audio API Handler', () => {
  let req: Partial<NextApiRequest>;
  let res: Partial<NextApiResponse>;

  beforeEach(() => {
    req = { query: {} } as Partial<NextApiRequest>;
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    jest.clearAllMocks();
  });

  it('should return 400 if file parameter is invalid (contains "..")', async () => {
    req.query = { file: '../test.mp3' };

    await handler(req as NextApiRequest, res as NextApiResponse);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid file specified' });
  });

  it('should return 400 if file parameter is invalid (absolute path)', async () => {
    req.query = { file: '/absolute/path.mp3' };
    (path.isAbsolute as jest.Mock).mockReturnValue(true);

    await handler(req as NextApiRequest, res as NextApiResponse);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid file specified' });
  });

  it.skip('should return 200 if the file is deleted successfully', async () => {
    req.query = { file: 'test.mp3' };
    (path.join as jest.Mock).mockReturnValue('/tmp/test.mp3');
    (fs.access as jest.Mock).mockResolvedValue(undefined);
    (fs.unlink as jest.Mock).mockResolvedValue(undefined);

    await handler(req as NextApiRequest, res as NextApiResponse);

    expect(path.join).toHaveBeenCalledWith('/tmp', 'test.mp3');
    expect(fs.access).toHaveBeenCalledWith('/tmp/test.mp3');
    expect(fs.unlink).toHaveBeenCalledWith('/tmp/test.mp3');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ message: 'File deleted' });
  });

  it.skip('should return 200 if the file is already deleted (ENOENT error)', async () => {
    req.query = { file: 'test.mp3' };
    (path.join as jest.Mock).mockReturnValue('/tmp/test.mp3');
    (fs.access as jest.Mock).mockRejectedValue(Object.assign(new Error('File not found'), { code: 'ENOENT' }));

    await handler(req as NextApiRequest, res as NextApiResponse);

    expect(path.join).toHaveBeenCalledWith('/tmp', 'test.mp3');
    expect(fs.access).toHaveBeenCalledWith('/tmp/test.mp3');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ message: 'File already deleted' });
  });

  it.skip('should return 500 if there is an unexpected error during file deletion', async () => {
    req.query = { file: 'test.mp3' };
    (path.join as jest.Mock).mockReturnValue('/tmp/test.mp3');
    (fs.access as jest.Mock).mockResolvedValue(undefined);
    (fs.unlink as jest.Mock).mockRejectedValue(new Error('Unexpected error'));

    await handler(req as NextApiRequest, res as NextApiResponse);

    expect(path.join).toHaveBeenCalledWith('/tmp', 'test.mp3');
    expect(fs.access).toHaveBeenCalledWith('/tmp/test.mp3');
    expect(fs.unlink).toHaveBeenCalledWith('/tmp/test.mp3');
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Error deleting file' });
  });
});