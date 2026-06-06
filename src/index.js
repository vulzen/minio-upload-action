const core = require('@actions/core');
const Minio = require('minio');
const { parseEndpoint, parseSources } = require('./inputs');
const { planUploads } = require('./plan');
const { findCollisions } = require('./keys');
const { ensureBucket, uploadFile } = require('./upload');

async function run() {
  try {
    // Get inputs
    const endpoint = core.getInput('endpoint', { required: true });
    const accessKey = core.getInput('access-key', { required: true });
    const secretKey = core.getInput('secret-key', { required: true });
    const bucket = core.getInput('bucket', { required: true });
    const sourceInput = core.getInput('source', { required: true });
    const target = core.getInput('target') || '';
    const region = core.getInput('region') || 'us-east-1';
    // use-ssl defaults to true; flatten defaults to false (preserve structure).
    const useSSLInput = core.getInput('use-ssl') !== 'false';
    const flatten = core.getInput('flatten') === 'true';

    const sources = parseSources(sourceInput);
    if (sources.length === 0) {
      throw new Error('At least one source path must be provided');
    }
    core.info(`Found ${sources.length} source(s) to upload`);

    const { host, port, useSSL } = parseEndpoint(endpoint, useSSLInput);
    core.info(`Connecting to MinIO at ${host}:${port} (SSL: ${useSSL})`);

    // Initialize MinIO client
    const minioClient = new Minio.Client({
      endPoint: host,
      port,
      useSSL,
      accessKey,
      secretKey,
      region,
    });

    // Plan all uploads before touching the bucket, so a missing source or a
    // key collision fails fast without leaving a half-written bucket behind.
    const tasks = await planUploads(sources, target, flatten, core.info);

    const collisions = findCollisions(tasks);
    if (collisions.length > 0) {
      const detail = collisions
        .map((c) => `  ${c.objectKey} <- ${c.sources.join(', ')}`)
        .join('\n');
      throw new Error(
        'Multiple files map to the same object key and would overwrite each other. ' +
          'Set "flatten: false" to preserve directory structure, or adjust the sources.\n' +
          detail
      );
    }

    // Check if bucket exists, create if not
    await ensureBucket(minioClient, bucket, region, core.info);

    const allResults = [];
    for (const task of tasks) {
      const result = await uploadFile(minioClient, bucket, task.localPath, task.objectKey, core.info);
      allResults.push(result);
      core.info(`✓ Successfully uploaded to ${result.path}`);
    }

    // Set outputs
    core.setOutput('uploads', JSON.stringify(allResults));
    core.setOutput('uploaded-count', allResults.length);
    core.setOutput('uploaded-paths', allResults.map((r) => r.path).join('\n'));

    core.info(`\n🎉 Total: ${allResults.length} file(s) uploaded successfully`);
  } catch (error) {
    core.setFailed(`Action failed: ${error.message}`);
  }
}

run();
