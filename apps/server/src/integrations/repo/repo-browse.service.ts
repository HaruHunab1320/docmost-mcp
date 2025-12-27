import { Injectable } from '@nestjs/common';

type RepoHost = 'github' | 'gitlab' | 'bitbucket';

type RepoAuthTokens = {
  github?: string;
  gitlab?: string;
  bitbucket?: string;
};

type RepoBrowseInput = {
  host?: RepoHost;
  owner: string;
  repo: string;
  ref?: string;
  path?: string;
  tokens?: RepoAuthTokens;
};

type RepoFileResult = {
  host: RepoHost;
  owner: string;
  repo: string;
  ref: string;
  path: string;
  content: string;
  truncated: boolean;
  size?: number;
};

type RepoTreeEntry = {
  path: string;
  name: string;
  type: 'file' | 'dir';
};

type RepoTreeResult = {
  host: RepoHost;
  owner: string;
  repo: string;
  ref: string;
  path: string;
  entries: RepoTreeEntry[];
};

const DEFAULT_REF = 'main';
const DEFAULT_MAX_BYTES = 200_000;

const encodePathSegments = (path: string) =>
  path
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');

@Injectable()
export class RepoBrowseService {
  private resolveHost(host?: string): RepoHost {
    if (host === 'gitlab' || host === 'bitbucket') return host;
    return 'github';
  }

  private buildHeaders(host: RepoHost, tokens?: RepoAuthTokens) {
    const headers: Record<string, string> = {
      'User-Agent': 'raven-docs',
    };
    const token =
      host === 'github'
        ? tokens?.github
        : host === 'gitlab'
          ? tokens?.gitlab
          : tokens?.bitbucket;

    if (token) {
      if (host === 'gitlab') {
        headers['PRIVATE-TOKEN'] = token;
      } else {
        headers.Authorization = `Bearer ${token}`;
      }
    }

    if (host === 'github') {
      headers.Accept = 'application/vnd.github+json';
    }

    return headers;
  }

  async listTree(input: RepoBrowseInput): Promise<RepoTreeResult> {
    const host = this.resolveHost(input.host);
    const ref = input.ref || DEFAULT_REF;
    const path = input.path || '';
    const headers = this.buildHeaders(host, input.tokens);

    if (host === 'github') {
      const url = `https://api.github.com/repos/${input.owner}/${input.repo}/contents/${encodePathSegments(
        path,
      )}${ref ? `?ref=${encodeURIComponent(ref)}` : ''}`;
      const response = await fetch(url, { headers });
      if (!response.ok) {
        throw new Error(`GitHub error: ${response.status}`);
      }
      const data = await response.json();
      const entries: RepoTreeEntry[] = Array.isArray(data)
        ? data.map((entry) => ({
            path: entry.path,
            name: entry.name,
            type: entry.type === 'dir' ? 'dir' : 'file',
          }))
        : [
            {
              path: data.path,
              name: data.name,
              type: data.type === 'dir' ? 'dir' : 'file',
            },
          ];
      return {
        host,
        owner: input.owner,
        repo: input.repo,
        ref,
        path,
        entries,
      };
    }

    if (host === 'gitlab') {
      const projectId = encodeURIComponent(`${input.owner}/${input.repo}`);
      const url = `https://gitlab.com/api/v4/projects/${projectId}/repository/tree?ref=${encodeURIComponent(
        ref,
      )}&path=${encodeURIComponent(path)}`;
      const response = await fetch(url, { headers });
      if (!response.ok) {
        throw new Error(`GitLab error: ${response.status}`);
      }
      const data = await response.json();
      const entries: RepoTreeEntry[] = Array.isArray(data)
        ? data.map((entry) => ({
            path: entry.path,
            name: entry.name,
            type: entry.type === 'tree' ? 'dir' : 'file',
          }))
        : [];
      return {
        host,
        owner: input.owner,
        repo: input.repo,
        ref,
        path,
        entries,
      };
    }

    const url = `https://api.bitbucket.org/2.0/repositories/${input.owner}/${input.repo}/src/${encodeURIComponent(
      ref,
    )}/${path}`;
    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error(`Bitbucket error: ${response.status}`);
    }
    const data = await response.json();
    const entries: RepoTreeEntry[] = Array.isArray(data?.values)
      ? data.values.map((entry: any) => ({
          path: entry.path,
          name: entry.path.split('/').pop() || entry.path,
          type: entry.type === 'commit_directory' ? 'dir' : 'file',
        }))
      : [];
    return {
      host,
      owner: input.owner,
      repo: input.repo,
      ref,
      path,
      entries,
    };
  }

  async readFile(
    input: RepoBrowseInput & { maxBytes?: number },
  ): Promise<RepoFileResult> {
    const host = this.resolveHost(input.host);
    const ref = input.ref || DEFAULT_REF;
    const path = input.path || '';
    const headers = this.buildHeaders(host, input.tokens);
    const maxBytes = input.maxBytes ?? DEFAULT_MAX_BYTES;

    if (host === 'github') {
      const url = `https://api.github.com/repos/${input.owner}/${input.repo}/contents/${encodePathSegments(
        path,
      )}${ref ? `?ref=${encodeURIComponent(ref)}` : ''}`;
      const response = await fetch(url, { headers });
      if (!response.ok) {
        throw new Error(`GitHub error: ${response.status}`);
      }
      const data = await response.json();
      if (!data?.content) {
        throw new Error('GitHub content missing');
      }
      const buffer = Buffer.from(data.content, data.encoding || 'base64');
      const truncated = buffer.length > maxBytes;
      const content = buffer.slice(0, maxBytes).toString('utf8');
      return {
        host,
        owner: input.owner,
        repo: input.repo,
        ref,
        path,
        content,
        truncated,
        size: buffer.length,
      };
    }

    if (host === 'gitlab') {
      const projectId = encodeURIComponent(`${input.owner}/${input.repo}`);
      const filePath = encodeURIComponent(path);
      const url = `https://gitlab.com/api/v4/projects/${projectId}/repository/files/${filePath}?ref=${encodeURIComponent(
        ref,
      )}`;
      const response = await fetch(url, { headers });
      if (!response.ok) {
        throw new Error(`GitLab error: ${response.status}`);
      }
      const data = await response.json();
      if (!data?.content) {
        throw new Error('GitLab content missing');
      }
      const buffer = Buffer.from(data.content, data.encoding || 'base64');
      const truncated = buffer.length > maxBytes;
      const content = buffer.slice(0, maxBytes).toString('utf8');
      return {
        host,
        owner: input.owner,
        repo: input.repo,
        ref,
        path,
        content,
        truncated,
        size: buffer.length,
      };
    }

    const url = `https://api.bitbucket.org/2.0/repositories/${input.owner}/${input.repo}/src/${encodeURIComponent(
      ref,
    )}/${encodePathSegments(path)}`;
    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error(`Bitbucket error: ${response.status}`);
    }
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await response.json();
      if (Array.isArray(data?.values)) {
        throw new Error('Bitbucket path is a directory');
      }
      throw new Error('Bitbucket content missing');
    }
    const text = await response.text();
    const truncated = text.length > maxBytes;
    return {
      host,
      owner: input.owner,
      repo: input.repo,
      ref,
      path,
      content: truncated ? text.slice(0, maxBytes) : text,
      truncated,
      size: text.length,
    };
  }
}
