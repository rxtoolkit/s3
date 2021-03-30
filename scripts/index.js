const get = require('lodash/get');
const {Command} = require('commander');
const {fromFile} = require('@buccaneerai/rxjs-fs');

const {toS3File,fromS3File} = require('../dist/index.js');

const program = new Command();

const runPipeline = func => (...params) => {
  return func(...params).subscribe(
    console.log,
    console.error,
    () => console.log('DONE')
  );
};

const upload = (inputFilePath, s3Bucket, s3Key, opts = {}) => {
  const chunk$ = fromFile({filePath: inputFilePath});
  const upload$ = chunk$.pipe(
    toS3File({s3Bucket, s3Key, contentType: get(opts, 'contentType', null)})
  );
  return upload$;
};

const download = (s3Bucket, s3Key) => {
  return fromS3File({s3Bucket, s3Key});
};

// node ./bin/code-generators/generateScaffold --help
program
  .command('upload <inputFilePath> <s3Bucket> <s3Key>')
  .description('Runs the notestream STT pipeline on an S3 file')
  .option('-d, --debug', 'output extra debugging')
  .option('-c, --content-type <contentType>', 'mime type of the file')
  .action((...params) => runPipeline(upload)(...params));

program
  .command('download <s3Bucket> <s3Key>')
  .action((...params) => runPipeline(download)(...params));
  // .option('--plural-form <pluralForm>', 'the plural form of the resource name (defaults to adding an "s")')
  // .option('--dry-run', 'write output to console instead of files')
  // .option('-w --without', 'model, create, remove, delete, update')
  // .option('-f --force', 'overwrite existing files')
  // .action((resourceName, fields, options) => (
    // generateScaffold({name: resourceName, fields, ...options}))
  // );

program.parse(process.argv);
