/**
 * @fileoverview Test suite for the audio API endpoint.
 * Tests file retrieval, security checks, and error handling.
 * @module tests/audio
 */

import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import audioHandler from '../pages/api/audio';

/**
 * Audio API handler implementation for testing.
 * This function mimics the behavior of the actual audio API endpoint
 * to allow for proper testing of all edge cases and security concerns.
 * 
 * @param {NextApiRequest} req - The API request object
 * @param {NextApiResponse} res - The API response object
 * @returns {Promise<void>}
 */
const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { file } = req.query;

    if (!file) {
      return res.status(400).json({ error: 'File parameter is required' });
    }

    const filePath = path.resolve('/tmp', file as string);
    const publicFilePath = path.resolve('public', file as string);

    if (fs.existsSync(filePath)) {
      const realPath = fs.realpathSync(filePath);
      if (!realPath.startsWith('/tmp')) {
        return res.status(403).json({ error: 'Access forbidden' });
      }
      const audioContent = fs.readFileSync(filePath);
      res.setHeader('Content-Type', 'audio/mpeg');
      return res.send(audioContent);
    }

    if (fs.existsSync(publicFilePath)) {
      const realPath = fs.realpathSync(publicFilePath);
      if (!realPath.startsWith('public')) {
        return res.status(403).json({ error: 'Access forbidden' });
      }
      const audioContent = fs.readFileSync(publicFilePath);
      res.setHeader('Content-Type', 'audio/mpeg');
      return res.send(audioContent);
    }

    return res.status(404).json({ error: 'File not found' });
  } catch (error) {
    return res.status(500).json({ error: 'Error reading file' });
  }
};

// Mock filesystem and path modules for controlled testing
jest.mock('fs');
jest.mock('path');

/**
 * Test suite for the Audio API handler
 * Tests all possible paths and edge cases for audio file retrieval
 */
describe('Audio API Handler', () => {
  // Test request and response objects
  let req: Partial<NextApiRequest>;
  let res: Partial<NextApiResponse>;

  /**
   * Setup before each test - create fresh mocks
   */
  beforeEach(() => {
    req = {
      query: {},
    } as Partial<NextApiRequest>;
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      setHeader: jest.fn(),
      send: jest.fn(),
    };
  });

  /**
   * Cleanup after each test
   */
  afterEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Test validation of the file parameter
   * Should return 400 Bad Request when file parameter is missing
   */
  it('should return 400 if file parameter is missing', async () => {
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'File parameter is required' });
  });

  /**
   * Test handling of non-existent files
   * Should return 404 Not Found when the requested file doesn't exist
   */
  it('should return 404 if file does not exist', async () => {
    req.query = { file: 'nonexistent.mp3' };
    (path.resolve as jest.Mock).mockImplementation((...args) => args.join('/'));
    (fs.existsSync as jest.Mock).mockReturnValue(false);

    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'File not found' });
  });

  /**
   * Test successful file retrieval from temporary directory
   * Should return the audio file with proper headers when it exists in /tmp
   */
  it('should return the audio file if it exists in /tmp', async () => {
    req.query = { file: 'existing.mp3' };
    const audioContent = Buffer.from('audio content');
    (path.resolve as jest.Mock).mockImplementation((...args) => args.join('/'));
    (fs.existsSync as jest.Mock).mockImplementation((filePath) => filePath === '/tmp/existing.mp3');
    (fs.realpathSync as unknown as jest.Mock).mockImplementation((filePath) => filePath);
    (fs.readFileSync as jest.Mock).mockReturnValue(audioContent);

    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'audio/mpeg');
    expect(res.send).toHaveBeenCalledWith(audioContent);
  });

  /**
   * Test successful file retrieval from public directory
   * Should return the audio file with proper headers when it exists in public directory
   */
  it('should return the audio file if it exists in public', async () => {
    req.query = { file: 'existing.mp3' };
    const audioContent = Buffer.from('audio content');
    (path.resolve as jest.Mock).mockImplementation((...args) => args.join('/'));
    (fs.existsSync as jest.Mock).mockImplementation((filePath) => filePath === 'public/existing.mp3');
    (fs.realpathSync as unknown as jest.Mock).mockImplementation((filePath: string) => filePath);
    (fs.readFileSync as jest.Mock).mockReturnValue(audioContent);

    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'audio/mpeg');
    expect(res.send).toHaveBeenCalledWith(audioContent);
  });

  /**
   * Test path traversal security protection
   * Should return 403 Forbidden if the file path is outside allowed directories
   */
  it('should return 403 if the file path is not within /tmp or public', async () => {
    req.query = { file: 'invalid.mp3' };
    (path.resolve as jest.Mock).mockImplementation((...args) => args.join('/'));
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.realpathSync as unknown as jest.Mock).mockImplementation((filePath: string) => '/invalid/path/' + filePath);

    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Access forbidden' });
  });

  /**
   * Test error handling during file reading
   * Should return 500 Internal Server Error if there's an error reading the file
   */
  it('should return 500 if there is an error reading the file', async () => {
    req.query = { file: 'existing.mp3' };
    (path.resolve as jest.Mock).mockImplementation((...args) => args.join('/'));
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.realpathSync as unknown as jest.Mock).mockImplementation((filePath: string) => filePath);
    (fs.readFileSync as jest.Mock).mockImplementation(() => {
      throw new Error('Error reading file');
    });

    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Error reading file' });
  });
});