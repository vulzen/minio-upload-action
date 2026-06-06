const path = require('path');
const { toObjectKey, literalPrefix, computeObjectKey, findCollisions } = require('../src/keys');

describe('toObjectKey', () => {
  test('converts backslashes to forward slashes', () => {
    expect(toObjectKey('foo\\bar\\baz.txt')).toBe('foo/bar/baz.txt');
  });

  test('collapses duplicate slashes', () => {
    expect(toObjectKey('foo//bar///baz.txt')).toBe('foo/bar/baz.txt');
  });

  test('strips a leading slash', () => {
    expect(toObjectKey('/foo/bar.txt')).toBe('foo/bar.txt');
  });

  test('handles target with trailing slash plus windows relative path', () => {
    expect(toObjectKey('releases//sub\\file.txt')).toBe('releases/sub/file.txt');
  });
});

describe('literalPrefix', () => {
  test('returns the directory before a glob magic segment', () => {
    expect(literalPrefix('build/**/*.js')).toBe('build');
    expect(literalPrefix('dist/*.jar')).toBe('dist');
  });

  test('returns the whole path when there is no magic', () => {
    expect(literalPrefix('foo/bar.txt')).toBe('foo/bar.txt');
    expect(literalPrefix('mydir')).toBe('mydir');
  });

  test('returns empty string for a leading-magic pattern', () => {
    expect(literalPrefix('**/*.so')).toBe('');
  });
});

describe('computeObjectKey', () => {
  const base = path.resolve('/repo/dist');

  test('flatten=true uses basename under target', () => {
    const file = path.join(base, 'sub', 'app.js');
    expect(computeObjectKey(file, base, 'releases', true)).toBe('releases/app.js');
  });

  test('flatten=false preserves structure relative to base', () => {
    const file = path.join(base, 'sub', 'app.js');
    expect(computeObjectKey(file, base, 'releases', false)).toBe('releases/sub/app.js');
  });

  test('no target prefix', () => {
    const file = path.join(base, 'sub', 'app.js');
    expect(computeObjectKey(file, base, '', false)).toBe('sub/app.js');
  });
});

describe('findCollisions', () => {
  test('reports keys mapped to more than one distinct file', () => {
    const tasks = [
      { localPath: '/a/index.js', objectKey: 'dist/index.js' },
      { localPath: '/b/index.js', objectKey: 'dist/index.js' },
      { localPath: '/a/main.js', objectKey: 'dist/main.js' },
    ];
    const collisions = findCollisions(tasks);
    expect(collisions).toHaveLength(1);
    expect(collisions[0].objectKey).toBe('dist/index.js');
    expect(collisions[0].sources.sort()).toEqual(['/a/index.js', '/b/index.js']);
  });

  test('no collisions for unique keys', () => {
    const tasks = [
      { localPath: '/a/index.js', objectKey: 'dist/index.js' },
      { localPath: '/a/main.js', objectKey: 'dist/main.js' },
    ];
    expect(findCollisions(tasks)).toHaveLength(0);
  });

  test('same file mapped twice is not a collision', () => {
    const tasks = [
      { localPath: '/a/index.js', objectKey: 'dist/index.js' },
      { localPath: '/a/index.js', objectKey: 'dist/index.js' },
    ];
    expect(findCollisions(tasks)).toHaveLength(0);
  });
});
