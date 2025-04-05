import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'DELETE') {
    res.setHeader('Allow', ['DELETE']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { file } = req.query;

  if (!file || typeof file !== 'string') {
    return res.status(400).json({ error: 'File parameter is required' });
  }

  // Sanitize the file name to prevent directory traversal attacks
  const sanitizedFile = path.basename(file);
  const filePath = path.resolve('/tmp', sanitizedFile);

  // Ensure the resolved file path is within the /tmp directory
  if (!filePath.startsWith(path.resolve('/tmp'))) {
    return res.status(403).json({ error: 'Invalid file path' });
  }

  // Check if the file exists and delete it
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
      return res.status(200).json({ message: 'File deleted successfully' });
    } catch (error) {
      console.error('Error deleting file:', error);
      return res.status(500).json({ error: 'Failed to delete file' });
    }
  } else {
    return res.status(404).json({ error: 'File not found' });
  }
}