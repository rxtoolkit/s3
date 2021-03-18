import AWS from 'aws-sdk';
import {BehaviorSubject,from,of,zip} from 'rxjs';
import {map,mergeMap,tap} from 'rxjs/operators';

const s3Client = new AWS.S3({region: process.env.AWS_REGION});

const downloadBytes = ({s3Bucket, s3Key, s3, byteLength}) => byteOffset => {
  const params = {
    Bucket: s3Bucket,
    Key: s3Key,
    Range: `bytes=${byteOffset}-${byteOffset + byteLength - 1}`,
  };
  const promise = s3.getObject(params).promise();
  const response$ = from(promise);
  return response$;
};

const pump = (subject$, byteLength) => ([byteOffset, s3Response]) => {
  const fileByteLengthMatch = s3Response.ContentRange.match(/\/\d*$/);
  const fileByteLengthStr = fileByteLengthMatch[0].replace('/', '');
  const fileByteLength = parseInt(fileByteLengthStr, 10);
  const newOffset = byteOffset + byteLength;
  if (newOffset - 1 >= fileByteLength) return subject$.complete();
  return subject$.next(newOffset);
};

const download = ({
  s3Bucket,
  s3Key,
  byteLength = 32000,
  s3 = s3Client,
  rawResponse = false,
} = {}) => {
  // Range: 'bytes0-100'
  const downloadFromOffset = downloadBytes({s3Bucket, s3Key, byteLength, s3});
  const byteOffset$ = new BehaviorSubject(0);
  const pumpNext = pump(byteOffset$, byteLength);
  const fileChunk$ = byteOffset$.pipe(
    mergeMap(byteOffset => zip(
      of(byteOffset),
      downloadFromOffset(byteOffset)
    )),
    tap(pumpNext),
    map(([, s3Response]) => (rawResponse ? s3Response : s3Response.Body)),
  );
  return fileChunk$;
};

export const testExports = {downloadBytes, pump};
export default download;
