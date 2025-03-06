import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

/**
 * Handles the API request to fetch an audio file.
 * @param req - The API request object.
 * @param res - The API response object.
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

jest.mock('fs');
jest.mock('path');

describe('Audio API Handler', () => {
  let req: Partial<NextApiRequest>;
  let res: Partial<NextApiResponse>;

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

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return 400 if file parameter is missing', async () => {
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'File parameter is required' });
  });

  it('should return 404 if file does not exist', async () => {
    req.query = { file: 'nonexistent.mp3' };
    (path.resolve as jest.Mock).mockImplementation((...args) => args.join('/'));
    (fs.existsSync as jest.Mock).mockReturnValue(false);

    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'File not found' });
  });

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

  it('should return 403 if the file path is not within /tmp or public', async () => {
    req.query = { file: 'invalid.mp3' };
    (path.resolve as jest.Mock).mockImplementation((...args) => args.join('/'));
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.realpathSync as unknown as jest.Mock).mockImplementation((filePath: string) => '/invalid/path/' + filePath);

    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Access forbidden' });
  });

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