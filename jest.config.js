module.exports = {
  preset: 'ts-jest',
  transform: {
    '^.+\\.(ts|tsx)?$': 'ts-jest'
  }, 
  reporters: [['github-actions', {silent: false}], 'summary']
}
