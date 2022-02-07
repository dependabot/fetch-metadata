import * as updateMetadata from './update_metadata'

test('it returns an empty array for a blank string', async () => {
  expect(updateMetadata.parse('', 'dependabot/nuget/feature1', 'main')).toEqual([])
})

test('it returns an empty array for commit message with no dependabot yaml fragment', async () => {
  const commitMessage = `Bumps [coffee-rails](https://github.com/rails/coffee-rails) from 4.0.1 to 4.2.2.
  - [Release notes](https://github.com/rails/coffee-rails/releases)
  - [Changelog](https://github.com/rails/coffee-rails/blob/master/CHANGELOG.md)
  - [Commits](rails/coffee-rails@v4.0.1...v4.2.2)

  Signed-off-by: dependabot[bot] <support@github.com>`

  expect(updateMetadata.parse(commitMessage, 'dependabot/nuget/feature1', 'main')).toEqual([])
})

test('it returns the updated dependency information when there is a yaml fragment', async () => {
  const commitMessage =
    'Bumps [coffee-rails](https://github.com/rails/coffee-rails) from 4.0.1 to 4.2.2.\n' +
    '- [Release notes](https://github.com/rails/coffee-rails/releases)\n' +
    '- [Changelog](https://github.com/rails/coffee-rails/blob/master/CHANGELOG.md)\n' +
    '- [Commits](rails/coffee-rails@v4.0.1...v4.2.2)\n' +
    '\n' +
    '---\n' +
    'updated-dependencies:\n' +
    '- dependency-name: coffee-rails\n' +
    '  dependency-type: direct:production\n' +
    '  update-type: version-update:semver-minor\n' +
    '...\n' +
    '\n' +
    'Signed-off-by: dependabot[bot] <support@github.com>'

  const updatedDependencies = updateMetadata.parse(commitMessage, 'dependabot/nuget/feature1', 'main')

  expect(updatedDependencies).toHaveLength(1)

  expect(updatedDependencies[0].dependencyName).toEqual('coffee-rails')
  expect(updatedDependencies[0].dependencyType).toEqual('direct:production')
  expect(updatedDependencies[0].updateType).toEqual('version-update:semver-minor')
  expect(updatedDependencies[0].directory).toEqual('/')
  expect(updatedDependencies[0].packageEcosystem).toEqual('nuget')
  expect(updatedDependencies[0].targetBranch).toEqual('main')
})

test('it supports multiple dependencies within a single fragment', async () => {
  const commitMessage =
    'Bumps [coffee-rails](https://github.com/rails/coffee-rails) from 4.0.1 to 4.2.2.\n' +
    '- [Release notes](https://github.com/rails/coffee-rails/releases)\n' +
    '- [Changelog](https://github.com/rails/coffee-rails/blob/master/CHANGELOG.md)\n' +
    '- [Commits](rails/coffee-rails@v4.0.1...v4.2.2)\n' +
    '\n' +
    '---\n' +
    'updated-dependencies:\n' +
    '- dependency-name: coffee-rails\n' +
    '  dependency-type: direct:production\n' +
    '  update-type: version-update:semver-minor\n' +
    '- dependency-name: coffeescript\n' +
    '  dependency-type: indirect\n' +
    '  update-type: version-update:semver-patch\n' +
    '...\n' +
    '\n' +
    'Signed-off-by: dependabot[bot] <support@github.com>'

  const updatedDependencies = updateMetadata.parse(commitMessage, 'dependabot/nuget/api/main/feature1', 'main')

  expect(updatedDependencies).toHaveLength(2)

  expect(updatedDependencies[0].dependencyName).toEqual('coffee-rails')
  expect(updatedDependencies[0].dependencyType).toEqual('direct:production')
  expect(updatedDependencies[0].updateType).toEqual('version-update:semver-minor')
  expect(updatedDependencies[0].directory).toEqual('api/main')
  expect(updatedDependencies[0].packageEcosystem).toEqual('nuget')
  expect(updatedDependencies[0].targetBranch).toEqual('main')

  expect(updatedDependencies[1].dependencyName).toEqual('coffeescript')
  expect(updatedDependencies[1].dependencyType).toEqual('indirect')
  expect(updatedDependencies[1].updateType).toEqual('version-update:semver-patch')
  expect(updatedDependencies[1].directory).toEqual('api/main')
  expect(updatedDependencies[1].packageEcosystem).toEqual('nuget')
  expect(updatedDependencies[1].targetBranch).toEqual('main')
})

test('it only returns information within the first fragment if there are multiple yaml documents', async () => {
  const commitMessage =
    'Bumps [coffee-rails](https://github.com/rails/coffee-rails) from 4.0.1 to 4.2.2.\n' +
    '- [Release notes](https://github.com/rails/coffee-rails/releases)\n' +
    '- [Changelog](https://github.com/rails/coffee-rails/blob/master/CHANGELOG.md)\n' +
    '- [Commits](rails/coffee-rails@v4.0.1...v4.2.2)\n' +
    '\n' +
    '---\n' +
    'updated-dependencies:\n' +
    '- dependency-name: coffee-rails\n' +
    '  dependency-type: direct:production\n' +
    '  update-type: version-update:semver-minor\n' +
    '...\n' +
    '\n' +
    '---\n' +
    'updated-dependencies:\n' +
    '- dependency-name: coffeescript\n' +
    '  dependency-type: indirect\n' +
    '  update-type: version-update:semver-patch\n' +
    '...\n' +
    '\n' +
    'Signed-off-by: dependabot[bot] <support@github.com>'

  const updatedDependencies = updateMetadata.parse(commitMessage, 'dependabot|nuget|api|feature1', 'main')

  expect(updatedDependencies).toHaveLength(1)

  expect(updatedDependencies[0].dependencyName).toEqual('coffee-rails')
  expect(updatedDependencies[0].dependencyType).toEqual('direct:production')
  expect(updatedDependencies[0].updateType).toEqual('version-update:semver-minor')
  expect(updatedDependencies[0].directory).toEqual('api')
  expect(updatedDependencies[0].packageEcosystem).toEqual('nuget')
  expect(updatedDependencies[0].targetBranch).toEqual('main')
})
