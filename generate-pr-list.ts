#!/usr/bin/env bun

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import { $ } from 'bun';
import { Octokit } from 'octokit';
import { type Browser, chromium } from 'playwright';
import prompts from 'prompts';
import stripIndent from 'strip-indent';

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

// XDG Base Directory utilities
function getXDGConfigHome(): string {
  return process.env.XDG_CONFIG_HOME || join(homedir(), '.config');
}

function getConfigDir(): string {
  const configDir = join(getXDGConfigHome(), 'pr-list-generator');
  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true });
  }
  return configDir;
}

function getReposFilePath(): string {
  return join(getConfigDir(), 'repos.json');
}

// Repository storage functions
function loadSavedRepos(): string[] {
  const reposFile = getReposFilePath();
  if (!existsSync(reposFile)) {
    return [];
  }

  try {
    const content = readFileSync(reposFile, 'utf-8');
    const data = JSON.parse(content);
    return Array.isArray(data.repos) ? data.repos : [];
  } catch (error) {
    console.warn('Warning: Could not read saved repositories file');
    return [];
  }
}

function saveRepos(repos: string[]): void {
  const reposFile = getReposFilePath();
  const data = {
    repos: [...new Set(repos)], // Remove duplicates
    lastUpdated: new Date().toISOString(),
  };

  try {
    writeFileSync(reposFile, JSON.stringify(data, null, 2));
  } catch (error) {
    console.warn('Warning: Could not save repositories to file');
  }
}

// Interactive repository selection
async function selectRepositories(): Promise<string[]> {
  const savedRepos = loadSavedRepos();

  if (savedRepos.length === 0) {
    console.log('No previously saved repositories found.');
    return await promptForNewRepos();
  }

  console.log(`Found ${savedRepos.length} previously used repositories:`);
  savedRepos.forEach((repo, index) => {
    console.log(`  ${index + 1}. ${repo}`);
  });
  console.log('');

  const { action } = await prompts({
    type: 'select',
    name: 'action',
    message: 'What would you like to do?',
    choices: [
      { title: 'Select from saved repositories', value: 'select' },
      { title: 'Add new repositories', value: 'add' },
      { title: 'Use all saved repositories', value: 'all' },
    ],
  });

  if (!action) {
    console.log('Operation cancelled.');
    process.exit(0);
  }

  switch (action) {
    case 'all':
      return savedRepos;

    case 'select':
      return await selectFromSavedRepos(savedRepos);

    case 'add': {
      const newRepos = await promptForNewRepos();
      const allRepos = [...savedRepos, ...newRepos];
      saveRepos(allRepos);
      return newRepos;
    }

    default:
      return savedRepos;
  }
}

async function selectFromSavedRepos(savedRepos: string[]): Promise<string[]> {
  const { selectedRepos } = await prompts({
    type: 'multiselect',
    name: 'selectedRepos',
    message: 'Select repositories to fetch PRs from:',
    choices: savedRepos.map((repo) => ({
      title: repo,
      value: repo,
      selected: true, // Default to all selected
    })),
    hint: '- Space to select. Return to submit',
  });

  if (!selectedRepos || selectedRepos.length === 0) {
    console.log('No repositories selected.');
    process.exit(0);
  }

  // Ask if they want to add more repositories
  const { addMore } = await prompts({
    type: 'confirm',
    name: 'addMore',
    message: 'Would you like to add more repositories?',
    initial: false,
  });

  if (addMore) {
    const newRepos = await promptForNewRepos();
    const allRepos = [...savedRepos, ...newRepos];
    saveRepos(allRepos);
    return [...selectedRepos, ...newRepos];
  }

  return selectedRepos;
}

async function promptForNewRepos(): Promise<string[]> {
  const repos: string[] = [];

  while (true) {
    const { repo } = await prompts({
      type: 'text',
      name: 'repo',
      message:
        repos.length === 0
          ? 'Enter repository (owner/repo format):'
          : 'Enter another repository (or press Enter to finish):',
      validate: (value: string) => {
        if (repos.length > 0 && !value.trim()) {
          return true; // Allow empty to finish
        }
        if (!value.includes('/')) {
          return 'Repository must be in format "owner/repo"';
        }
        return true;
      },
    });

    if (!repo || !repo.trim()) {
      break;
    }

    repos.push(repo.trim());
    console.log(`Added: ${repo.trim()}`);
  }

  if (repos.length === 0) {
    console.log('No repositories entered.');
    process.exit(0);
  }

  return repos;
}

// Parse command line arguments to get repository names
async function parseRepoArgs(): Promise<RepoConfig[]> {
  const args = process.argv.slice(2);

  // If no arguments provided, use interactive selection
  if (args.length === 0) {
    const selectedRepos = await selectRepositories();
    return selectedRepos.map((repo) => ({
      name: repo,
      repo: repo,
    }));
  }

  // Handle help flags
  if (args.includes('--help') || args.includes('-h')) {
    console.log('PR List Generator - Fetch your open pull requests from GitHub');
    console.log('');
    console.log('Usage: pr-list [repo1] [repo2] ...');
    console.log('   or: bun run start [repo1] [repo2] ...');
    console.log('');
    console.log('Examples:');
    console.log('  pr-list facebook/react');
    console.log('  pr-list microsoft/vscode vercel/next.js');
    console.log('  pr-list your-org/repo1 your-org/repo2');
    console.log('  pr-list  # Interactive mode with saved repositories');
    console.log('');
    console.log('Authentication:');
    console.log('  Set GITHUB_TOKEN environment variable or use gh CLI (gh auth login)');
    console.log('');
    console.log('Repository Storage:');
    console.log('  Repositories are automatically saved to ~/.config/pr-list-generator/repos.json');
    console.log('  When no repositories are specified, you can select from previously used ones');
    process.exit(0);
  }

  // Filter out help flags for repository validation
  const repoArgs = args.filter((arg) => arg !== '--help' && arg !== '-h');

  // Validate command line arguments
  const repos = repoArgs.map((repo) => {
    if (!repo.includes('/')) {
      console.error(`❌ Invalid repository format: "${repo}"`);
      console.error('   Repository must be in format "owner/repo"');
      process.exit(1);
    }

    return {
      name: repo,
      repo: repo,
    };
  });

  // Save the provided repositories for future use
  const repoNames = repos.map((r) => r.name);
  const savedRepos = loadSavedRepos();
  const allRepos = [...new Set([...savedRepos, ...repoNames])]; // Merge and deduplicate
  saveRepos(allRepos);
  console.log(`💾 Saved ${repoNames.length} repositories for future use`);

  return repos;
}

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
    }
    console.log('⚠️  gh CLI token command returned empty');
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

    // Validate that we have both owner and repo name
    if (!owner || !repoName) {
      console.error(`Invalid repository format: ${repo}. Expected format: owner/repo`);
      return [];
    }

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
    const userPRs = prs.filter((pr) => pr.user?.login === user.login);

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

function generateSlackText(repoData: { repo: RepoConfig; prs: PR[] }[]): string {
  const prBlocks = repoData
    .map(({ repo, prs }) => {
      // Extract just the repo name (everything after the last '/')
      const repoName = repo.name.split('/').pop() || repo.name;

      if (prs.length === 0) {
        return `*${repoName}*\n_No open PRs_`;
      }

      const prItems = prs
        .map((pr) => `<${pr.url}|#${pr.number} ${pr.title}> \`+${pr.additions}/-${pr.deletions}\``)
        .join('\n');

      return `*${repoName}*\n${prItems}`;
    })
    .join('\n\n');

  return prBlocks;
}

function generateSlackHTML(repoData: { repo: RepoConfig; prs: PR[] }[]): string {
  const prBlocks = repoData
    .map(({ repo, prs }) => {
      // Extract just the repo name (everything after the last '/')
      const repoName = repo.name.split('/').pop() || repo.name;

      if (prs.length === 0) {
        return `<p><strong>${repoName}</strong></p><p><em>No open PRs</em></p>`;
      }

      const prItems = prs
        .map(
          (pr) =>
            `<p><a href="${pr.url}">#${pr.number} ${pr.title}</a> <code>+${pr.additions}/-${pr.deletions}</code></p>`
        )
        .join('');

      return `<p><strong>${repoName}</strong></p>${prItems}`;
    })
    .join('<br>');

  return prBlocks;
}

function generateHTML(repoData: { repo: RepoConfig; prs: PR[] }[]): string {
  const prBlocks = repoData
    .map(({ repo, prs }) => {
      // Extract just the repo name (everything after the last '/')
      const repoName = repo.name.split('/').pop() || repo.name;

      if (prs.length === 0) {
        return stripIndent(`
          <blockquote><strong><code>${repoName}</code></strong></blockquote>
          <blockquote><em>No open PRs</em></blockquote>
        `);
      }

      const prItems = prs
        .map(
          (pr) =>
            `<blockquote><a href="${pr.url}">#${pr.number} ${pr.title}</a> <code>+${pr.additions}/-${pr.deletions}</code></blockquote>`
        )
        .join('\n');

      return stripIndent(`
        <blockquote><strong><code>${repoName}</code></strong></blockquote>
        ${prItems}
      `);
    })
    .join('\n\n');

  return stripIndent(`
    <!DOCTYPE html>
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

    </html>
  `);
}

// Function to copy content from browser using Playwright
async function copyFromBrowser(htmlPath: string, browser: Browser): Promise<void> {
  const context = await browser.newContext();
  const page = await context.newPage();

  // Navigate to the HTML file
  await page.goto(`file://${htmlPath}`);

  // Wait for content to load
  await page.waitForLoadState('networkidle');

  // Wait a moment for the page to fully render
  await page.waitForTimeout(50);

  // Select all content and copy
  await page.keyboard.press('Meta+a'); // Select all
  await page.keyboard.press('Meta+c'); // Copy

  // Wait a moment for clipboard to update
  await page.waitForTimeout(50);

  await context.close();
}

async function main() {
  console.log('🔍 Fetching your open pull requests...');

  // Parse repository arguments (interactive or command line)
  const repos = await parseRepoArgs();

  // Start browser initialization early (in parallel with API setup)
  const browserPromise = chromium.launch({
    headless: false,
    args: [
      '--no-first-run',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      '--disable-extensions',
      '--disable-plugins',
      '--disable-web-security',
      '--disable-features=TranslateUI',
      '--no-default-browser-check',
      '--disable-default-apps',
    ],
  });

  const [octokit, browser] = await Promise.all([createOctokit(), browserPromise]);

  // Verify authentication
  try {
    const { data: user } = await octokit.rest.users.getAuthenticated();
    console.log(`✅ Authenticated as: ${user.login}`);
  } catch (error) {
    console.error('❌ Authentication failed. Please check your GitHub token.');
    process.exit(1);
  }

  // Fetch PRs for all repos (while browser is launching in background)
  const repoData = await Promise.all(
    repos.map(async (repo) => ({
      repo,
      prs: await fetchPRsForRepo(octokit, repo.repo),
    }))
  );

  // Generate HTML
  const html = generateHTML(repoData);

  // Write to temporary file
  const outputPath = join(tmpdir(), 'pr_list.html');
  writeFileSync(outputPath, html);

  // Copy to clipboard using the browser we started earlier
  console.log('📝 Generated PR list');

  try {
    await copyFromBrowser(outputPath, browser);
    await browser.close(); // Close browser after copying

    console.log('📋 Copied rich content to clipboard using browser automation!');
    console.log('💡 You can now paste it directly into Slack with full formatting');
  } catch (error) {
    console.log('❌ Failed to copy using browser automation:', error);
    console.log(`💡 Fallback: open this file manually: file://${outputPath}`);
  }

  // Print summary
  const totalPRs = repoData.reduce((sum, { prs }) => sum + prs.length, 0);
  console.log(`\n📊 Summary: ${totalPRs} open PRs across ${repos.length} repositories`);

  for (const { repo, prs } of repoData) {
    const repoName = repo.name.split('/').pop() || repo.name;
    console.log(`   ${repoName}: ${prs.length} PRs`);
  }
}

// Run the script
main().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});
