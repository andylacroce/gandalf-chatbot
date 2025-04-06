import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs/promises';
import path from 'path';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { file } = req.query;
  
  if (!file || typeof file !== 'string') {
    return res.status(400).json({ error: 'Invalid file specified' });
  }

  const filePath = path.join('/tmp', file);

  try {
    // Check file existence; if doesn't exist, an error will be thrown.
    await fs.access(filePath);
    await fs.unlink(filePath);
    return res.status(200).json({ message: 'File deleted' });
  } catch (error: any) {
    // If file doesn't exist, error.code will be 'ENOENT'
    if (error.code === 'ENOENT') {
      return res.status(200).json({ message: 'File already deleted' });
    }
    return res.status(500).json({ error: 'Error deleting file' });
  }
}