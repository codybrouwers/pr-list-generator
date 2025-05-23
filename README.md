# PR List Generator

A TypeScript CLI tool that fetches your open pull requests from GitHub and generates a nicely formatted HTML file that you can copy and paste into Slack.

## Example Output in Slack

The generated content looks like this in Slack:

![CleanShot 2025-05-22 at 23 34 27@2x](https://github.com/user-attachments/assets/4340108c-5654-4ca2-af1f-c70f858e1a4e)

## Prerequisites

- [Bun](https://bun.sh/) installed
- GitHub authentication (see [Authentication](#authentication) section below)

## Installation

```bash
# Clone the repository
git clone https://github.com/codybrouwers/pr-list-generator.git
cd pr-list-generator

# Install dependencies
bun install

# Link for global usage (optional)
bun link
```

After linking, you can use `pr-list` command from anywhere, or use `bun run start` locally.

## Usage

```bash
# Using the linked command (after bun link)
pr-list facebook/react
pr-list microsoft/vscode vercel/next.js facebook/react
pr-list your-org/repo1 your-org/repo2

# Or using bun run start
bun run start facebook/react
bun run start microsoft/vscode vercel/next.js facebook/react
```

### How it works

The tool automatically:
1. **Fetches your PRs** from the specified repositories
2. **Generates formatted HTML** with rich styling
3. **Launches a headless browser** (in parallel with API requests for speed)
4. **Copies rich content** directly to your clipboard using browser automation
5. **Ready to paste** into Slack with full formatting preserved

## Authentication

The script supports multiple authentication methods (in order of priority):

### Option 1: GitHub CLI (Recommended - Easiest)
If you already have GitHub CLI installed and authenticated:

```bash
# Check if you're already authenticated
gh auth status

# If not authenticated, login
gh auth login

# Then use the tool
pr-list your-org/repo
```

The script will automatically use your GitHub CLI token.

### Option 2: Environment Variable
```bash
# Set environment variable
export GITHUB_TOKEN="your_token_here"

# Then use the tool
pr-list your-org/repo
```

### Option 3: Manual Token Setup
1. Create a token at: https://github.com/settings/tokens/new
2. Select scopes: `repo` and `read:user`
3. Set as environment variable:
```bash
echo 'export GITHUB_TOKEN="your_token_here"' >> ~/.zshrc
source ~/.zshrc
```

## What it does

1. **Fetches PRs**: Gets all your open pull requests from the specified repositories
2. **Generates HTML**: Creates formatted HTML content with:
   - Repository names as headers (just the repo name, not org/repo)
   - Clickable PR links
   - Change statistics (+additions/-deletions)
3. **Browser automation**: Launches a headless browser in parallel with API requests
4. **Clipboard copying**: Automatically copies rich HTML content to your clipboard
5. **Slack-ready**: Paste directly into Slack with full formatting preserved

## Examples

```bash
# Check your PRs in popular open source projects
pr-list facebook/react microsoft/vscode

# Check your PRs in your company's repositories
pr-list mycompany/frontend mycompany/backend mycompany/mobile

# Check a single repository
pr-list vercel/next.js

# Get help
pr-list --help
```

## Features

- ✅ Simple CLI with `pr-list` command
- ✅ Multiple authentication methods (GitHub CLI, env vars, manual tokens)
- ✅ Automatic repository name extraction (removes org prefix)
- ✅ Command-line arguments for repository specification
- ✅ Error handling and helpful error messages
- ✅ Summary statistics
- ✅ **Playwright-powered browser automation** with parallel initialization
- ✅ **Automatic clipboard copying** with rich HTML formatting
- ✅ **Slack-ready formatting** - paste directly with full styling
- ✅ Change statistics (+additions/-deletions)
- ✅ Built with Bun for fast performance

## Troubleshooting

- **"No repositories specified"**: Make sure to pass repository names as arguments
- **"Invalid repository format"**: Repository names must be in "owner/repo" format
- **"GitHub token not found"**: Set up authentication using one of the methods above
- **"Authentication failed"**: Check that your token has the correct permissions
- **"No open PRs found"**: Check that you have open PRs in the specified repositories
