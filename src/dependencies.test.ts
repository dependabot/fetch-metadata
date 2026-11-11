import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { globSync } from 'glob'

const root = resolve(__dirname, '..')

test('the lockfile excludes minimatch affected by GHSA-g3hv-75wg-m249', () => {
  const lock = JSON.parse(readFileSync(resolve(root, 'package-lock.json'), 'utf8'))
  const versions = Object.entries(lock.packages)
    .filter(([name]) => name.endsWith('/minimatch'))
    .map(([, entry]) => (entry as { version: string }).version)

  expect(versions.length).toBeGreaterThan(0)
  for (const version of versions) {
    const major = Number(version.split('.')[0])
    expect(major < 7 || major >= 11).toBe(true)
    expect(version).not.toBe('11.0.0')
  }
})

test('glob still discovers files with wildcard and globstar patterns', () => {
  const files = globSync('src/**/*.test.ts', { cwd: root })

  expect(files).toEqual(expect.arrayContaining([
    'src/main.test.ts',
    'src/dependabot/update_metadata.test.ts'
  ]))
})

test('test-exclude preserves synchronous and asynchronous file filtering', async () => {
  const TestExclude = require('test-exclude')
  const exclude = new TestExclude({
    cwd: resolve(root, 'src/dependabot'),
    extension: ['.ts'],
    exclude: ['**/*.test.ts']
  })
  const files = exclude.globSync()

  expect(files).toContain('output.ts')
  expect(files).not.toContain('output.test.ts')
  expect((await exclude.glob()).sort()).toEqual(files.sort())
})
