import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import handler from './delete-audio';

jest.mock('fs');
jest.mock('path');

describe('Delete Audio API Handler', () => {
  let req: Partial<NextApiRequest>;
  let res: Partial<NextApiResponse>;

  beforeEach(() => {
    req = {
      method: 'DELETE',
      query: {},
    } as Partial<NextApiRequest>;
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      setHeader: jest.fn(),
      end: jest.fn(),
    };
  });

  afterEach(() => {
    jest.restoreAllMocks(); // Ensure mocks are restored after each test
    jest.clearAllMocks(); // Clear all mocks to avoid interference between tests
  });

  it('should return 405 if method is not DELETE', async () => {
    req.method = 'GET';
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(res.setHeader).toHaveBeenCalledWith('Allow', ['DELETE']);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.end).toHaveBeenCalledWith('Method GET Not Allowed');
  });

  it('should return 400 if file parameter is missing', async () => {
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'File parameter is required' });
  });

  it('should return 403 if file path is invalid', async () => {
    req.query = { file: 'invalid.mp3' };

    // Mock path.basename to return the sanitized file name
    jest.spyOn(path, 'basename').mockReturnValue('invalid.mp3');

    // Mock path.resolve to simulate an invalid file path outside /tmp
    jest.spyOn(path, 'resolve').mockImplementation((...args) => {
      const resolvedPath = path.join('/invalid/path', args[args.length - 1] as string);
      return resolvedPath;
    });

    // Mock path.join to ensure consistency
    jest.spyOn(path, 'join').mockImplementation((...args) => {
      return args.join('/');
    });

    await handler(req as NextApiRequest, res as NextApiResponse);

    // Assertions
    expect(path.resolve).toHaveBeenCalledWith('/tmp', 'invalid.mp3');
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid file path' });

    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('should return 200 if file is deleted successfully', async () => {
    req.query = { file: 'existing.mp3' };
    (path.resolve as jest.Mock).mockImplementation(() => '/tmp/existing.mp3');
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.unlinkSync as jest.Mock).mockImplementation(() => {});
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ message: 'File deleted successfully' });
  });
});