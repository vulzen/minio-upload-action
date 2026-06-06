const path = require('path');

// Characters that make a path segment a glob pattern rather than a literal.
const MAGIC = /[*?[\]{}]/;

// Normalize a filesystem path into a valid S3/MinIO object key:
// backslashes -> forward slashes, collapse duplicate slashes, strip leading slash.
function toObjectKey(p) {
  return p
    .replace(/\\/g, '/')
    .replace(/\/+/g, '/')
    .replace(/^\//, '');
}

// Return the literal (non-magic) leading portion of a glob pattern.
// e.g. 'build/**/*.js' -> 'build', 'dist/' -> 'dist', 'foo/bar.txt' -> 'foo/bar.txt'.
function literalPrefix(pattern) {
  const segments = pattern.split('/');
  const literal = [];
  for (const segment of segments) {
    if (MAGIC.test(segment)) break;
    literal.push(segment);
  }
  return literal.join('/');
}

// Compute the object key for a matched (absolute) file.
//  - flatten=true  -> key is just the basename under the target prefix
//  - flatten=false -> key preserves the path relative to `base` under the target prefix
function computeObjectKey(absFile, base, target, flatten) {
  const rel = flatten ? path.basename(absFile) : path.relative(base, absFile);
  return toObjectKey(target ? `${target}/${rel}` : rel);
}

// Given a list of { localPath, objectKey }, find keys that more than one
// distinct local file maps to (i.e. an upload would silently overwrite another).
function findCollisions(tasks) {
  const byKey = new Map();
  for (const task of tasks) {
    if (!byKey.has(task.objectKey)) {
      byKey.set(task.objectKey, new Set());
    }
    byKey.get(task.objectKey).add(task.localPath);
  }

  const collisions = [];
  for (const [objectKey, sources] of byKey) {
    if (sources.size > 1) {
      collisions.push({ objectKey, sources: [...sources] });
    }
  }
  return collisions;
}

module.exports = { toObjectKey, literalPrefix, computeObjectKey, findCollisions };
