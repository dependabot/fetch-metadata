import * as updateMetadata from './update_metadata'

test('it returns an empty array for a blank string', async () => {
  const getAlert = async () => Promise.resolve({ alertState: 'DISMISSED', ghsaId: 'GHSA-III-BBB', cvss: 4.6 })
  const getScore = async () => Promise.resolve(43)
  expect(updateMetadata.parse('', '', 'dependabot/nuget/coffee-rails', 'main', getAlert, getScore)).resolves.toEqual([])
})

test('it returns an empty array for commit message with no dependabot yaml fragment', async () => {
  const commitMessage = `Bumps [coffee-rails](https://github.com/rails/coffee-rails) from 4.0.1 to 4.2.2.
  - [Release notes](https://github.com/rails/coffee-rails/releases)
  - [Changelog](https://github.com/rails/coffee-rails/blob/master/CHANGELOG.md)
  - [Commits](rails/coffee-rails@v4.0.1...v4.2.2)

  Signed-off-by: dependabot[bot] <support@github.com>`

  const getAlert = async () => Promise.resolve({ alertState: 'DISMISSED', ghsaId: 'GHSA-III-BBB', cvss: 4.6 })
  const getScore = async () => Promise.resolve(43)
  expect(updateMetadata.parse(commitMessage, '', 'dependabot/nuget/coffee-rails', 'main', getAlert, getScore)).resolves.toEqual([])
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
    '...\n' +
    '\n' +
    'Signed-off-by: dependabot[bot] <support@github.com>'
  const body =
    'Bumps [coffee-rails](https://github.com/rails/coffee-rails) from 4.0.1 to 4.2.2.\n' +
    '- [Release notes](https://github.com/rails/coffee-rails/releases)\n' +
    '- [Changelog](https://github.com/rails/coffee-rails/blob/master/CHANGELOG.md)\n' +
    '- [Commits](rails/coffee-rails@v4.0.1...v4.2.2)\n' +
    '\n' +
    'Maintainer changes:\n' +
    'The maintainer changed!'

  const getAlert = async () => Promise.resolve({ alertState: 'DISMISSED', ghsaId: 'GHSA-III-BBB', cvss: 4.6 })
  const getScore = async () => Promise.resolve(43)
  const updatedDependencies = await updateMetadata.parse(commitMessage, body, 'dependabot/nuget/coffee-rails', 'main', getAlert, getScore)

  expect(updatedDependencies).toHaveLength(1)

  expect(updatedDependencies[0].dependencyName).toEqual('coffee-rails')
  expect(updatedDependencies[0].dependencyType).toEqual('direct:production')
  expect(updatedDependencies[0].updateType).toEqual('version-update:semver-minor')
  expect(updatedDependencies[0].directory).toEqual('/')
  expect(updatedDependencies[0].packageEcosystem).toEqual('nuget')
  expect(updatedDependencies[0].targetBranch).toEqual('main')
  expect(updatedDependencies[0].prevVersion).toEqual('4.0.1')
  expect(updatedDependencies[0].newVersion).toEqual('4.2.2')
  expect(updatedDependencies[0].compatScore).toEqual(43)
  expect(updatedDependencies[0].maintainerChanges).toEqual(true)
  expect(updatedDependencies[0].alertState).toEqual('DISMISSED')
  expect(updatedDependencies[0].ghsaId).toEqual('GHSA-III-BBB')
  expect(updatedDependencies[0].cvss).toEqual(4.6)
  expect(updatedDependencies[0].dependencyGroup).toEqual('')
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
  const body =
    'Bumps [coffee-rails](https://github.com/rails/coffee-rails) from 4.0.1 to 4.2.2.\n' +
    '- [Release notes](https://github.com/rails/coffee-rails/releases)\n' +
    '- [Changelog](https://github.com/rails/coffee-rails/blob/master/CHANGELOG.md)\n' +
    '- [Commits](rails/coffee-rails@v4.0.1...v4.2.2)\n' +
    '\n' +
    'Has the maintainer changed?'

  const getAlert = async (name: string) => {
    if (name === 'coffee-rails') {
      return Promise.resolve({ alertState: 'DISMISSED', ghsaId: 'GHSA-III-BBB', cvss: 4.6 })
    }

    return Promise.resolve({ alertState: '', ghsaId: '', cvss: 0 })
  }

  const getScore = async (name: string) => {
    if (name === 'coffee-rails') {
      return Promise.resolve(34)
    }

    return Promise.resolve(0)
  }

  const updatedDependencies = await updateMetadata.parse(commitMessage, body, 'dependabot/nuget/api/main/coffee-rails/and/coffeescript', 'main', getAlert, getScore)

  expect(updatedDependencies).toHaveLength(2)

  expect(updatedDependencies[0].dependencyName).toEqual('coffee-rails')
  expect(updatedDependencies[0].dependencyType).toEqual('direct:production')
  expect(updatedDependencies[0].updateType).toEqual('version-update:semver-minor')
  expect(updatedDependencies[0].directory).toEqual('/api/main')
  expect(updatedDependencies[0].packageEcosystem).toEqual('nuget')
  expect(updatedDependencies[0].targetBranch).toEqual('main')
  expect(updatedDependencies[0].prevVersion).toEqual('4.0.1')
  expect(updatedDependencies[0].newVersion).toEqual('4.2.2')
  expect(updatedDependencies[0].compatScore).toEqual(34)
  expect(updatedDependencies[0].maintainerChanges).toEqual(false)
  expect(updatedDependencies[0].alertState).toEqual('DISMISSED')
  expect(updatedDependencies[0].ghsaId).toEqual('GHSA-III-BBB')
  expect(updatedDependencies[0].cvss).toEqual(4.6)
  expect(updatedDependencies[0].dependencyGroup).toEqual('')
  expect(updatedDependencies[0].dependencyGroup).toEqual('')

  expect(updatedDependencies[1].dependencyName).toEqual('coffeescript')
  expect(updatedDependencies[1].dependencyType).toEqual('indirect')
  expect(updatedDependencies[1].updateType).toEqual('version-update:semver-patch')
  expect(updatedDependencies[1].directory).toEqual('/api/main')
  expect(updatedDependencies[1].packageEcosystem).toEqual('nuget')
  expect(updatedDependencies[1].targetBranch).toEqual('main')
  expect(updatedDependencies[1].prevVersion).toEqual('')
  expect(updatedDependencies[1].compatScore).toEqual(0)
  expect(updatedDependencies[1].maintainerChanges).toEqual(false)
  expect(updatedDependencies[1].alertState).toEqual('')
  expect(updatedDependencies[1].ghsaId).toEqual('')
  expect(updatedDependencies[1].cvss).toEqual(0)
  expect(updatedDependencies[1].dependencyGroup).toEqual('')
})

test('it returns the updated dependency information when there is a leading v in the commit message versions', async () => {
  const commitMessage =
    'Bumps [coffee-rails](https://github.com/rails/coffee-rails) from v4.0.1 to v4.2.2.\n' +
    '- [Release notes](https://github.com/rails/coffee-rails/releases)\n' +
    '- [Changelog](https://github.com/rails/coffee-rails/blob/master/CHANGELOG.md)\n' +
    '- [Commits](rails/coffee-rails@v4.0.1...v4.2.2)\n' +
    '\n' +
    '---\n' +
    'updated-dependencies:\n' +
    '- dependency-name: coffee-rails\n' +
    '  dependency-type: direct:production\n' +
    '...\n' +
    '\n' +
    'Signed-off-by: dependabot[bot] <support@github.com>'

  const getAlert = async () => Promise.resolve({ alertState: 'DISMISSED', ghsaId: 'GHSA-III-BBB', cvss: 4.6 })
  const getScore = async () => Promise.resolve(43)
  const updatedDependencies = await updateMetadata.parse(commitMessage, '', 'dependabot/nuget/coffee-rails', 'main', getAlert, getScore)

  expect(updatedDependencies).toHaveLength(1)

  expect(updatedDependencies[0].dependencyName).toEqual('coffee-rails')
  expect(updatedDependencies[0].dependencyType).toEqual('direct:production')
  expect(updatedDependencies[0].updateType).toEqual('version-update:semver-minor')
  expect(updatedDependencies[0].directory).toEqual('/')
  expect(updatedDependencies[0].packageEcosystem).toEqual('nuget')
  expect(updatedDependencies[0].targetBranch).toEqual('main')
  expect(updatedDependencies[0].prevVersion).toEqual('v4.0.1')
  expect(updatedDependencies[0].newVersion).toEqual('v4.2.2')
  expect(updatedDependencies[0].compatScore).toEqual(43)
  expect(updatedDependencies[0].alertState).toEqual('DISMISSED')
  expect(updatedDependencies[0].ghsaId).toEqual('GHSA-III-BBB')
  expect(updatedDependencies[0].cvss).toEqual(4.6)
  expect(updatedDependencies[0].dependencyGroup).toEqual('')
})

test('it supports returning information about grouped updates', async () => {
  const commitMessage =
    'Bumps the docker group with 3 updates: [github.com/docker/cli](https://github.com/docker/cli), [github.com/docker/docker](https://github.com/docker/docker) and [github.com/moby/moby](https://github.com/moby/moby).\n' +
    '\n' +
    'Updates `github.com/docker/cli` from 24.0.1+incompatible to 24.0.2+incompatible\n' +
    '- [Commits](docker/cli@v24.0.1...v24.0.2)\n' +
    '\n' +
    'Updates `github.com/docker/docker` from 24.0.1+incompatible to 24.0.2+incompatible\n' +
    '- [Release notes](https://github.com/docker/docker/releases)\n' +
    '- [Commits](moby/moby@v24.0.1...v24.0.2)\n' +
    '\n' +
    'Updates `github.com/moby/moby` from 24.0.1+incompatible to 24.0.2+incompatible\n' +
    '- [Release notes](https://github.com/moby/moby/releases)\n' +
    '- [Commits](moby/moby@v24.0.1...v24.0.2)\n' +
    '\n' +
    '---\n' +
    'updated-dependencies:\n' +
    '- dependency-name: github.com/docker/cli\n' +
    '  dependency-type: direct:production\n' +
    '  update-type: version-update:semver-patch\n' +
    '  dependency-group: docker\n' +
    '- dependency-name: github.com/docker/docker\n' +
    '  dependency-type: direct:production\n' +
    '  update-type: version-update:semver-patch\n' +
    '  dependency-group: docker\n' +
    '- dependency-name: github.com/moby/moby\n' +
    '  dependency-type: direct:production\n' +
    '  update-type: version-update:semver-patch\n' +
    '  dependency-group: docker\n' +
    '...\n' +
    '\n' +
    'Signed-off-by: dependabot[bot] <support@github.com>\n'

  const getAlert = async () => Promise.resolve({ alertState: 'DISMISSED', ghsaId: 'GHSA-III-BBB', cvss: 4.6 })
  const getScore = async () => Promise.resolve(43)
  const updatedDependencies = await updateMetadata.parse(commitMessage, '', 'dependabot/docker/gh-base-image/docker-1234566789', 'main', getAlert, getScore)

  expect(updatedDependencies).toHaveLength(3)

  expect(updatedDependencies[0].dependencyName).toEqual('github.com/docker/cli')
  expect(updatedDependencies[0].dependencyGroup).toEqual('docker')
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

  const updatedDependencies = await updateMetadata.parse(commitMessage, '', 'dependabot|nuget|coffee-rails', 'main', undefined, undefined)

  expect(updatedDependencies).toHaveLength(1)

  expect(updatedDependencies[0].dependencyName).toEqual('coffee-rails')
  expect(updatedDependencies[0].dependencyType).toEqual('direct:production')
  expect(updatedDependencies[0].updateType).toEqual('version-update:semver-minor')
  expect(updatedDependencies[0].directory).toEqual('/')
  expect(updatedDependencies[0].packageEcosystem).toEqual('nuget')
  expect(updatedDependencies[0].targetBranch).toEqual('main')
  expect(updatedDependencies[0].prevVersion).toEqual('')
  expect(updatedDependencies[0].newVersion).toEqual('')
  expect(updatedDependencies[0].compatScore).toEqual(0)
  expect(updatedDependencies[0].maintainerChanges).toEqual(false)
  expect(updatedDependencies[0].alertState).toEqual('')
  expect(updatedDependencies[0].ghsaId).toEqual('')
  expect(updatedDependencies[0].cvss).toEqual(0)
  expect(updatedDependencies[0].dependencyGroup).toEqual('')
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
  const getScore = async () => Promise.resolve(0)
  const updatedDependencies = await updateMetadata.parse(commitMessage, '', 'dependabot/nuget/api/rails/coffee', 'main', getAlert, getScore)

  expect(updatedDependencies).toHaveLength(1)

  expect(updatedDependencies[0].dependencyName).toEqual('rails/coffee')
  expect(updatedDependencies[0].dependencyType).toEqual('direct:production')
  expect(updatedDependencies[0].updateType).toEqual('version-update:semver-minor')
  expect(updatedDependencies[0].directory).toEqual('/api')
  expect(updatedDependencies[0].packageEcosystem).toEqual('nuget')
  expect(updatedDependencies[0].targetBranch).toEqual('main')
  expect(updatedDependencies[0].prevVersion).toEqual('')
  expect(updatedDependencies[0].newVersion).toEqual('')
  expect(updatedDependencies[0].compatScore).toEqual(0)
  expect(updatedDependencies[0].maintainerChanges).toEqual(false)
  expect(updatedDependencies[0].alertState).toEqual('')
  expect(updatedDependencies[0].ghsaId).toEqual('')
  expect(updatedDependencies[0].cvss).toEqual(0)
  expect(updatedDependencies[0].dependencyGroup).toEqual('')
})

test('it handles branch names with hyphen separator', async () => {
  const commitMessage =
      '- [Release notes](https://github.com/fsevents/fsevents/releases)\n' +
      '- [Commits](fsevents/fsevents@v1.2.9...v1.2.13)\n' +
      '\n' +
      '---\n' +
      'updated-dependencies:\n' +
      '- dependency-name: fsevents\n' +
      '  dependency-type: indirect\n' +
      '...\n' +
      '\n' +
      'Signed-off-by: dependabot[bot] <support@github.com>'

  const getAlert = async () => Promise.resolve({ alertState: '', ghsaId: '', cvss: 0 })
  const getScore = async () => Promise.resolve(0)
  const updatedDependencies = await updateMetadata.parse(commitMessage, '', 'dependabot-npm_and_yarn-fsevents-1.2.13', 'master', getAlert, getScore)

  expect(updatedDependencies[0].directory).toEqual('/')
})

test('it handles branch names with hyphen separator and manifest files in nested directories', async () => {
  const commitMessage =
      '- [Release notes](https://github.com/fsevents/fsevents/releases)\n' +
      '- [Commits](fsevents/fsevents@v1.2.9...v1.2.13)\n' +
      '\n' +
      '---\n' +
      'updated-dependencies:\n' +
      '- dependency-name: fsevents\n' +
      '  dependency-type: indirect\n' +
      '...\n' +
      '\n' +
      'Signed-off-by: dependabot[bot] <support@github.com>'

  const getAlert = async () => Promise.resolve({ alertState: '', ghsaId: '', cvss: 0 })
  const getScore = async () => Promise.resolve(0)
  const updatedDependencies = await updateMetadata.parse(commitMessage, '', 'dependabot-npm_and_yarn-nested-nested-fsevents-1.2.13', 'master', getAlert, getScore)

  expect(updatedDependencies[0].directory).toEqual('/nested/nested')
})

test('it handles branch names with hyphen separator and dependency names with forward slashes', async () => {
  const commitMessage =
      '- [Release notes](https://github.com/composer/composer/releases)\n' +
      '- [Changelog](https://github.com/composer/composer/blob/main/CHANGELOG.md)\n' +
      '- [Commits](composer/composer@1.10.26...2.6.5)\n' +
      '\n' +
      '---\n' +
      'updated-dependencies:\n' +
      '- dependency-name: composer/composer\n' +
      '  dependency-type: indirect\n' +
      '...\n' +
      '\n' +
      'Signed-off-by: dependabot[bot] <support@github.com>'

  const getAlert = async () => Promise.resolve({ alertState: '', ghsaId: '', cvss: 0 })
  const getScore = async () => Promise.resolve(0)
  const updatedDependencies = await updateMetadata.parse(commitMessage, '', 'dependabot-composer-composer-composer-2.6.5', 'master', getAlert, getScore)

  expect(updatedDependencies[0].directory).toEqual('/')
})

test('it handles branch names with hyphen separator and multiple dependencies', async () => {
  const commitMessage =
      'Updates `twilio-video` from 2.7.0 to 2.28.1\n' +
      '- [Release notes](https://github.com/twilio/twilio-video.js/releases)\n' +
      '- [Changelog](https://github.com/twilio/twilio-video.js/blob/master/CHANGELOG.md)\n' +
      '- [Commits](twilio/twilio-video.js@2.7.0...2.28.1)\n' +
      '\n' +
      'Updates `@types/twilio-video` from 2.7.0 to 2.11.0\n' +
      '- [Release notes](https://github.com/DefinitelyTyped/DefinitelyTyped/releases)\n' +
      '- [Commits](https://github.com/DefinitelyTyped/DefinitelyTyped/commits/HEAD/types/twilio-video)\n' +
      '\n' +
      '---\n' +
      'updated-dependencies:\n' +
      '- dependency-name: twilio-video\n' +
      '  dependency-type: direct:production\n' +
      '  update-type: version-update:semver-minor\n' +
      '- dependency-name: "@types/twilio-video"\n' +
      '  dependency-type: direct:development\n' +
      '  update-type: version-update:semver-minor\n' +
      '...\n' +
      '\n' +
      'Signed-off-by: dependabot[bot] <support@github.com>'

  const getAlert = async () => Promise.resolve({ alertState: '', ghsaId: '', cvss: 0 })
  const getScore = async () => Promise.resolve(0)

  const updatedDependencies = await updateMetadata.parse(
    commitMessage,
    '',
    'dependabot-npm_and_yarn-twilio-video-and-types-twilio-video-2.28.1',
    'master',
    getAlert,
    getScore
  )

  expect(updatedDependencies[0].directory).toEqual('/')
})

test('it handles branch names when it has dependency-group and non-root directory', async () => {
  const commitMessage = `Bumps the eslint group in /first-package with 1 update: [eslint](https://github.com/eslint/eslint).


Updates \`eslint\` from 9.12.0 to 9.13.0
- [Release notes](https://github.com/eslint/eslint/releases)
- [Changelog](https://github.com/eslint/eslint/blob/main/CHANGELOG.md)
- [Commits](eslint/eslint@v9.12.0...v9.13.0)

---
updated-dependencies:
- dependency-name: eslint
  dependency-type: direct:development
  update-type: version-update:semver-minor
  dependency-group: eslint
...

Signed-off-by: dependabot[bot] <support@github.com>`

  const getAlert = async () => Promise.resolve({ alertState: 'DISMISSED', ghsaId: 'GHSA-III-BBB', cvss: 4.6 })
  const getScore = async () => Promise.resolve(43)
  const updatedDependencies = await updateMetadata.parse(commitMessage, '', 'dependabot/npm_and_yarn/first-package/eslint-3c401b8a51', 'main', getAlert, getScore)

  expect(updatedDependencies[0].directory).toEqual('/first-package')
})

test('it handles branch names when it has dependency-group and root directory', async () => {
  const commitMessage = `Bumps the eslint group in /first-package with 1 update: [eslint](https://github.com/eslint/eslint).


Updates \`eslint\` from 9.12.0 to 9.13.0
- [Release notes](https://github.com/eslint/eslint/releases)
- [Changelog](https://github.com/eslint/eslint/blob/main/CHANGELOG.md)
- [Commits](eslint/eslint@v9.12.0...v9.13.0)

---
updated-dependencies:
- dependency-name: eslint
  dependency-type: direct:development
  update-type: version-update:semver-minor
  dependency-group: eslint
...

Signed-off-by: dependabot[bot] <support@github.com>`

  const getAlert = async () => Promise.resolve({ alertState: 'DISMISSED', ghsaId: 'GHSA-III-BBB', cvss: 4.6 })
  const getScore = async () => Promise.resolve(43)
  const updatedDependencies = await updateMetadata.parse(commitMessage, '', 'dependabot/npm_and_yarn/first-package/eslint-3c401b8a51', 'main', getAlert, getScore)

  expect(updatedDependencies[0].directory).toEqual('/first-package')
})

test('it handles branch names when it has dependency-group with multiple dependencies and non-root directory', async () => {
  const commitMessage = `Bumps the grouped-dependencies group with 3 updates in the /first-package directory: [eslint](https://github.com/eslint/eslint), [rimraf](https://github.com/isaacs/rimraf) and [vitest](https://github.com/vitest-dev/vitest/tree/HEAD/packages/vitest).


Updates \`eslint\` from 9.12.0 to 9.13.0
- [Release notes](https://github.com/eslint/eslint/releases)
- [Changelog](https://github.com/eslint/eslint/blob/main/CHANGELOG.md)
- [Commits](eslint/eslint@v9.12.0...v9.13.0)

Updates \`rimraf\` from 5.0.10 to 6.0.1
- [Changelog](https://github.com/isaacs/rimraf/blob/main/CHANGELOG.md)
- [Commits](isaacs/rimraf@v5.0.10...v6.0.1)

Updates \`vitest\` from 1.6.0 to 2.1.3
- [Release notes](https://github.com/vitest-dev/vitest/releases)
- [Commits](https://github.com/vitest-dev/vitest/commits/v2.1.3/packages/vitest)

---
updated-dependencies:
- dependency-name: eslint
  dependency-type: direct:development
  update-type: version-update:semver-minor
  dependency-group: grouped-dependencies
- dependency-name: rimraf
  dependency-type: direct:development
  update-type: version-update:semver-major
  dependency-group: grouped-dependencies
- dependency-name: vitest
  dependency-type: direct:development
  update-type: version-update:semver-major
  dependency-group: grouped-dependencies
...

Signed-off-by: dependabot[bot] <support@github.com>`

  const getAlert = async () => Promise.resolve({ alertState: 'DISMISSED', ghsaId: 'GHSA-III-BBB', cvss: 4.6 })
  const getScore = async () => Promise.resolve(43)
  const updatedDependencies = await updateMetadata.parse(commitMessage, '', 'dependabot/npm_and_yarn/first-package/grouped-dependencies-b23a7a6750', 'main', getAlert, getScore)

  expect(updatedDependencies[0].directory).toEqual('/first-package')
})

test('calculateUpdateType should handle all paths', () => {
  expect(updateMetadata.calculateUpdateType('', '')).toEqual('')
  expect(updateMetadata.calculateUpdateType('', '1')).toEqual('')
  expect(updateMetadata.calculateUpdateType('1', '')).toEqual('')
  expect(updateMetadata.calculateUpdateType('1.1.1', '1.1.1')).toEqual('')
  expect(updateMetadata.calculateUpdateType('1', '2')).toEqual('version-update:semver-major')
  expect(updateMetadata.calculateUpdateType('1.2.2', '2.2.2')).toEqual('version-update:semver-major')
  expect(updateMetadata.calculateUpdateType('1.1', '1')).toEqual('version-update:semver-minor')
  expect(updateMetadata.calculateUpdateType('1', '1.1')).toEqual('version-update:semver-minor')
  expect(updateMetadata.calculateUpdateType('1.2.1', '1.1.1')).toEqual('version-update:semver-minor')
  expect(updateMetadata.calculateUpdateType('1.1.1', '1.1')).toEqual('version-update:semver-patch')
  expect(updateMetadata.calculateUpdateType('1.1', '1.1.1')).toEqual('version-update:semver-patch')
  expect(updateMetadata.calculateUpdateType('1.1.1', '1.1.2')).toEqual('version-update:semver-patch')
  expect(updateMetadata.calculateUpdateType('1.1.1.1', '1.1.1.2')).toEqual('version-update:semver-patch')
})
