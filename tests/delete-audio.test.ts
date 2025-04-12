/**
 * @fileoverview Test suite for the delete-audio API endpoint.
 * Tests file deletion functionality, security checks, and error handling.
 * @module tests/delete-audio
 */

import { NextApiRequest, NextApiResponse } from 'next';
import deleteAudioHandler from '../pages/api/delete-audio';
import fs from 'fs/promises';
import path from 'path';

// Mock fs/promises and path modules for controlled testing
jest.mock('fs/promises');
jest.mock('path');

/**
 * Test suite for the delete-audio API handler
 * Tests security validations, successful deletion, and error handling scenarios
 */
describe('delete-audio API Handler', () => {
  // Test request and response objects
  let req: Partial<NextApiRequest>;
  let res: Partial<NextApiResponse>;
  
  // Mock function declarations
  let mockAccess: jest.Mock;
  let mockUnlink: jest.Mock;
  let mockJoin: jest.Mock;
  let mockIsAbsolute: jest.Mock;

  /**
   * Setup before each test - create fresh mocks
   * Initializes mock functions and request/response objects
   */
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

  /**
   * Test protection against directory traversal attacks
   * Should return 400 Bad Request if the file parameter contains ".." for path traversal
   */
  it('should return 400 if file parameter is invalid (contains "..")', async () => {
    req.query = { file: '../test.mp3' };

    await deleteAudioHandler(req as NextApiRequest, res as NextApiResponse);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid file specified' });
  });

  /**
   * Test protection against absolute path injections
   * Should return 400 Bad Request if the file parameter is an absolute path
   */
  it('should return 400 if file parameter is invalid (absolute path)', async () => {
    req.query = { file: '/absolute/path.mp3' };
    mockIsAbsolute.mockReturnValue(true);

    await deleteAudioHandler(req as NextApiRequest, res as NextApiResponse);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid file specified' });
  });

  /**
   * Test successful file deletion
   * Should return 200 OK when the file is successfully deleted
   */
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

  /**
   * Test graceful handling of already deleted files
   * Should return 200 OK with a specific message when file doesn't exist (ENOENT error)
   */
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

  /**
   * Test error handling during file deletion
   * Should return 500 Internal Server Error if an unexpected error occurs during deletion
   */
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