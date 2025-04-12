import { NextApiRequest, NextApiResponse } from 'next';
import deleteAudioHandler from '../pages/api/delete-audio';
import fs from 'fs/promises';
import path from 'path';

// Mock fs/promises and path
jest.mock('fs/promises');
jest.mock('path');

describe('delete-audio API Handler', () => {
  let req: Partial<NextApiRequest>;
  let res: Partial<NextApiResponse>;
  let mockAccess: jest.Mock;
  let mockUnlink: jest.Mock;
  let mockJoin: jest.Mock;
  let mockIsAbsolute: jest.Mock;

  beforeEach(() => {
    req = { query: {} } as Partial<NextApiRequest>;
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    
    // Setup the mocks for each test
    mockAccess = jest.fn();
    mockUnlink = jest.fn();
    mockJoin = jest.fn();
    mockIsAbsolute = jest.fn();
    
    // Assign the mocks to the imported modules
    (fs.access as jest.Mock) = mockAccess;
    (fs.unlink as jest.Mock) = mockUnlink;
    (path.join as jest.Mock) = mockJoin;
    (path.isAbsolute as jest.Mock) = mockIsAbsolute;
    
    jest.clearAllMocks();
  });

  it('should return 400 if file parameter is invalid (contains "..")', async () => {
    req.query = { file: '../test.mp3' };

    await deleteAudioHandler(req as NextApiRequest, res as NextApiResponse);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid file specified' });
  });

  it('should return 400 if file parameter is invalid (absolute path)', async () => {
    req.query = { file: '/absolute/path.mp3' };
    mockIsAbsolute.mockReturnValue(true);

    await deleteAudioHandler(req as NextApiRequest, res as NextApiResponse);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid file specified' });
  });

  it('should return 200 if the file is deleted successfully', async () => {
    req.query = { file: 'test.mp3' };
    mockJoin.mockReturnValue('/tmp/test.mp3');
    mockAccess.mockResolvedValue(undefined);
    mockUnlink.mockResolvedValue(undefined);

    await deleteAudioHandler(req as NextApiRequest, res as NextApiResponse);

    expect(mockJoin).toHaveBeenCalledWith('/tmp', 'test.mp3');
    expect(mockAccess).toHaveBeenCalledWith('/tmp/test.mp3');
    expect(mockUnlink).toHaveBeenCalledWith('/tmp/test.mp3');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ message: 'File deleted' });
  });

  it('should return 200 if the file is already deleted (ENOENT error)', async () => {
    req.query = { file: 'test.mp3' };
    mockJoin.mockReturnValue('/tmp/test.mp3');
    
    const error = new Error('File not found');
    (error as any).code = 'ENOENT';
    mockAccess.mockRejectedValue(error);

    await deleteAudioHandler(req as NextApiRequest, res as NextApiResponse);

    expect(mockJoin).toHaveBeenCalledWith('/tmp', 'test.mp3');
    expect(mockAccess).toHaveBeenCalledWith('/tmp/test.mp3');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ message: 'File already deleted' });
  });

  it('should return 500 if there is an unexpected error during file deletion', async () => {
    req.query = { file: 'test.mp3' };
    mockJoin.mockReturnValue('/tmp/test.mp3');
    mockAccess.mockResolvedValue(undefined);
    mockUnlink.mockRejectedValue(new Error('Unexpected error'));

    await deleteAudioHandler(req as NextApiRequest, res as NextApiResponse);

    expect(mockJoin).toHaveBeenCalledWith('/tmp', 'test.mp3');
    expect(mockAccess).toHaveBeenCalledWith('/tmp/test.mp3');
    expect(mockUnlink).toHaveBeenCalledWith('/tmp/test.mp3');
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Error deleting file' });
  });
});