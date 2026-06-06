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

// Upload a single local file to bucket/objectKey, inferring its Content-Type
// from the file extension. Returns { etag, path }.
async function uploadFile(minioClient, bucket, localPath, objectKey, log) {
  const stats = fs.statSync(localPath);
  const stream = fs.createReadStream(localPath);
  const contentType = mime.lookup(localPath) || 'application/octet-stream';

  log(`Uploading ${localPath} -> ${bucket}/${objectKey} (${stats.size} bytes, ${contentType})`);

  const result = await minioClient.putObject(bucket, objectKey, stream, stats.size, {
    'Content-Type': contentType,
  });

  return { etag: result.etag, path: `${bucket}/${objectKey}` };
}

module.exports = { ensureBucket, uploadFile };
