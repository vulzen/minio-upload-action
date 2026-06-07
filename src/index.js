const core = require('@actions/core');
const Minio = require('minio');
const { parseEndpoint, parseSources } = require('./inputs');
const { planUploads } = require('./plan');
const { findCollisions } = require('./keys');
const { ensureBucket, uploadFile } = require('./upload');

// Number of files to upload concurrently.
const CONCURRENCY = 5;

// Upload every task with bounded concurrency, pushing each success onto
// `results` as it completes so the caller can report partial progress if a
// later upload fails.
async function uploadAll(minioClient, bucket, tasks, results) {
  let next = 0;
  async function worker() {
    while (next < tasks.length) {
      const task = tasks[next++];
      const result = await uploadFile(minioClient, bucket, task, core.info);
      results.push(result);
      core.info(`✓ Successfully uploaded to ${result.path}`);
    }
  }
  const workers = Array.from({ length: Math.min(CONCURRENCY, tasks.length) }, worker);
  await Promise.all(workers);
}

async function run() {
  // Populated as uploads succeed; reported even on partial failure (see finally).
  const allResults = [];
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
    // getBooleanInput accepts the full YAML 1.2 boolean set and rejects garbage.
    const useSSLInput = core.getBooleanInput('use-ssl');
    const flatten = core.getBooleanInput('flatten');

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
    // key collision fails before anything is uploaded. The upload phase itself
    // is not transactional: if a file fails mid-run, files already uploaded
    // stay in the bucket and are reported via the outputs below.
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

    await uploadAll(minioClient, bucket, tasks, allResults);

    core.info(`\n🎉 Total: ${allResults.length} file(s) uploaded successfully`);
  } catch (error) {
    core.setFailed(`Action failed: ${error.message}`);
  } finally {
    // Report whatever was uploaded, even on partial failure.
    core.setOutput('uploads', JSON.stringify(allResults));
    core.setOutput('uploaded-count', allResults.length);
    core.setOutput('uploaded-paths', allResults.map((r) => r.path).join('\n'));
  }
}

run();
