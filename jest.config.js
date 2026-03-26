module.exports = {
  preset: 'ts-jest',
  transform: {
    '^.+\\.(ts|tsx)?$': 'ts-jest',
    '^.+\\.js$': 'ts-jest'
  },
  transformIgnorePatterns: [
    '/node_modules/(?!(@actions|@octokit|universal-user-agent|before-after-hook)/)',
  ],
  resolver: './jest-resolver.js',
  reporters: [['github-actions', {silent: false}], 'summary']
}
