module.exports = function(wallaby) {
  return {
    files: ['src/**/*.js'],

    tests: ['__tests__/**/*.test.js'],

    compilers: {
      '**/*.js': wallaby.compilers.babel(),
    },
  }
}
