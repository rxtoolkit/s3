import {expect} from 'chai';
import sinon from 'sinon';
import {marbles} from 'rxjs-marbles/mocha';

import downloadS3File, {testExports} from './download';
const {downloadBytes, pump} = testExports;

const fakeS3Res = {
  Body: Buffer.from('abcd'),
  ContentRange: 'bytes=0-31999/63999'
};

const fakeS3Res2 = {
  Body: Buffer.from('xyz'),
  ContentRange: 'bytes=32000-63999/63999',
};

const s3Client = () => {
  const s3Stub = sinon.stub();
  s3Stub.onCall(0).returns({
    promise: () => new Promise(resolve => resolve(fakeS3Res)),
  });
  s3Stub.onCall(1).returns({
    promise: () => new Promise(resolve => resolve(fakeS3Res2)),
  });
  return { getObject: s3Stub };
};

describe('downloadS3File', () => {
  it('should call S3 client with correct parameters',() => {
    const config = {
      s3: s3Client(),
      s3Bucket: 'fakebucket',
      s3Key: 'fakekey.png',
      byteLength: 32000,
    };
    const downloadFromOffset = downloadBytes(config);
    expect(downloadFromOffset).to.be.a('function');
    const actual$ = downloadFromOffset(0);
    actual$.subscribe();
    expect(config.s3.getObject.calledOnce).to.be.true;
    expect(config.s3.getObject.getCall(0).args[0]).to.deep.equal({
      Key: config.s3Key,
      Bucket: config.s3Bucket,
      Range: 'bytes=0-31999',
    });
  });

  it('should pump next chunk when a chunk is received', () => {
    const subject$ = {
      next: sinon.spy(),
      complete: sinon.spy(),
    };
    const byteLength = 32000;
    const pumpInstance = pump(subject$, byteLength);
    expect(pumpInstance).to.be.a('function');
    pumpInstance([32000, {ContentRange: 'bytes=32000-63999/100000'}]);
    expect(subject$.complete.called).to.be.false;
    expect(subject$.next.calledOnce).to.be.true;
    expect(subject$.next.getCall(0).args[0]).to.equal(64000);
  });

  it('should stop pumping chunks when the end of the file is reached', () => {
    const subject$ = {
      next: sinon.spy(),
      complete: sinon.spy(),
    };
    const byteLength = 32000;
    const pumpInstance = pump(subject$, byteLength);
    expect(pumpInstance).to.be.a('function');
    pumpInstance([32000, {ContentRange: 'bytes=32000-63999/63999'}]);
    expect(subject$.next.calledOnce).to.be.false;
    expect(subject$.complete.calledOnce).to.be.true;
  });

  it('should call workflow correctly', done => {
    const onData = sinon.spy();
    const onError = sinon.spy();
    const params = {
      s3Bucket: 'fakebucket',
      s3Key: 'fakes3Key.json',
      byteLength: 32000,
      s3: s3Client(),
    };
    // const actual$ = downloadS3File(params);
    // const expected$ = m.cold('------0-(1|)', [fakeS3Res.Body, fakeS3Res2.Body]);
    // m.expect(actual$).toBeObservable(expected$);
    downloadS3File(params).subscribe(onData, onError, () => {
      expect(onError.called).to.be.false;
      expect(onData.callCount).to.equal(2);
      expect(onData.getCall(0).args[0]).to.equal(fakeS3Res.Body);
      expect(onData.getCall(1).args[0]).to.equal(fakeS3Res2.Body);
      done();
    });
  });
});
