const { parseEndpoint, parseSources } = require('../src/inputs');

describe('parseEndpoint', () => {
  test('host:port without protocol', () => {
    expect(parseEndpoint('play.min.io:9000', true)).toEqual({
      host: 'play.min.io',
      port: 9000,
      useSSL: true,
    });
  });

  test('https:// prefix forces SSL and defaults port to 443', () => {
    expect(parseEndpoint('https://minio.example.com', false)).toEqual({
      host: 'minio.example.com',
      port: 443,
      useSSL: true,
    });
  });

  test('http:// prefix disables SSL and defaults port to 9000', () => {
    expect(parseEndpoint('http://localhost', true)).toEqual({
      host: 'localhost',
      port: 9000,
      useSSL: false,
    });
  });

  test('explicit port wins over default', () => {
    expect(parseEndpoint('http://localhost:9001', true)).toEqual({
      host: 'localhost',
      port: 9001,
      useSSL: false,
    });
  });

  test('no port defaults by useSSL', () => {
    expect(parseEndpoint('minio.example.com', true).port).toBe(443);
    expect(parseEndpoint('minio.example.com', false).port).toBe(9000);
  });

  test('strips trailing path', () => {
    expect(parseEndpoint('https://minio.example.com:443/some/path', false)).toEqual({
      host: 'minio.example.com',
      port: 443,
      useSSL: true,
    });
  });

  test('bracketed IPv6 with port', () => {
    expect(parseEndpoint('[::1]:9000', false)).toEqual({
      host: '::1',
      port: 9000,
      useSSL: false,
    });
  });

  test('bare IPv6 (multiple colons) is left as host with default port', () => {
    const result = parseEndpoint('fe80::1', false);
    expect(result.host).toBe('fe80::1');
    expect(result.port).toBe(9000);
  });
});

describe('parseSources', () => {
  test('splits, trims, and drops empty lines', () => {
    const input = 'dist/\n  README.md  \n\n  \nLICENSE\n';
    expect(parseSources(input)).toEqual(['dist/', 'README.md', 'LICENSE']);
  });

  test('single source', () => {
    expect(parseSources('./build/artifact.zip')).toEqual(['./build/artifact.zip']);
  });

  test('empty input yields empty list', () => {
    expect(parseSources('   \n  \n')).toEqual([]);
  });
});
