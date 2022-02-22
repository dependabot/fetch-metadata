import * as updateMetadata from './update_metadata'

test('it returns an empty array for a blank string', async () => {
  const getAlert = async () => Promise.resolve({ alertState: 'DISMISSED', ghsaId: 'GHSA-III-BBB', cvss: 4.6 })
  expect(updateMetadata.parse('', 'dependabot/nuget/coffee-rails', 'main', getAlert)).resolves.toEqual([])
})

test('it returns an empty array for commit message with no dependabot yaml fragment', async () => {
  const commitMessage = `Bumps [coffee-rails](https://github.com/rails/coffee-rails) from 4.0.1 to 4.2.2.
  - [Release notes](https://github.com/rails/coffee-rails/releases)
  - [Changelog](https://github.com/rails/coffee-rails/blob/master/CHANGELOG.md)
  - [Commits](rails/coffee-rails@v4.0.1...v4.2.2)

  Signed-off-by: dependabot[bot] <support@github.com>`

  const getAlert = async () => Promise.resolve({ alertState: 'DISMISSED', ghsaId: 'GHSA-III-BBB', cvss: 4.6 })
  expect(updateMetadata.parse(commitMessage, 'dependabot/nuget/coffee-rails', 'main', getAlert)).resolves.toEqual([])
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

  const getAlert = async () => Promise.resolve({ alertState: 'DISMISSED', ghsaId: 'GHSA-III-BBB', cvss: 4.6 })
  const updatedDependencies = await updateMetadata.parse(commitMessage, 'dependabot/nuget/coffee-rails', 'main', getAlert)

  expect(updatedDependencies).toHaveLength(1)

  expect(updatedDependencies[0].dependencyName).toEqual('coffee-rails')
  expect(updatedDependencies[0].dependencyType).toEqual('direct:production')
  expect(updatedDependencies[0].updateType).toEqual('version-update:semver-minor')
  expect(updatedDependencies[0].directory).toEqual('/')
  expect(updatedDependencies[0].packageEcosystem).toEqual('nuget')
  expect(updatedDependencies[0].targetBranch).toEqual('main')
  expect(updatedDependencies[0].prevVersion).toEqual('4.0.1')
  expect(updatedDependencies[0].newVersion).toEqual('4.2.2')
  expect(updatedDependencies[0].alertState).toEqual('DISMISSED')
  expect(updatedDependencies[0].ghsaId).toEqual('GHSA-III-BBB')
  expect(updatedDependencies[0].cvss).toEqual(4.6)
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

  const getAlert = async (name: string) => {
    if (name === 'coffee-rails') {
      return Promise.resolve({ alertState: 'DISMISSED', ghsaId: 'GHSA-III-BBB', cvss: 4.6 })
    }

    return Promise.resolve({ alertState: '', ghsaId: '', cvss: 0 })
  }

  const updatedDependencies = await updateMetadata.parse(commitMessage, 'dependabot/nuget/api/main/coffee-rails', 'main', getAlert)

  expect(updatedDependencies).toHaveLength(2)

  expect(updatedDependencies[0].dependencyName).toEqual('coffee-rails')
  expect(updatedDependencies[0].dependencyType).toEqual('direct:production')
  expect(updatedDependencies[0].updateType).toEqual('version-update:semver-minor')
  expect(updatedDependencies[0].directory).toEqual('/api/main')
  expect(updatedDependencies[0].packageEcosystem).toEqual('nuget')
  expect(updatedDependencies[0].targetBranch).toEqual('main')
  expect(updatedDependencies[0].prevVersion).toEqual('4.0.1')
  expect(updatedDependencies[0].newVersion).toEqual('4.2.2')
  expect(updatedDependencies[0].alertState).toEqual('DISMISSED')
  expect(updatedDependencies[0].ghsaId).toEqual('GHSA-III-BBB')
  expect(updatedDependencies[0].cvss).toEqual(4.6)

  expect(updatedDependencies[1].dependencyName).toEqual('coffeescript')
  expect(updatedDependencies[1].dependencyType).toEqual('indirect')
  expect(updatedDependencies[1].updateType).toEqual('version-update:semver-patch')
  expect(updatedDependencies[1].directory).toEqual('/api/main')
  expect(updatedDependencies[1].packageEcosystem).toEqual('nuget')
  expect(updatedDependencies[1].targetBranch).toEqual('main')
  expect(updatedDependencies[1].prevVersion).toEqual('')
  expect(updatedDependencies[1].newVersion).toEqual('')
  expect(updatedDependencies[1].alertState).toEqual('')
  expect(updatedDependencies[1].ghsaId).toEqual('')
  expect(updatedDependencies[1].cvss).toEqual(0)
})

test('it only returns information within the first fragment if there are multiple yaml documents', async () => {
  const commitMessage =
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

  const updatedDependencies = await updateMetadata.parse(commitMessage, 'dependabot|nuget|coffee-rails', 'main', undefined)

  expect(updatedDependencies).toHaveLength(1)

  expect(updatedDependencies[0].dependencyName).toEqual('coffee-rails')
  expect(updatedDependencies[0].dependencyType).toEqual('direct:production')
  expect(updatedDependencies[0].updateType).toEqual('version-update:semver-minor')
  expect(updatedDependencies[0].directory).toEqual('/')
  expect(updatedDependencies[0].packageEcosystem).toEqual('nuget')
  expect(updatedDependencies[0].targetBranch).toEqual('main')
  expect(updatedDependencies[0].prevVersion).toEqual('')
  expect(updatedDependencies[0].newVersion).toEqual('')
  expect(updatedDependencies[0].alertState).toEqual('')
  expect(updatedDependencies[0].ghsaId).toEqual('')
  expect(updatedDependencies[0].cvss).toEqual(0)
})

test('it properly handles dependencies which contain slashes', async () => {
  const commitMessage =
    '- [Release notes](https://github.com/rails/coffee/releases)\n' +
    '- [Changelog](https://github.com/rails/coffee/blob/master/CHANGELOG.md)\n' +
    '- [Commits](rails/coffee@v4.0.1...v4.2.2)\n' +
    '\n' +
    '---\n' +
    'updated-dependencies:\n' +
    '- dependency-name: rails/coffee\n' +
    '  dependency-type: direct:production\n' +
    '  update-type: version-update:semver-minor\n' +
    '...\n' +
    '\n' +
    'Signed-off-by: dependabot[bot] <support@github.com>'

  const getAlert = async () => Promise.resolve({ alertState: '', ghsaId: '', cvss: 0 })
  const updatedDependencies = await updateMetadata.parse(commitMessage, 'dependabot/nuget/api/rails/coffee', 'main', getAlert)

  expect(updatedDependencies).toHaveLength(1)

  expect(updatedDependencies[0].dependencyName).toEqual('rails/coffee')
  expect(updatedDependencies[0].dependencyType).toEqual('direct:production')
  expect(updatedDependencies[0].updateType).toEqual('version-update:semver-minor')
  expect(updatedDependencies[0].directory).toEqual('/api')
  expect(updatedDependencies[0].packageEcosystem).toEqual('nuget')
  expect(updatedDependencies[0].targetBranch).toEqual('main')
  expect(updatedDependencies[0].prevVersion).toEqual('')
  expect(updatedDependencies[0].newVersion).toEqual('')
  expect(updatedDependencies[0].alertState).toEqual('')
  expect(updatedDependencies[0].ghsaId).toEqual('')
  expect(updatedDependencies[0].cvss).toEqual(0)
})
