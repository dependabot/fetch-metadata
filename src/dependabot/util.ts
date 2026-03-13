import { Context } from '@actions/github/lib/context'
import { getInput } from '@actions/core'

export function parseNwo (nwo: string): {owner: string; repo: string} {
  const [owner, name] = nwo.split('/')

  if (!owner || !name) {
    throw new Error(`'${nwo}' does not appear to be a valid repository NWO`)
  }

  return { owner, repo: name }
}

export interface branchNames {
  headName: string,
  baseName: string
}

export function getBranchNames (context: Context): branchNames {
  const { pull_request: pr } = context.payload
  return { headName: pr?.head.ref || '', baseName: pr?.base.ref }
}

export function getBody (context: Context): string {
  const { pull_request: pr } = context.payload
  return pr?.body || ''
}

export function getNumberInput (inputName: string, defaultVal: number): number;
export function getNumberInput (inputName: string, defaultVal?: number): number | undefined {
  const inputStr = getInput(inputName);
  let num = Number.parseInt(inputStr);
  if (Number.isNaN(num)) {
    return defaultVal;
  }
  return num;
}
