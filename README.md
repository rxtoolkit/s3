# @buccaneerai/rxjs-s3
> 🪣 RXJS operators for working with AWS S3

## Installation
This is a private package. It requires setting up access in your npm config.

```bash
yarn add @buccaneerai/rxjs-s3
```

## API

### `fromS3File`
Downloads a file to AWS S3 (as a stream).
```js
import AWS from 'aws-sdk';
import {concat} from 'rxjs';
import {fromS3file} from '@buccaneerai/rxjs-s3';

// Download AWS S3 file as a stream of file chunks (Buffers)
const downloadParams = {
  s3Bucket: 'my-fabulous-bucket',
  s3Key: 'path/to/file/hello-world.json',
  byteLength: 32000, // (Optional) Size of the download chunks. Defaults to 32000.
  s3Client: new AWS.S3(), // (Optional) The s3 client to use
  rawResponse: false, // (Optional) - expose raw S3 JSON responses. Defaults to false.
};
const bufferChunk$ = fromS3File(downloadParams);
bufferchunk$.subscribe(console.log);
```

### `toS3File`
Uploads a file to AWS S3 (as a stream).
```js
import {concat} from 'rxjs';
import {toS3File} from '@buccaneerai/rxjs-s3';

// create a stream of file chunks
const chunk0 = Buffer.from('{"hello":');
const chunk1 = Buffer.from('"world"}');
const chunk$ = concat(chunk0, chunk1);

// upload the chunks to an AWS S3 file
const uploadParams = {
  s3Bucket: 'my-fabulous-bucket',
  s3Key: 'path/to/file/hello-world.json',
  contentType: 'application/json',
};
const upload$ = chunk$.pipe(toS3File(uploadParams));
upload$.subscribe(console.log);
```