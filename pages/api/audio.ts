import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { file } = req.query;

  if (!file || typeof file !== 'string') {
    return res.status(400).json({ error: 'File parameter is required' });
  }

  const audioFilePath = path.join('/tmp', file);

  if (!fs.existsSync(audioFilePath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  const audioContent = fs.readFileSync(audioFilePath);

  res.setHeader('Content-Type', 'audio/mpeg');
  res.send(audioContent);
}