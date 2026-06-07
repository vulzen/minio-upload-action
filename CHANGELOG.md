# Changelog

## [3.0.0](https://github.com/vulzen/minio-upload-action/compare/v2.0.1...v3.0.0) (2026-06-07)


### ⚠ BREAKING CHANGES

* object keys now preserve directory structure relative to the source by default. Files matched by deep globs (e.g. **/*.js) that previously flattened to target/<basename> now upload to target/<relative-path>. Set `flatten: 'true'` to restore the old basename-only behavior.

### Features

* rework upload pipeline with structure-preserving keys ([aa7162c](https://github.com/vulzen/minio-upload-action/commit/aa7162c7f73ca58f52fe18dc28cbd5aa31afc850))


### Bug Fixes

* validate use-ssl and flatten inputs with getBooleanInput ([3db0ddf](https://github.com/vulzen/minio-upload-action/commit/3db0ddf62f456b9230385597a9cd76c111c92167))


### Performance Improvements

* upload files concurrently and reuse plan-phase stats ([7e984f4](https://github.com/vulzen/minio-upload-action/commit/7e984f4426fface997b0c3fd3a66e4926fd71a92))
