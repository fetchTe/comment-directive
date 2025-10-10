/**                                                                       @about
@file: _macro_.ts
@docs: https://bun.sh/docs/bundler/macros
@desc: Macros let you create functions whose return value is directly
      inlined at build/bundle-time
***                                                                           */
import {
  name,
  version,
  repository,
  description,
} from '../package.json';
import {
  execSync,
} from 'node:child_process';

const getGitCommitHash = () => {
  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim();
  } catch (err) {
    console.error('[getGitCommitHash] '
      + (((err instanceof Error) ? err.message : null) ?? 'unknown error'));
  }
  return 'unknown';
};

export const getMeta = () => ({
  name,
  version,
  repo: repository.url,
  description,
  compressed: true, // if data is compressed
  commit: getGitCommitHash(),
  btime: new Date().toISOString().slice(0, 16).replace(':', ''),
} as const);
