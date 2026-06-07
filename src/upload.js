const fs = require('fs');
const mime = require('mime-types');

// Create the bucket if it does not already exist.
async function ensureBucket(minioClient, bucket, region, log) {
  const exists = await minioClient.bucketExists(bucket);
  if (!exists) {
    log(`Bucket ${bucket} does not exist, creating...`);
    await minioClient.makeBucket(bucket, region);
  }
}

// Upload a single planned task ({ localPath, objectKey, size }) to
// bucket/objectKey, inferring its Content-Type from the file extension. The
// size is taken from the plan phase to avoid re-statting the file.
// Returns { etag, path }.
async function uploadFile(minioClient, bucket, task, log) {
  const { localPath, objectKey, size } = task;
  const stream = fs.createReadStream(localPath);
  const contentType = mime.lookup(localPath) || 'application/octet-stream';

  log(`Uploading ${localPath} -> ${bucket}/${objectKey} (${size} bytes, ${contentType})`);

  const result = await minioClient.putObject(bucket, objectKey, stream, size, {
    'Content-Type': contentType,
  });

  return { etag: result.etag, path: `${bucket}/${objectKey}` };
}

module.exports = { ensureBucket, uploadFile };
