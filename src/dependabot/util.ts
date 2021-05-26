export function parseNwo (nwo: string): {owner: string; repo: string} {
  const [owner, name] = nwo.split('/')

  if (!owner || !name) {
    throw new Error(`'${nwo}' does not appear to be a valid repository NWO`)
  }

  return { owner: owner, repo: name }
}
