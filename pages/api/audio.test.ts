import { NextApiRequest, NextApiResponse } from 'next';
import handler from './audio';
import fs from 'fs';
import path from 'path';

jest.mock('fs');
jest.mock('path');

describe('Audio API Handler', () => {
  let req: Partial<NextApiRequest>;
  let res: Partial<NextApiResponse>;

  beforeEach(() => {
    req = {
      query: {},
    };
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
    req.query = req.query || {};
    req.query.file = 'nonexistent.mp3';
    (path.join as jest.Mock).mockReturnValue('/tmp/nonexistent.mp3');
    (fs.existsSync as jest.Mock).mockReturnValue(false);

    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'File not found' });
  });

  it('should return the audio file if it exists', async () => {
    req.query = req.query || {};
    req.query.file = 'existing.mp3';
    const audioContent = Buffer.from('audio content');
    (path.join as jest.Mock).mockReturnValue('/tmp/existing.mp3');
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue(audioContent);

    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'audio/mpeg');
    expect(res.send).toHaveBeenCalledWith(audioContent);
  });
});