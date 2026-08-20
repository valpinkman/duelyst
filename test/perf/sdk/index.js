const normalizedPath = require('path').join(__dirname, './');
const files = require('fs').readdirSync(normalizedPath);
const PromiseUtils = require('../../../app/common/utils/utils_promise');

PromiseUtils.map(files, (file) => {
  /* eslint-disable import/no-dynamic-require */
  const benchmarkPromise = require(`./${file}`);
  if (benchmarkPromise instanceof Promise) {
    benchmarkPromise.catch((errorMessage) => {
      console.log(errorMessage);
    });
  }
  return benchmarkPromise;
}, { concurrency: 1 });
