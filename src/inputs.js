// Parse a MinIO/S3 endpoint string into { host, port, useSSL }.
//
// Accepts an optional http(s):// prefix (which, when present, determines
// useSSL), an optional :port, IPv6 in [brackets], and ignores any trailing
// path/query/fragment. When no port is given it defaults to 443 (SSL) or 9000.
function parseEndpoint(endpoint, useSSLDefault) {
  let useSSL = useSSLDefault;
  let rest = String(endpoint).trim();

  const proto = rest.match(/^(https?):\/\//i);
  if (proto) {
    useSSL = proto[1].toLowerCase() === 'https';
    rest = rest.slice(proto[0].length);
  }

  // Drop anything after the authority (path, query, fragment).
  rest = rest.replace(/[/?#].*$/, '');

  let host = rest;
  let port;

  const bracketed = rest.match(/^\[([^\]]+)\](?::(\d+))?$/);
  if (bracketed) {
    // IPv6 literal, optionally with a port.
    host = bracketed[1];
    if (bracketed[2]) port = parseInt(bracketed[2], 10);
  } else if (rest.indexOf(':') !== -1 && rest.indexOf(':') === rest.lastIndexOf(':')) {
    // Exactly one colon -> host:port. (Bare IPv6 with multiple colons is left
    // intact as the host and uses the default port.)
    const idx = rest.lastIndexOf(':');
    host = rest.slice(0, idx);
    const portStr = rest.slice(idx + 1);
    if (portStr) port = parseInt(portStr, 10);
  }

  if (port === undefined || Number.isNaN(port)) {
    port = useSSL ? 443 : 9000;
  }

  return { host, port, useSSL };
}

// Split the multiline `source` input into a trimmed, non-empty list of paths.
function parseSources(sourceInput) {
  return String(sourceInput)
    .split('\n')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

module.exports = { parseEndpoint, parseSources };
