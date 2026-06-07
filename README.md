# MinIO Upload Action

A platform-agnostic GitHub Action for uploading artifacts to MinIO and other
S3-compatible object storage (Cloudflare R2, Backblaze B2, DigitalOcean Spaces,
Wasabi, AWS S3, ...).

## Features

- Platform agnostic (works on Linux, macOS, and Windows runners)
- Works with any S3-compatible backend, not just MinIO
- Upload single files or entire directories
- **Multiple sources support** — upload multiple files/directories in one action
- **Glob pattern support** — use wildcards like `*.jar` or `**/*.js`
- Automatic bucket creation if it doesn't exist
- Preserves directory structure by default (or flatten to basenames)
- Infers `Content-Type` from file extensions
- Fails fast on object-key collisions instead of silently overwriting
- SSL/TLS support
- Custom target paths
- Detailed outputs with all uploaded files, paths, and counts

## Usage

### Basic Example

```yaml
- name: Upload to MinIO
  uses: vulzen/minio-upload-action@v3
  with:
    endpoint: 'play.min.io:9000'
    access-key: ${{ secrets.MINIO_ACCESS_KEY }}
    secret-key: ${{ secrets.MINIO_SECRET_KEY }}
    bucket: 'my-bucket'
    source: './build/artifact.zip'
    use-ssl: 'true' # default
```

### Upload Multiple Sources

```yaml
- name: Upload multiple files
  uses: vulzen/minio-upload-action@v3
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
  uses: vulzen/minio-upload-action@v3
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
  uses: vulzen/minio-upload-action@v3
  with:
    endpoint: 'minio.example.com'
    access-key: ${{ secrets.MINIO_ACCESS_KEY }}
    secret-key: ${{ secrets.MINIO_SECRET_KEY }}
    bucket: 'artifacts'
    source: './dist'
    target: 'releases/${{ github.sha }}'
    use-ssl: 'true' # default
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
      uses: vulzen/minio-upload-action@v3
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

## Other S3-Compatible Providers

This action talks to the storage backend over the S3 API, so it also works with
other S3-compatible providers such as Cloudflare R2, Backblaze B2, DigitalOcean
Spaces, Wasabi, and AWS S3. Point `endpoint` at the provider's S3 endpoint, keep
`use-ssl: 'true'`, and supply the provider's S3 access key / secret key.

### Cloudflare R2

```yaml
- name: Upload to R2
  uses: vulzen/minio-upload-action@v3
  with:
    endpoint: '<ACCOUNT_ID>.r2.cloudflarestorage.com'
    access-key: ${{ secrets.R2_ACCESS_KEY_ID }}
    secret-key: ${{ secrets.R2_SECRET_ACCESS_KEY }}
    bucket: 'my-bucket'
    source: './dist'
    target: 'releases/${{ github.sha }}'
    use-ssl: 'true' # default
    region: 'auto' # R2's region; the default 'us-east-1' also works
```

Notes for R2:

- Use the R2 endpoint `<ACCOUNT_ID>.r2.cloudflarestorage.com` with no port (HTTPS on 443).
- Create R2 **API tokens** (Access Key ID + Secret Access Key) from the R2 dashboard — not your Cloudflare global API key.
- `region: 'auto'` is R2's canonical region. The default `us-east-1` also works because R2 is lenient about the signing region.
- The action auto-creates the bucket if it's missing. R2 supports this, but the API token needs admin/edit permission to create buckets — a read/write-only token will fail on creation. Pre-create the bucket in the R2 dashboard to avoid this.

> **Note:** `region: 'auto'` works for R2 but **not** for a stock MinIO server, which validates the signing region and expects `us-east-1` by default. The `us-east-1` default is the value that works across both MinIO and R2.

## Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `endpoint` | S3 endpoint URL (e.g., `play.min.io:9000`). Protocol is optional; port defaults to 443 with SSL, 9000 without. | Yes | - |
| `access-key` | Access key | Yes | - |
| `secret-key` | Secret key | Yes | - |
| `bucket` | Target bucket name | Yes | - |
| `source` | Source file(s) or directory path(s) to upload. Supports multiple sources using YAML multiline syntax (one path per line). Supports glob patterns. | Yes | - |
| `target` | Target path prefix in bucket where all sources will be uploaded | No | `''` |
| `use-ssl` | Use SSL/TLS for connection. Ignored when `endpoint` includes an `http://`/`https://` prefix (the prefix wins). | No | `true` |
| `flatten` | Upload every matched file to `target/<basename>` instead of preserving its directory structure relative to the source. | No | `false` |
| `region` | Region used for request signing. Keep `us-east-1` for MinIO; R2 also accepts `auto`. | No | `us-east-1` |

> **Object keys & collisions:** By default the directory structure of each source is preserved under `target` (e.g. `dist/sub/app.js` → `target/sub/app.js`). Set `flatten: 'true'` to drop the structure and key every file by its basename. In either mode, if two matched files would map to the same object key the action fails before uploading anything, rather than silently overwriting. `Content-Type` is inferred from each file's extension.

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
  uses: vulzen/minio-upload-action@v3
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
bun install
```

### Build

```bash
bun run build
```

This compiles the action using `@vercel/ncc` and outputs to `dist/index.js`.
The committed `dist/` bundle is what actually runs, so rebuild and commit it
whenever you change anything under `src/`. CI fails if `dist/` is out of date.

### Test

```bash
bun test
```

Unit tests (`bun test`) cover the pure logic in `src/keys.js` and `src/inputs.js`.

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
