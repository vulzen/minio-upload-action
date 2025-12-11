# MinIO Upload Action

A platform-agnostic GitHub Action for uploading artifacts to MinIO object storage.

## Features

- ✅ Platform agnostic (works on Linux, macOS, and Windows runners)
- ✅ Upload single files or entire directories
- ✅ Automatic bucket creation if it doesn't exist
- ✅ SSL/TLS support
- ✅ Custom target paths
- ✅ Returns uploaded path and ETag as outputs

## Usage

### Basic Example

```yaml
- name: Upload to MinIO
  uses: redfoxrr/minio-upload-action@v1
  with:
    endpoint: 'play.min.io:9000'
    access-key: ${{ secrets.MINIO_ACCESS_KEY }}
    secret-key: ${{ secrets.MINIO_SECRET_KEY }}
    bucket: 'my-bucket'
    source: './build/artifact.zip'
```

### Upload Directory

```yaml
- name: Upload build directory
  uses: redfoxrr/minio-upload-action@v1
  with:
    endpoint: 'minio.example.com'
    access-key: ${{ secrets.MINIO_ACCESS_KEY }}
    secret-key: ${{ secrets.MINIO_SECRET_KEY }}
    bucket: 'artifacts'
    source: './dist'
    target: 'releases/${{ github.sha }}'
    use-ssl: 'true'
```

### Full Example Workflow

```yaml
name: Build and Upload

on:
  push:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Build artifact
      run: |
        mkdir -p build
        echo "Built artifact" > build/artifact.txt
    
    - name: Upload to MinIO
      id: upload
      uses: redfoxrr/minio-upload-action@v1
      with:
        endpoint: ${{ secrets.MINIO_ENDPOINT }}
        access-key: ${{ secrets.MINIO_ACCESS_KEY }}
        secret-key: ${{ secrets.MINIO_SECRET_KEY }}
        bucket: 'ci-artifacts'
        source: './build'
        target: '${{ github.repository }}/${{ github.run_number }}'
    
    - name: Print upload result
      run: |
        echo "Uploaded to: ${{ steps.upload.outputs.uploaded-path }}"
        echo "ETag: ${{ steps.upload.outputs.etag }}"
```

## Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `endpoint` | MinIO endpoint URL (e.g., `play.min.io:9000`) | Yes | - |
| `access-key` | MinIO access key | Yes | - |
| `secret-key` | MinIO secret key | Yes | - |
| `bucket` | Target bucket name | Yes | - |
| `source` | Source file or directory path to upload | Yes | - |
| `target` | Target path in bucket (defaults to source filename) | No | `''` |
| `use-ssl` | Use SSL/TLS for connection | No | `true` |
| `region` | MinIO region | No | `us-east-1` |

## Outputs

| Output | Description |
|--------|-------------|
| `uploaded-path` | The full path where the file was uploaded (e.g., `bucket/path/to/file`) |
| `etag` | ETag of the uploaded object |

## Secrets Configuration

Store your MinIO credentials as GitHub secrets:

1. Go to your repository Settings → Secrets and variables → Actions
2. Add the following secrets:
   - `MINIO_ENDPOINT`: Your MinIO server endpoint
   - `MINIO_ACCESS_KEY`: Your MinIO access key
   - `MINIO_SECRET_KEY`: Your MinIO secret key

## Development

### Setup

```bash
npm install
```

### Build

```bash
npm run build
```

This compiles the action using `@vercel/ncc` and outputs to `dist/index.js`.

### Testing Locally

You can test the action locally by setting environment variables:

```bash
export INPUT_ENDPOINT="play.min.io:9000"
export INPUT_ACCESS_KEY="your-access-key"
export INPUT_SECRET_KEY="your-secret-key"
export INPUT_BUCKET="test-bucket"
export INPUT_SOURCE="./test-file.txt"
export INPUT_USE_SSL="true"

node src/index.js
```

## License

MIT
