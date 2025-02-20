import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { file } = req.query;

  if (!file || typeof file !== 'string') {
    return res.status(400).json({ error: 'File parameter is required' });
  }

  const audioFilePath = path.resolve('/tmp', file);
  const localFilePath = path.resolve('public', file);

  const normalizedAudioFilePath = path.resolve(audioFilePath);
  const normalizedLocalFilePath = path.resolve(localFilePath);

  if (!normalizedAudioFilePath.startsWith('/tmp') && !normalizedLocalFilePath.startsWith(path.resolve('public'))) {
    return res.status(403).json({ error: 'Access forbidden' });
  }

  const filePath = fs.existsSync(audioFilePath) ? audioFilePath : localFilePath;

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  const audioContent = fs.readFileSync(filePath);

  res.setHeader('Content-Type', 'audio/mpeg');
  res.send(audioContent);
}