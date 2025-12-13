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
    const sourceInput = core.getInput('source', { required: true });
    const target = core.getInput('target') || '';
    
    // Parse multiple sources (newline-separated)
    const sources = sourceInput
      .split('\n')
      .map(s => s.trim())
      .filter(s => s.length > 0);
    
    if (sources.length === 0) {
      throw new Error('At least one source path must be provided');
    }
    
    core.info(`Found ${sources.length} source(s) to upload`);
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

    // Process all sources and collect results
    const allResults = [];
    
    for (const source of sources) {
      core.info(`Processing source: ${source}`);
      
      // Use glob to expand patterns
      const globber = await glob.create(source, {
        followSymbolicLinks: false
      });
      
      const matchedFiles = await globber.glob();
      
      if (matchedFiles.length === 0) {
        throw new Error(`Source path does not exist or no files match pattern: ${source}`);
      }
      
      core.info(`Found ${matchedFiles.length} file(s) matching pattern`);

      for (const matchedPath of matchedFiles) {
        const stats = fs.statSync(matchedPath);

        if (stats.isFile()) {
          // Upload single file
          const targetPath = target 
            ? `${target}/${path.basename(matchedPath)}`.replace(/\/+/g, '/')
            : path.basename(matchedPath);
          const result = await uploadFile(minioClient, bucket, matchedPath, targetPath);
          allResults.push(result);
          
          core.info(`✓ Successfully uploaded to ${result.path}`);
        } else if (stats.isDirectory()) {
          // Upload directory
          const results = await uploadDirectory(minioClient, bucket, matchedPath, target);
          allResults.push(...results);
          
          core.info(`✓ Successfully uploaded ${results.length} files from ${matchedPath}`);
        }
      }
    }

    // Set outputs
    core.setOutput('uploads', JSON.stringify(allResults));
    core.setOutput('uploaded-count', allResults.length);
    core.setOutput('uploaded-paths', allResults.map(r => r.path).join('\n'));
    
    core.info(`\n🎉 Total: ${allResults.length} file(s) uploaded successfully`);

  } catch (error) {
    core.setFailed(`Action failed: ${error.message}`);
  }
}

run();
