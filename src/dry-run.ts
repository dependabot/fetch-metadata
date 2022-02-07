/* eslint-disable no-console, @typescript-eslint/no-var-requires, no-unused-expressions */
import * as github from '@actions/github'
import { Context } from '@actions/github/lib/context'
import * as dotenv from 'dotenv'
import { Argv } from 'yargs'
import { hideBin } from 'yargs/helpers'

import { getMessage } from './dependabot/verified_commits'
import { parse } from './dependabot/update_metadata'
import { parseNwo } from './dependabot/util'

async function check (args: any): Promise<void> {
  try {
    const githubToken = process.env.LOCAL_GITHUB_ACCESS_TOKEN

    if (!githubToken) {
      console.log('You must set LOCAL_GITHUB_ACCESS_TOKEN to perform dry runs.')
      process.exit(1)
    }

    const repoDetails = parseNwo(args.nwo)
    const actionContext = new Context()
    // Convert the CLI args into a stubbed Webhook payload
    actionContext.payload = {
      pull_request: {
        number: args.prNumber,
        user: {
          login: 'dependabot[bot]'
        }
      },
      repository: {
        owner: {
          login: repoDetails.owner
        },
        name: repoDetails.repo
      }
    }

    const githubClient = github.getOctokit(githubToken)

    // Retries the commit message if the PR is from Dependabot
    const commitMessage = await getMessage(githubClient, actionContext)

    if (commitMessage) {
      console.log('This appears to be a valid Dependabot Pull Request.')

      const updatedDependencies = parse(commitMessage)

      if (updatedDependencies.length > 0) {
        console.log('Updated dependencies:')
        console.log(JSON.stringify(updatedDependencies, undefined, 2))
      } else {
        console.log('No dependabot metadata found!')
      }
    } else {
      console.log('This is not a Dependabot Pull Request.')
      process.exit(1)
    }
  } catch (exception) {
    console.log(exception.message)
    process.exit(1)
  }
}

dotenv.config()

require('yargs')(hideBin(process.argv))
  .command('check <nwo> <pr-number>', 'Perform a dry run on the given PR number of the NWO repo', (yargs) => {
    yargs.positional('nwo', {
      describe: 'The name with owner representation of a target repository, e.g. github/github',
      type: 'string'
    })
    yargs.positional('pr-number', {
      describe: 'The integer number of the target pull request to dry run',
      type: 'number'
    })
    yargs.demandOption(['nwo', 'pr-number'])
  }, (args: Argv) => {
    check(args)
  })
  .demandCommand(1)
  .help()
  .argv
