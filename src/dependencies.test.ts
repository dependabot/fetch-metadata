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
  expect(versions).not.toContain('10.2.6')
})

test('glob still discovers files with wildcard and globstar patterns', () => {
  const files = globSync('src/**/*.test.ts', { cwd: root })

  expect(files).toEqual(expect.arrayContaining([
    'src/main.test.ts',
    'src/dependabot/update_metadata.test.ts'
  ]))
})
