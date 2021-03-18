import {expect} from 'chai';
// import sinon from 'sinon';
// import {marbles} from 'rxjs-marbles/mocha';

import {fromS3File, toS3File} from './index';

describe('index', () => {
  it('should export an toS3File function', () => {
    expect(toS3File).to.be.a('function');
  });
  it('should export a fromS3File function', () => {
    expect(fromS3File).to.be.a('function');
  });
});
