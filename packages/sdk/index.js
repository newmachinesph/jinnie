// CommonJS entry used by the rspack configs at build time. The `react-native`
// export condition points application code at ./src/index.ts instead.
module.exports = {
  getSharedDependencies: require('./lib/sharedDeps'),
};
