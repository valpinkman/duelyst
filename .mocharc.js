'use strict';

module.exports = {
  reporter: 'spec',
  // Lets require() resolve and compile .ts during the JS -> TypeScript
  // migration (node's CJS loader only knows .js/.json/.node).
  require: ['tsx/cjs'],
};
