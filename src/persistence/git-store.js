import { Buffer } from 'buffer';
import FS from '@isomorphic-git/lightning-fs';
import * as git from 'isomorphic-git';

// isomorphic-git's internals (e.g. its git-index cache) reference Node's
// global Buffer directly — not polyfilled by Vite/the browser by default.
// Discovered via browser testing, not documented anywhere in isomorphic-git's
// own docs.
window.Buffer = Buffer;

const DIR = '/issues';

// No auth/identity system exists yet (ADR-0010 is still single-user,
// local-only) — every commit uses this fixed placeholder author.
const AUTHOR = { name: 'Canvallax', email: 'local@canvallax.app' };

const fs = new FS('canvallax');
const pfs = fs.promises;

export async function initRepo() {
  try {
    await pfs.stat(`${DIR}/.git`);
  } catch (error) {
    await pfs.mkdir(DIR).catch(() => {}); // may already exist
    await git.init({ fs, dir: DIR });
  }
}

export async function listIssueFiles() {
  const entries = await pfs.readdir(DIR);
  return entries.filter((name) => name.endsWith('.json'));
}

export async function readIssueFile(filename) {
  const content = await pfs.readFile(`${DIR}/${filename}`, 'utf8');
  return JSON.parse(content);
}

export async function writeIssueFile(filename, issue) {
  await pfs.writeFile(`${DIR}/${filename}`, JSON.stringify(issue, null, 2), 'utf8');
}

export async function commitIssue(filename, message) {
  await git.add({ fs, dir: DIR, filepath: filename });
  await git.commit({ fs, dir: DIR, message, author: AUTHOR });
}

// Data-layer support for the deferred history-browsing UI (Step 3b) — git.log
// natively filters to commits touching one specific file.
export async function getIssueHistory(issueId) {
  return git.log({ fs, dir: DIR, filepath: `${issueId}.json` });
}

// ADR-0010's diffing rule: only commits where views[view].content actually
// changed count as a "version" of that view. getIssueHistory only narrows to
// commits that touched this issue's file at all; a commit can touch several
// views at once (e.g. a bulk import), so this walks oldest-to-newest and
// keeps only the entries where this specific field actually differs from
// the previously-kept one.
export async function getViewHistory(issueId, view) {
  const commits = await getIssueHistory(issueId);
  const chronological = [...commits].reverse();

  const entries = [];
  let previousContent;
  for (const commit of chronological) {
    const issueAtCommit = await readIssueAtCommit(issueId, commit.oid);
    const content = issueAtCommit.views[view]?.content ?? '';
    if (content !== previousContent) {
      entries.push({ oid: commit.oid, message: commit.commit.message, timestamp: commit.commit.author.timestamp });
    }
    previousContent = content;
  }

  return entries.reverse(); // newest first
}

// ADR-0011: source content for a copy is always read at HEAD. getIssueHistory
// returns commits newest-first, so the first entry's oid is HEAD.
export async function getHeadCommitOid(issueId) {
  const commits = await getIssueHistory(issueId);
  return commits[0]?.oid ?? null;
}

export async function readIssueAtCommit(issueId, oid) {
  const { blob } = await git.readBlob({ fs, dir: DIR, oid, filepath: `${issueId}.json` });
  // readBlob returns raw bytes; Buffer isn't available in the browser, so
  // decode with TextDecoder (the official docs' own example uses Buffer,
  // which is Node-only and would not work here).
  return JSON.parse(new TextDecoder().decode(blob));
}
