import * as fs from 'fs/promises';
import { GMSOLDeployment } from 'gmsol';

export const loadGMSOLDeployment = async (path?: string) => {
  if (path) {
    const content = await fs.readFile(path, 'utf-8');
    return JSON.parse(content) as GMSOLDeployment;
  }
};
