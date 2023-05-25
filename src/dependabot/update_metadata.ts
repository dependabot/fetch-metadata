import * as YAML from 'yaml'

export type cwesType = Array<{
  cweId: string;
  name: string;
}>;

export type identifiersType = Array<{
  type: string;
  value: string;
}>;

export interface dependencyAlert {
  alertState: string,
  alertSeverity: string,
  ghsaId: string,
  cvss: number,
  cwes: cwesType,
  alertDescription: string,
  alertIdentifiers: identifiersType,
  alertSummary: string
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
  compatScore: number,
  maintainerChanges: boolean
}

export interface alertLookup {
    (dependencyName: string, dependencyVersion: string, directory: string): Promise<dependencyAlert>;
}

export interface scoreLookup {
    (dependencyName: string, previousVersion: string, newVersion: string, ecosystem: string): Promise<number>;
}

const baseAlert = {
  alertState: '',
  alertSeverity: '',
  ghsaId: '',
  cvss: 0,
  cwes: [],
  alertDescription: '',
  alertIdentifiers: [],
  alertSummary: ''
}

export async function parse (commitMessage: string, body: string, branchName: string, mainBranch: string, lookup?: alertLookup, getScore?: scoreLookup): Promise<Array<updatedDependency>> {
  const bumpFragment = commitMessage.match(/^Bumps .* from (?<from>v?\d[^ ]*) to (?<to>v?\d[^ ]*)\.$/m)
  const updateFragment = commitMessage.match(/^Update .* requirement from \S*? ?(?<from>v?\d\S*) to \S*? ?(?<to>v?\d\S*)$/m)
  const yamlFragment = commitMessage.match(/^-{3}\n(?<dependencies>[\S|\s]*?)\n^\.{3}\n/m)
  const newMaintainer = !!body.match(/Maintainer changes/m)
  const lookupFn = lookup ?? (() => Promise.resolve(baseAlert))
  const scoreFn = getScore ?? (() => Promise.resolve(0))

  if (yamlFragment?.groups && branchName.startsWith('dependabot')) {
    const data = YAML.parse(yamlFragment.groups.dependencies)

    // Since we are on the `dependabot` branch (9 letters), the 10th letter in the branch name is the delimiter
    const delim = branchName[10]
    const chunks = branchName.split(delim)
    const prev = bumpFragment?.groups?.from ?? (updateFragment?.groups?.from ?? '')
    const next = bumpFragment?.groups?.to ?? (updateFragment?.groups?.to ?? '')

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
          maintainerChanges: newMaintainer,
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

  const lastParts = lastVersion.replace('v', '').split('.')
  const nextParts = nextVersion.replace('v', '').split('.')

  if (lastParts[0] !== nextParts[0]) {
    return 'version-update:semver-major'
  }

  if (lastParts.length < 2 || nextParts.length < 2 || lastParts[1] !== nextParts[1]) {
    return 'version-update:semver-minor'
  }

  return 'version-update:semver-patch'
}
