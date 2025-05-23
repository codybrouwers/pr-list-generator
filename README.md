# PR List Generator

A TypeScript script that fetches your open pull requests from GitHub and generates a nicely formatted HTML file that you can copy and paste into Slack.

## Prerequisites

- [Bun](https://bun.sh/) installed
- [GitHub CLI](https://cli.github.com/) installed and authenticated (`gh auth login`)

## Installation

The project is located at `~/Projects/pr-list-generator/` with a global command `pr-list` available from anywhere.

## Usage

Run the command from anywhere:

```bash
pr-list
```

Or run the script directly:

```bash
bun ~/Projects/pr-list-generator/generate-pr-list.ts
```

## What it does

1. **Fetches PRs**: Gets all your open pull requests from the configured repositories
2. **Generates HTML**: Creates a formatted HTML file with:
   - Repository names as headers
   - Clickable PR links
   - Change statistics (+additions/-deletions)
   - Slack-friendly formatting
3. **Opens in browser**: Automatically opens the HTML file in your default browser
4. **Copy to Slack**: You can then copy the formatted content directly from the browser and paste it into Slack

## Configuration

Edit the `REPOS` array in `generate-pr-list.ts` to add/remove repositories:

```typescript
const REPOS: RepoConfig[] = [
  { name: "vercel/front", repo: "vercel/front" },
  { name: "vercel/api", repo: "vercel/api" },
  // Add more repos here
];
```

## Output Format

The generated content looks like this in Slack:

**vercel/front**

> #46195 CIFEAT-252 - Update get rolling release endpoint `+1/-1`
> #46192 CIFEAT-265 - Send canary deployment ID to endpoint `+32/-7`

**vercel/api**

> #41867 Remove the `/rolling-release/delete` endpoint `+0/-391`

## Project Structure

```
~/Projects/pr-list-generator/
├── generate-pr-list.ts    # Main TypeScript script
├── pr-list               # Global command wrapper
└── README.md             # This file
```

The `pr-list` command is symlinked to `~/.local/bin/pr-list` for global access.

## Features

- ✅ Accessibility options enabled for GitHub CLI
- ✅ Error handling for missing authentication
- ✅ Summary statistics
- ✅ Automatic browser opening
- ✅ Clean, Slack-friendly formatting
- ✅ Change statistics (+additions/-deletions)
- ✅ Global command available from anywhere

## Troubleshooting

- **"GitHub CLI is not authenticated"**: Run `gh auth login` first
- **"No open PRs found"**: Check that you have open PRs in the configured repositories
- **"Command not found: pr-list"**: Make sure `~/.local/bin` is in your PATH
- **Script won't run**: Make sure Bun is installed and the script is executable
