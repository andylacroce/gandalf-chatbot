import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs/promises';
import path from 'path';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { file } = req.query;

  // Validate the file parameter
  if (!file || typeof file !== 'string' || file.includes('..') || path.isAbsolute(file)) {
    return res.status(400).json({ error: 'Invalid file specified' });
  }

  const filePath = path.join('/tmp', file);

  try {
    // Check file existence
    await fs.access(filePath);

    // Delete the file
    await fs.unlink(filePath);

    return res.status(200).json({ message: 'File deleted' });
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return res.status(200).json({ message: 'File already deleted' });
    }
    return res.status(500).json({ error: 'Error deleting file' });
  }
}