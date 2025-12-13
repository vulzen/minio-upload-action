# MinIO Upload Action

A platform-agnostic GitHub Action for uploading artifacts to MinIO object storage.

## Features

- ✅ Platform agnostic (works on Linux, macOS, and Windows runners)
- ✅ Upload single files or entire directories
- ✅ **Multiple sources support** - upload multiple files/directories in one action
- ✅ **Glob pattern support** - use wildcards like `*.jar` or `**/*.js`
- ✅ Automatic bucket creation if it doesn't exist
- ✅ SSL/TLS support
- ✅ Custom target paths
- ✅ Detailed outputs with all uploaded files, paths, and counts

## Usage

### Basic Example

```yaml
- name: Upload to MinIO
  uses: redfoxrr/minio-upload-action@v2
  with:
    endpoint: 'play.min.io:9000'
    access-key: ${{ secrets.MINIO_ACCESS_KEY }}
    secret-key: ${{ secrets.MINIO_SECRET_KEY }}
    bucket: 'my-bucket'
    source: './build/artifact.zip'
```

### Upload Multiple Sources

```yaml
- name: Upload multiple files
  uses: redfoxrr/minio-upload-action@v2
  with:
    endpoint: 'play.min.io:9000'
    access-key: ${{ secrets.MINIO_ACCESS_KEY }}
    secret-key: ${{ secrets.MINIO_SECRET_KEY }}
    bucket: 'my-bucket'
    target: 'releases/v1.0'
    source: |
      dist/
      README.md
      LICENSE
```

### Upload with Glob Patterns

```yaml
- name: Upload JAR files
  uses: redfoxrr/minio-upload-action@v2
  with:
    endpoint: 'minio.example.com'
    access-key: ${{ secrets.MINIO_ACCESS_KEY }}
    secret-key: ${{ secrets.MINIO_SECRET_KEY }}
    bucket: 'artifacts'
    target: 'libs'
    source: |
      paper/libs/*.jar
      **/*.so
      dist/**/*.{js,map}
```

### Upload Directory

```yaml
- name: Upload build directory
  uses: redfoxrr/minio-upload-action@v2
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
      uses: redfoxrr/minio-upload-action@v2
      with:
        endpoint: ${{ secrets.MINIO_ENDPOINT }}
        access-key: ${{ secrets.MINIO_ACCESS_KEY }}
        secret-key: ${{ secrets.MINIO_SECRET_KEY }}
        bucket: 'ci-artifacts'
        source: './build'
        target: '${{ github.repository }}/${{ github.run_number }}'
    
    - name: Print upload result
      run: |
        echo "Uploaded ${{ steps.upload.outputs.uploaded-count }} file(s)"
        echo "Paths:"
        echo "${{ steps.upload.outputs.uploaded-paths }}"
```

## Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `endpoint` | MinIO endpoint URL (e.g., `play.min.io:9000`) | Yes | - |
| `access-key` | MinIO access key | Yes | - |
| `secret-key` | MinIO secret key | Yes | - |
| `bucket` | Target bucket name | Yes | - |
| `source` | Source file(s) or directory path(s) to upload. Supports multiple sources using YAML multiline syntax (one path per line). Supports glob patterns. | Yes | - |
| `target` | Target path prefix in bucket where all sources will be uploaded | No | `''` |
| `use-ssl` | Use SSL/TLS for connection | No | `true` |
| `region` | MinIO region | No | `us-east-1` |

## Outputs

| Output | Description |
|--------|-------------|
| `uploads` | JSON array of all uploaded files with their paths and ETags |
| `uploaded-count` | Total number of files uploaded |
| `uploaded-paths` | Newline-separated list of all uploaded file paths |

### Using Outputs

```yaml
- name: Upload files
  id: upload
  uses: redfoxrr/minio-upload-action@v2
  with:
    endpoint: ${{ secrets.MINIO_ENDPOINT }}
    access-key: ${{ secrets.MINIO_ACCESS_KEY }}
    secret-key: ${{ secrets.MINIO_SECRET_KEY }}
    bucket: 'my-bucket'
    source: |
      dist/
      README.md

- name: Use outputs
  run: |
    echo "Total files: ${{ steps.upload.outputs.uploaded-count }}"
    echo "All paths:"
    echo "${{ steps.upload.outputs.uploaded-paths }}"
    echo "Detailed info: ${{ steps.upload.outputs.uploads }}"
```

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
