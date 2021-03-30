import sortBy from 'lodash/sortBy';
import AWS from 'aws-sdk';
import {
  AsyncSubject,
  from,
  merge,
  of,
  zip
} from 'rxjs';
import {
  buffer,
  filter,
  map,
  mergeMap,
  share,
  scan,
  takeLast,
  tap,
  toArray,
  withLatestFrom,
} from 'rxjs/operators';

import createMultipartUpload from '../internals/createMultipartUpload';
import uploadPart from '../internals/uploadPart';
import completeUpload from '../internals/completeUpload';

const s3Default = new AWS.S3();

const handleMultipartUpload = function handleMultipartUpload({
  source$,
  s3Bucket,
  s3Key,
  uploadId,
  bytesPerPart = 5000000, // must be at least 5MB
  s3 = s3Default,
  _uploadPart = uploadPart,
  _completeUpload = completeUpload,
}) {
  const sourceSub$ = source$.pipe(share());
  const bufferAtMaxSize$ = sourceSub$.pipe(
    scan(([bufferLength, shouldEmit], buffer) => [
      shouldEmit ? buffer.length : bufferLength + buffer.length,
      shouldEmit ? false : bufferLength + buffer.length > bytesPerPart
    ], [0, false]),
    filter(([,shouldEmit]) => shouldEmit)
  );
  const lastChunk$ = sourceSub$.pipe(takeLast(1));
  const closeBuffer$ = merge(bufferAtMaxSize$, lastChunk$);
  const parts$ = sourceSub$.pipe(
    buffer(closeBuffer$),
    map(buffers => Buffer.concat(buffers)),
    scan((memo, filePart) => [
      filePart,
      memo[1] + 1,
    ], [null, 0]),
    tap(data => console.log('partNumber', data[1])),
    mergeMap(([partBuffer, partNumber]) => zip(
      of(partNumber),
      _uploadPart({uploadId, partNumber, partBuffer, s3Bucket, s3Key, s3})
    )),
    tap(([partNumber, response]) => console.log('3:uploadPart', partNumber, response)),
    map(([partNumber, response]) => ({
      PartNumber: partNumber,
      ETag: response.ETag
    })),
    toArray(),
    map(parts => sortBy(parts, p => p.PartNumber))
  );
  const complete$ = parts$.pipe(
    mergeMap(parts => (
      _completeUpload({parts, uploadId, s3Bucket, s3Key, s3})
    ))
  );
  return complete$;
};

// This example is helpful: https://www.srijan.net/blog/aws-s3-audio-streaming
const upload = function upload({
  s3Key,
  s3Bucket,
  contentType,
  s3 = s3Default,
  _createMultipartUpload = createMultipartUpload,
  _handleMultipartUpload = handleMultipartUpload,
}) {
  // source$ should contain items which are one of these types:
  // Buffer, Typed Array, Blob, String, ReadableStream
  return source$ => {
    const uploadId$ = _createMultipartUpload({
      s3Key,
      s3Bucket,
      s3
    });
    const complete$ = uploadId$.pipe(
      mergeMap(uploadId => _handleMultipartUpload({
        uploadId,
        source$,
        s3Bucket,
        s3Key,
        s3,
      }))
    );
    return complete$;
  };
};

export default upload;
