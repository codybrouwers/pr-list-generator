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

### Command Line Mode
```bash
# Using the linked command (after bun link)
pr-list facebook/react
pr-list microsoft/vscode vercel/next.js facebook/react
pr-list your-org/repo1 your-org/repo2

# Or using bun run start
bun run start facebook/react
bun run start microsoft/vscode vercel/next.js facebook/react
```

### Interactive Mode
```bash
# Run without arguments for interactive mode
pr-list

# Or
bun run start
```

When you run the command without arguments, you'll get an interactive interface that:
- Shows previously used repositories (if any)
- Lets you select which repositories to check
- Allows you to add new repositories
- Automatically saves repositories for future use

### Repository Storage

Repositories are automatically saved to your XDG config directory:
- **macOS/Linux**: `~/.config/pr-list-generator/repos.json`
- **Windows**: `%APPDATA%/pr-list-generator/repos.json`

This means:
- ✅ **First time**: Enter repositories via command line or interactive mode
- ✅ **Future runs**: Just run `pr-list` and select from saved repositories
- ✅ **Add more**: Easily add new repositories through the interactive interface
- ✅ **Mix and match**: Select any combination of saved repositories

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
# Interactive mode - select from saved repositories
pr-list

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

- ✅ **Interactive repository selection** with saved repository management
- ✅ **XDG Base Directory** compliant configuration storage
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
- ✅ **Comprehensive test suite** with 51 tests covering all major functionality

## Testing

This project includes a comprehensive test suite built with Bun's native test runner:

```bash
# Run all tests
bun test

# Run tests in watch mode
bun test --watch

# Run tests with coverage
bun test --coverage

# Run specific test files
bun test test/storage.test.ts
bun test test/html-generation.test.ts
```

### Test Coverage

The test suite includes **51 tests** across **5 test files**:

- **`test/storage.test.ts`** - XDG path utilities and repository storage
- **`test/html-generation.test.ts`** - HTML/Slack formatting functions
- **`test/argument-parsing.test.ts`** - Command-line argument parsing and validation
- **`test/github-api.test.ts`** - GitHub API integration with mocks
- **`test/integration.test.ts`** - End-to-end workflow testing

### Test Categories

- **Unit Tests**: Individual function testing with isolated inputs/outputs
- **Integration Tests**: End-to-end workflow testing
- **Error Handling**: Graceful failure and recovery scenarios
- **Mock Testing**: GitHub API interactions without real API calls
- **File System**: XDG config storage and JSON persistence
- **Data Validation**: Repository format validation and data transformation

### Running Tests

Tests are configured to run automatically with:
- Automatic cleanup of temporary files
- Mock GitHub API responses
- Isolated test environments
- Comprehensive error scenario coverage

## Troubleshooting

- **"No repositories specified"**: Make sure to pass repository names as arguments
- **"Invalid repository format"**: Repository names must be in "owner/repo" format
- **"GitHub token not found"**: Set up authentication using one of the methods above
- **"Authentication failed"**: Check that your token has the correct permissions
- **"No open PRs found"**: Check that you have open PRs in the specified repositories
