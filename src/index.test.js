import {expect} from 'chai';
// import sinon from 'sinon';
// import {marbles} from 'rxjs-marbles/mocha';

import {myFunc} from './index';

describe('index', () => {
  it('should export a function', () => {
    expect(myFunc).to.be.a('function');
  });
});
