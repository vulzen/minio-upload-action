const fs = require('fs');
const path = require('path');
const glob = require('@actions/glob');
const { literalPrefix, computeObjectKey } = require('./keys');

// Determine the base directory that a source's relative paths are computed
// against. For a directory source it is the directory itself; for a glob it is
// the literal prefix directory; for a single file it is the file's directory.
function resolveBase(source) {
  const prefix = literalPrefix(source);
  const abs = path.resolve(prefix || '.');
  try {
    if (fs.statSync(abs).isDirectory()) {
      return abs;
    }
  } catch {
    // The literal prefix isn't a real path on its own (pure glob); fall back.
  }
  return path.dirname(abs);
}

// Expand every source into a flat list of upload tasks { localPath, objectKey }.
// Globs and directories are both expanded to their descendant files (directory
// entries themselves are skipped). Throws if any source matches no files, so a
// bad input fails before anything is uploaded.
async function planUploads(sources, target, flatten, log) {
  const tasks = [];

  for (const source of sources) {
    log(`Processing source: ${source}`);

    const globber = await glob.create(source, { followSymbolicLinks: false });
    const matches = await globber.glob();
    const base = resolveBase(source);

    let fileCount = 0;
    for (const match of matches) {
      const stats = fs.statSync(match);
      if (!stats.isFile()) {
        continue;
      }
      tasks.push({
        localPath: match,
        objectKey: computeObjectKey(match, base, target, flatten),
        size: stats.size,
      });
      fileCount++;
    }

    if (fileCount === 0) {
      throw new Error(`Source path does not exist or no files match pattern: ${source}`);
    }
    log(`Found ${fileCount} file(s) for ${source}`);
  }

  return tasks;
}

module.exports = { resolveBase, planUploads };
