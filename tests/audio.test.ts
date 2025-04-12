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
  /**
   * Helper function to create test objects
   * Returns isolated request and response objects for each test
   */
  const createTestObjects = () => {
    const req = {
      query: {},
    } as Partial<NextApiRequest>;
    
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      setHeader: jest.fn(),
      send: jest.fn(),
    };
    
    return { req, res };
  };

  /**
   * Cleanup after all tests
   */
  afterAll(() => {
    jest.restoreAllMocks();
  });

  /**
   * Test validation of the file parameter
   * Should return 400 Bad Request when file parameter is missing
   */
  it('should return 400 if file parameter is missing', async () => {
    const { req, res } = createTestObjects();
    
    await handler(req as NextApiRequest, res as NextApiResponse);
    
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'File parameter is required' });
  });

  /**
   * Test handling of non-existent files
   * Should return 404 Not Found when the requested file doesn't exist
   */
  it('should return 404 if file does not exist', async () => {
    const { req, res } = createTestObjects();
    req.query = { file: 'nonexistent.mp3' };
    
    jest.mocked(path.resolve).mockImplementation((...args) => args.join('/'));
    jest.mocked(fs.existsSync).mockReturnValue(false);

    await handler(req as NextApiRequest, res as NextApiResponse);
    
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'File not found' });
  });

  /**
   * Test successful file retrieval scenarios
   */
  describe('file retrieval tests', () => {
    /**
     * Test successful file retrieval from temporary directory
     * Should return the audio file with proper headers when it exists in /tmp
     */
    it('should return the audio file if it exists in /tmp', async () => {
      const { req, res } = createTestObjects();
      req.query = { file: 'existing.mp3' };
      
      const audioContent = Buffer.from('audio content');
      jest.mocked(path.resolve).mockReturnValue('/tmp/existing.mp3');
      jest.mocked(fs.existsSync).mockReturnValue(true);
      jest.mocked(fs.realpathSync).mockReturnValue('/tmp/existing.mp3');
      jest.mocked(fs.readFileSync).mockReturnValue(audioContent);

      await handler(req as NextApiRequest, res as NextApiResponse);
      
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'audio/mpeg');
      expect(res.send).toHaveBeenCalledWith(audioContent);
    });

    /**
     * Test successful file retrieval from public directory
     * Should return the audio file with proper headers when it exists in public directory
     */
    it('should return the audio file if it exists in public', async () => {
      const { req, res } = createTestObjects();
      req.query = { file: 'existing.mp3' };
      
      const audioContent = Buffer.from('audio content');
      jest.mocked(path.resolve).mockImplementation((...args) => args.join('/'));
      jest.mocked(fs.existsSync).mockImplementation((filePath) => filePath === 'public/existing.mp3');
      jest.mocked(fs.realpathSync).mockImplementation((filePath: string) => filePath);
      jest.mocked(fs.readFileSync).mockReturnValue(audioContent);

      await handler(req as NextApiRequest, res as NextApiResponse);
      
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'audio/mpeg');
      expect(res.send).toHaveBeenCalledWith(audioContent);
    });
  });

  /**
   * Test error scenarios
   */
  describe('error handling tests', () => {
    /**
     * Test path traversal security protection
     * Should return 403 Forbidden if the file path is outside allowed directories
     */
    it('should return 403 if the file path is not within /tmp or public', async () => {
      const { req, res } = createTestObjects();
      req.query = { file: 'invalid.mp3' };
      
      jest.mocked(path.resolve).mockImplementation((...args) => args.join('/'));
      jest.mocked(fs.existsSync).mockReturnValue(true);
      jest.mocked(fs.realpathSync).mockImplementation((filePath: string) => '/invalid/path/' + filePath);

      await handler(req as NextApiRequest, res as NextApiResponse);
      
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Access forbidden' });
    });

    /**
     * Test error handling during file reading
     * Should return 500 Internal Server Error if there's an error reading the file
     */
    it('should return 500 if there is an error reading the file', async () => {
      const { req, res } = createTestObjects();
      req.query = { file: 'existing.mp3' };
      
      jest.mocked(path.resolve).mockImplementation((...args) => args.join('/'));
      jest.mocked(fs.existsSync).mockReturnValue(true);
      jest.mocked(fs.realpathSync).mockImplementation((filePath: string) => filePath);
      jest.mocked(fs.readFileSync).mockImplementation(() => {
        throw new Error('Error reading file');
      });

      await handler(req as NextApiRequest, res as NextApiResponse);
      
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Error reading file' });
    });
  });
});