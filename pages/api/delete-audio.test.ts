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
    jest.clearAllMocks();
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
    (path.resolve as jest.Mock).mockImplementation(() => '/invalid/path/invalid.mp3');
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid file path' });
  });

  it('should return 404 if file does not exist', async () => {
    req.query = { file: 'nonexistent.mp3' };
    (path.resolve as jest.Mock).mockImplementation(() => '/tmp/nonexistent.mp3');
    (fs.existsSync as jest.Mock).mockReturnValue(false);
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'File not found' });
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