/*************  ✨ Codeium Command ⭐  *************/
export async function dryRun(
    updatedDeps: updatedDependency[],
    octokit: Octokit,
    owner: string,
    repo: string,
    prNumber: number,
    baseBranch: string,
    headBranch: string
): Promise<void> {
    const result = await octokit.rest.pulls.create({
        owner,
        repo,
        head: headBranch,
        base: baseBranch,
        title: `chore(deps): update dependencies\n\n${updatedDeps
            .map(dep => `- ${dep.old} => ${dep.new}`)
            .join('\n')}`,
        body: `This PR updates the following dependencies:\n\n${updatedDeps
            .map(
                dep =>
                    `- [${dep.old}](https://github.com/${dep.oldRepository}) => [${dep.new}](https://github.com/${dep.newRepository})`
            )
            .join('\n')}`,
        draft: true
    });
    core.info(`Created PR #${result.data.number}`);
    await octokit.rest.issues.addLabels({
        owner,
        repo,
        issue_number: result.data.number,
        labels: ['dependencies', 'dry-run']
    });
    await octokit.rest.pulls.update({
        owner,
        repo,
        pull_number: prNumber,
        state: 'closed'
    });
}
/******  e565f894-bac1-4452-a102-f31020ad9a4b  *******/