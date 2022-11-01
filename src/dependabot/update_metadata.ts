import * as YAML from 'yaml'

export interface dependencyAlert {
  alertState: string,
  ghsaId: string,
  cvss: number
}

export interface updatedDependency extends dependencyAlert {
  dependencyName: string,
  dependencyType: string,
  updateType: string,
  directory: string,
  packageEcosystem: string,
  targetBranch: string,
  prevVersion: string,
  newVersion: string,
  compatScore: number
}

export interface alertLookup {
    (dependencyName: string, dependencyVersion: string, directory: string): Promise<dependencyAlert>;
}

export interface scoreLookup {
    (dependencyName: string, previousVersion: string, newVersion: string, ecosystem: string): Promise<number>;
}

export async function parse (commitMessage: string, branchName: string, mainBranch: string, lookup?: alertLookup, getScore?: scoreLookup): Promise<Array<updatedDependency>> {
  const bumpFragment = commitMessage.match(/^Bumps .* from (?<from>\d[^ ]*) to (?<to>\d[^ ]*)\.$/m)
  const yamlFragment = commitMessage.match(/^-{3}\n(?<dependencies>[\S|\s]*?)\n^\.{3}\n/m)
  const lookupFn = lookup ?? (() => Promise.resolve({ alertState: '', ghsaId: '', cvss: 0 }))
  const scoreFn = getScore ?? (() => Promise.resolve(0))

  if (yamlFragment?.groups && branchName.startsWith('dependabot')) {
    const data = YAML.parse(yamlFragment.groups.dependencies)

    // Since we are on the `dependabot` branch (9 letters), the 10th letter in the branch name is the delimiter
    const delim = branchName[10]
    const chunks = branchName.split(delim)
    const prev = bumpFragment?.groups?.from ?? ''
    const next = bumpFragment?.groups?.to ?? ''

    if (data['updated-dependencies']) {
      return await Promise.all(data['updated-dependencies'].map(async (dependency, index) => {
        const dirname = `/${chunks.slice(2, -1 * (1 + (dependency['dependency-name'].match(/\//g) || []).length)).join(delim) || ''}`
        const lastVersion = index === 0 ? prev : ''
        const nextVersion = index === 0 ? next : ''
        const updateType = dependency['update-type'] || calculateUpdateType(lastVersion, nextVersion)
        return {
          dependencyName: dependency['dependency-name'],
          dependencyType: dependency['dependency-type'],
          updateType,
          directory: dirname,
          packageEcosystem: chunks[1],
          targetBranch: mainBranch,
          prevVersion: lastVersion,
          newVersion: nextVersion,
          compatScore: await scoreFn(dependency['dependency-name'], lastVersion, nextVersion, chunks[1]),
          ...await lookupFn(dependency['dependency-name'], lastVersion, dirname)
        }
      }))
    }
  }

  return Promise.resolve([])
}

export function calculateUpdateType (lastVersion: string, nextVersion: string) {
  if (!lastVersion || !nextVersion || lastVersion === nextVersion) {
    return ''
  }

  const lastParts = lastVersion.split('.')
  const nextParts = nextVersion.split('.')

  if (lastParts[0] !== nextParts[0]) {
    return 'version-update:semver-major'
  }

  if (lastParts.length < 2 || nextParts.length < 2 || lastParts[1] !== nextParts[1]) {
    return 'version-update:semver-minor'
  }

  return 'version-update:semver-patch'
}
