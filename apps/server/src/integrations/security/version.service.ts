import { Injectable } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const packageJson = require('./../../../package.json');

@Injectable()
export class VersionService {
  constructor() {}

  async getVersion() {
    const releaseRepo = process.env.RELEASES_REPO || 'raven-docs/raven-docs';
    const releaseUrl = `https://github.com/${releaseRepo}/releases`;
    const apiUrl = `https://api.github.com/repos/${releaseRepo}/releases/latest`;

    let latestVersion = '';
    try {
      const response = await fetch(apiUrl);
      if (!response.ok) {
        return {
          currentVersion: packageJson?.version,
          latestVersion: '',
          releaseUrl,
        };
      }
      const data = await response.json();
      latestVersion = data?.tag_name?.replace('v', '');
    } catch (err) {
      return {
        currentVersion: packageJson?.version,
        latestVersion: '',
        releaseUrl,
      };
    }

    return {
      currentVersion: packageJson?.version,
      latestVersion: latestVersion,
      releaseUrl,
    };
  }
}
