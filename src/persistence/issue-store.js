import {
  initRepo,
  listIssueFiles,
  readIssueFile,
  writeIssueFile,
  commitIssue,
  readIssueAtCommit,
  getHeadCommitOid,
} from './git-store.js';
import { seedIssues } from './seed-issues.js';

const SAVE_DEBOUNCE_MS = 1500;
const saveTimers = new Map(); // issueId -> setTimeout handle

export async function loadAllIssues() {
  await initRepo();

  let files = await listIssueFiles();
  if (files.length === 0) {
    // True first run — seed the example issues so the app isn't a dead end
    // (there's still no "create issue" UI).
    for (const issue of seedIssues) {
      const filename = `${issue.id}.json`;
      await writeIssueFile(filename, issue);
      await commitIssue(filename, `seed: ${issue.name}`);
    }
    files = await listIssueFiles();
  }

  return Promise.all(files.map((filename) => readIssueFile(filename)));
}

// ADR-0007 schema: Issue is just {id, name, status} plus views and a
// backlogEntries list.
export async function createIssue() {
  const now = new Date().toISOString();
  const issue = {
    id: crypto.randomUUID(),
    schemaVersion: 2,
    name: 'Untitled Issue',
    status: 'open',
    createdAt: now,
    updatedAt: now,
    views: {
      process: { id: crypto.randomUUID(), format: 'bpmn-xml', content: '' },
      system: { id: crypto.randomUUID(), format: 'drawio-xml', content: '' },
      interaction: { id: crypto.randomUUID(), format: 'drawio-xml', content: '' },
      object: { id: crypto.randomUUID(), format: 'mermaid', content: '' },
    },
    backlogEntries: [],
  };

  const filename = `${issue.id}.json`;
  await writeIssueFile(filename, issue);
  await commitIssue(filename, `create: ${issue.name}`);

  return issue;
}

// Immediate commit, not debounced — restoring is a discrete, deliberate
// action like createIssue(), not rapid-fire typing.
export async function restoreView(issue, view, oid) {
  const issueAtCommit = await readIssueAtCommit(issue.id, oid);
  issue.views[view].content = issueAtCommit.views[view]?.content ?? '';
  issue.updatedAt = new Date().toISOString();

  const filename = `${issue.id}.json`;
  await writeIssueFile(filename, issue);
  await commitIssue(filename, `restore: ${view} to an earlier version`);
}

// ADR-0007: a Backlog entry has no status — it exists (a needed change) or
// it's deleted (resolved/dropped), no in-between. Both mutations below are
// immediate commits, like createIssue()/restoreView() — discrete actions,
// not rapid-fire typing (unlike editing an existing entry's name/description,
// which goes through scheduleSave below instead).
export async function addBacklogEntry(issue, name) {
  const now = new Date().toISOString();
  const entry = { id: crypto.randomUUID(), name, description: '', createdAt: now, updatedAt: now };
  issue.backlogEntries.push(entry);
  issue.updatedAt = now;

  const filename = `${issue.id}.json`;
  await writeIssueFile(filename, issue);
  await commitIssue(filename, `add entry: ${name}`);

  return entry;
}

export async function deleteBacklogEntry(issue, entryId) {
  const entry = issue.backlogEntries.find((e) => e.id === entryId);
  issue.backlogEntries = issue.backlogEntries.filter((e) => e.id !== entryId);
  issue.updatedAt = new Date().toISOString();

  const filename = `${issue.id}.json`;
  await writeIssueFile(filename, issue);
  await commitIssue(filename, `delete entry: ${entry?.name ?? entryId}`);
}

// ADR-0011: view copy is overwrite — destination keeps its own view id,
// only content + copiedFrom are replaced.
export async function copyView(sourceIssue, view, destIssue) {
  const sourceOid = await getHeadCommitOid(sourceIssue.id);
  const sourceView = sourceIssue.views[view];

  destIssue.views[view] = {
    ...destIssue.views[view],
    content: sourceView.content,
    copiedFrom: { issueId: sourceIssue.id, viewId: sourceView.id, commit: sourceOid, at: new Date().toISOString() },
  };
  destIssue.updatedAt = new Date().toISOString();

  const filename = `${destIssue.id}.json`;
  await writeIssueFile(filename, destIssue);
  await commitIssue(filename, `copy(${view}): from ${sourceIssue.id}@${sourceOid}`);
}

// ADR-0011: Backlog-entry copy is list-append, not overwrite — entries are
// a list, not a singleton slot. A genuinely new entry (new id) in the
// destination, cloned content, provenance anchored on the source entry's id.
export async function copyBacklogEntry(sourceIssue, entryId, destIssue) {
  const sourceOid = await getHeadCommitOid(sourceIssue.id);
  const sourceEntry = sourceIssue.backlogEntries.find((e) => e.id === entryId);
  if (!sourceEntry) return;

  const now = new Date().toISOString();
  const newEntry = {
    id: crypto.randomUUID(),
    name: sourceEntry.name,
    description: sourceEntry.description,
    createdAt: now,
    updatedAt: now,
    copiedFrom: { issueId: sourceIssue.id, entryId: sourceEntry.id, commit: sourceOid, at: now },
  };
  destIssue.backlogEntries.push(newEntry);
  destIssue.updatedAt = now;

  const filename = `${destIssue.id}.json`;
  await writeIssueFile(filename, destIssue);
  await commitIssue(filename, `copy(entry): from ${sourceIssue.id}@${sourceOid}`);

  return newEntry;
}

export function scheduleSave(issue) {
  const existingTimer = saveTimers.get(issue.id);
  if (existingTimer) clearTimeout(existingTimer);

  const timer = setTimeout(async () => {
    saveTimers.delete(issue.id);
    issue.updatedAt = new Date().toISOString();
    const filename = `${issue.id}.json`;
    try {
      await writeIssueFile(filename, issue);
      await commitIssue(filename, `update: ${issue.name}`);
    } catch (error) {
      console.error('Failed to save issue', issue.id, error);
    }
  }, SAVE_DEBOUNCE_MS);

  saveTimers.set(issue.id, timer);
}
