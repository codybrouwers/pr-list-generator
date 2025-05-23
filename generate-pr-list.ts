#!/usr/bin/env bun

import { Octokit } from 'octokit';
import { $ } from 'bun';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

interface PR {
  number: number;
  title: string;
  url: string;
  additions: number;
  deletions: number;
}

interface RepoConfig {
  name: string;
  repo: string;
}

const REPOS: RepoConfig[] = [
  { name: 'front', repo: 'vercel/front' },
  { name: 'api', repo: 'vercel/api' },
];

// Get GitHub token from environment or gh CLI
async function getGitHubToken(): Promise<string> {
  // First try environment variables
  const envToken = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (envToken) {
    console.log('✅ Using token from environment variable');
    return envToken;
  }

  // Fallback to gh CLI
  try {
    console.log('🔍 Fetching token from gh CLI...');
    const token = await $`gh auth token`.text();

    if (token.trim()) {
      console.log('✅ Using token from gh CLI');
      return token.trim();
    } else {
      console.log('⚠️  gh CLI token command returned empty');
    }
  } catch (error) {
    console.log('⚠️  gh CLI not available or failed:', error);
  }

  console.error('❌ GitHub token not found. Please either:');
  console.error('   1. Set GITHUB_TOKEN environment variable, or');
  console.error('   2. Authenticate with gh CLI: gh auth login');
  console.error('   3. Create a token at: https://github.com/settings/tokens');
  process.exit(1);
}

// Initialize Octokit with authentication
async function createOctokit(): Promise<Octokit> {
  const token = await getGitHubToken();

  return new Octokit({
    auth: token,
    userAgent: 'pr-list-generator/1.0.0',
  });
}

async function fetchPRsForRepo(octokit: Octokit, repo: string): Promise<PR[]> {
  try {
    console.log(`Fetching PRs for ${repo}...`);

    const [owner, repoName] = repo.split('/');

    // Get authenticated user to filter by author
    const { data: user } = await octokit.rest.users.getAuthenticated();

    // Fetch open PRs authored by the authenticated user
    const { data: prs } = await octokit.rest.pulls.list({
      owner,
      repo: repoName,
      state: 'open',
      per_page: 100, // Adjust as needed
    });

    // Filter PRs by the authenticated user
    const userPRs = prs.filter(pr => pr.user?.login === user.login);

    // Fetch detailed information for each PR to get additions/deletions
    const detailedPRs = await Promise.all(
      userPRs.map(async (pr) => {
        try {
          const { data: detailedPR } = await octokit.rest.pulls.get({
            owner,
            repo: repoName,
            pull_number: pr.number,
          });

          return {
            number: pr.number,
            title: pr.title,
            url: pr.html_url,
            additions: detailedPR.additions || 0,
            deletions: detailedPR.deletions || 0,
          };
        } catch (error) {
          console.warn(`Warning: Could not fetch details for PR #${pr.number}`);
          return {
            number: pr.number,
            title: pr.title,
            url: pr.html_url,
            additions: 0,
            deletions: 0,
          };
        }
      })
    );

    console.log(`Found ${detailedPRs.length} open PRs for ${repo}`);
    return detailedPRs;
  } catch (error) {
    console.error(`Error fetching PRs for ${repo}:`, error);
    return [];
  }
}

function generateHTML(repoData: { repo: RepoConfig; prs: PR[] }[]): string {
  const prBlocks = repoData
    .map(({ repo, prs }) => {
      if (prs.length === 0) {
        return `  <blockquote><strong>${repo.name}</strong></blockquote>
  <blockquote><em>No open PRs</em></blockquote>`;
      }

      const prItems = prs
        .map(
          (pr) =>
            `  <blockquote><a href="${pr.url}">#${pr.number} ${pr.title}</a> <code>+${pr.additions}/-${pr.deletions}</code></blockquote>`,
        )
        .join('\n');

      return `  <blockquote><strong>${repo.name}</strong></blockquote>
${prItems}`;
    })
    .join('\n\n');

  return `<!DOCTYPE html>
<html>

<head>
  <title>PR List</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }

    blockquote {
      margin: 5px 0;
      padding: 8px 12px;
      border-left: 4px solid #ccc;
      background: #f9f9f9;
    }

    a {
      color: #1264a3;
      text-decoration: none;
    }

    a:hover {
      text-decoration: underline;
    }

    strong {
      font-weight: 600;
    }

    code {
      background: #f1f1f1;
      padding: 2px 4px;
      border-radius: 3px;
      font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
      font-size: 0.9em;
    }

    em {
      color: #666;
    }
  </style>
</head>

<body>
${prBlocks}
</body>

</html>`;
}

async function main() {
  console.log('🔍 Fetching your open pull requests...');

  const octokit = await createOctokit();

  // Verify authentication
  try {
    const { data: user } = await octokit.rest.users.getAuthenticated();
    console.log(`✅ Authenticated as: ${user.login}`);
  } catch (error) {
    console.error('❌ Authentication failed. Please check your GitHub token.');
    process.exit(1);
  }

  // Fetch PRs for all repos
  const repoData = await Promise.all(
    REPOS.map(async (repo) => ({
      repo,
      prs: await fetchPRsForRepo(octokit, repo.repo),
    })),
  );

  // Generate HTML
  const html = generateHTML(repoData);

  // Write to temporary file
  const outputPath = join(tmpdir(), 'pr_list.html');
  writeFileSync(outputPath, html);

  // Open in browser
  console.log('📝 Generated PR list HTML');
  console.log(`📂 File saved to: ${outputPath}`);

  try {
    await $`open ${outputPath}`;
    console.log(
      '🌐 Opened in browser - you can now copy the formatted content to Slack!',
    );
  } catch (error) {
    console.log(
      '💡 Open this file in your browser to copy the formatted content:',
    );
    console.log(`   file://${outputPath}`);
  }

  // Print summary
  const totalPRs = repoData.reduce((sum, { prs }) => sum + prs.length, 0);
  console.log(
    `\n📊 Summary: ${totalPRs} open PRs across ${REPOS.length} repositories`,
  );

  repoData.forEach(({ repo, prs }) => {
    console.log(`   ${repo.name}: ${prs.length} PRs`);
  });
}

// Run the script
main().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});
