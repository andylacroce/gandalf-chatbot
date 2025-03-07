import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

/**
 * API handler for serving audio files
 * @param req - The API request object
 * @param res - The API response object
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { file } = req.query;

  if (!file || typeof file !== 'string') {
    return res.status(400).json({ error: 'File parameter is required' });
  }

  const sanitizedFile = path.basename(file);
  const audioFilePath = path.resolve('/tmp', sanitizedFile);
  const localFilePath = path.resolve('public', sanitizedFile);

  const checkFileExists = (filePath: string) => fs.existsSync(filePath) ? fs.realpathSync(filePath) : '';

  let normalizedAudioFilePath = checkFileExists(audioFilePath);
  let normalizedLocalFilePath = checkFileExists(localFilePath);

  for (let i = 0; i < 2; i++) {
    if (normalizedAudioFilePath || normalizedLocalFilePath) break;
    await new Promise(resolve => setTimeout(resolve, 1000));
    normalizedAudioFilePath = checkFileExists(audioFilePath);
    normalizedLocalFilePath = checkFileExists(localFilePath);
  }

  if (!normalizedAudioFilePath.startsWith(path.resolve('/tmp')) && !normalizedLocalFilePath.startsWith(path.resolve('public'))) {
    return res.status(404).json({ error: 'File not found' });
  }

  const filePath = normalizedAudioFilePath || normalizedLocalFilePath;

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  const audioContent = fs.readFileSync(filePath);

  res.setHeader('Content-Type', 'audio/mpeg');
  res.send(audioContent);
}