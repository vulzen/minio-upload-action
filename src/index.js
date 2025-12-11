const core = require('@actions/core');
const glob = require('@actions/glob');
const Minio = require('minio');
const fs = require('fs');
const path = require('path');

async function uploadFile(minioClient, bucket, filePath, targetPath) {
  const fileStream = fs.createReadStream(filePath);
  const stats = fs.statSync(filePath);
  
  core.info(`Uploading ${filePath} to ${bucket}/${targetPath} (${stats.size} bytes)`);
  
  const result = await minioClient.putObject(bucket, targetPath, fileStream, stats.size);
  
  return {
    etag: result.etag,
    path: `${bucket}/${targetPath}`
  };
}

async function uploadDirectory(minioClient, bucket, dirPath, targetPrefix) {
  const globber = await glob.create(`${dirPath}/**/*`, {
    followSymbolicLinks: false
  });
  
  const files = await globber.glob();
  const uploadedFiles = [];
  
  for (const file of files) {
    const stats = fs.statSync(file);
    if (stats.isFile()) {
      const relativePath = path.relative(dirPath, file);
      const targetPath = targetPrefix 
        ? `${targetPrefix}/${relativePath}`.replace(/\\/g, '/')
        : relativePath.replace(/\\/g, '/');
      
      const result = await uploadFile(minioClient, bucket, file, targetPath);
      uploadedFiles.push(result);
    }
  }
  
  return uploadedFiles;
}

async function run() {
  try {
    // Get inputs
    const endpoint = core.getInput('endpoint', { required: true });
    const accessKey = core.getInput('access-key', { required: true });
    const secretKey = core.getInput('secret-key', { required: true });
    const bucket = core.getInput('bucket', { required: true });
    const source = core.getInput('source', { required: true });
    const target = core.getInput('target') || '';
    const useSSL = core.getInput('use-ssl') === 'true';
    const region = core.getInput('region') || 'us-east-1';

    // Parse endpoint (remove protocol if included)
    const endpointClean = endpoint.replace(/^https?:\/\//, '');
    const [endpointHost, endpointPort] = endpointClean.split(':');
    
    core.info(`Connecting to MinIO at ${endpointHost}${endpointPort ? ':' + endpointPort : ''}`);
    
    // Initialize MinIO client
    const minioClient = new Minio.Client({
      endPoint: endpointHost,
      port: endpointPort ? parseInt(endpointPort) : (useSSL ? 443 : 9000),
      useSSL: useSSL,
      accessKey: accessKey,
      secretKey: secretKey,
      region: region
    });

    // Check if bucket exists, create if not
    const bucketExists = await minioClient.bucketExists(bucket);
    if (!bucketExists) {
      core.info(`Bucket ${bucket} does not exist, creating...`);
      await minioClient.makeBucket(bucket, region);
    }

    // Check if source exists
    if (!fs.existsSync(source)) {
      throw new Error(`Source path does not exist: ${source}`);
    }

    const stats = fs.statSync(source);
    let uploadedPath = '';
    let etag = '';

    if (stats.isFile()) {
      // Upload single file
      const targetPath = target || path.basename(source);
      const result = await uploadFile(minioClient, bucket, source, targetPath);
      uploadedPath = result.path;
      etag = result.etag;
      
      core.info(`✓ Successfully uploaded to ${uploadedPath}`);
    } else if (stats.isDirectory()) {
      // Upload directory
      const targetPrefix = target || path.basename(source);
      const results = await uploadDirectory(minioClient, bucket, source, targetPrefix);
      
      uploadedPath = `${bucket}/${targetPrefix}`;
      etag = results.length > 0 ? results[0].etag : '';
      
      core.info(`✓ Successfully uploaded ${results.length} files to ${uploadedPath}`);
    } else {
      throw new Error(`Source is neither a file nor a directory: ${source}`);
    }

    // Set outputs
    core.setOutput('uploaded-path', uploadedPath);
    core.setOutput('etag', etag);

  } catch (error) {
    core.setFailed(`Action failed: ${error.message}`);
  }
}

run();
