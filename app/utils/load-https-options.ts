import * as fs from 'fs/promises';
import path from 'path';

export const loadHttpsOptions = async (dir?: string) => {
  if (dir) {
    return {
      key: await fs.readFile(path.resolve(dir, 'key.pem')),
      cert: await fs.readFile(path.resolve(dir, 'cert.pem')),
    };
  }
};
