# GitHub Token Setup

This PR list generator automatically handles GitHub authentication in multiple ways.

## Authentication Options (in order of priority)

### Option 1: Environment Variable (Recommended for CI/CD)
```bash
export GITHUB_TOKEN="your_token_here"
# or
export GH_TOKEN="your_token_here"
```

### Option 2: GitHub CLI (Easiest for local development)
If you already have `gh` CLI authenticated, the script will automatically use that token:

```bash
# Check if you're already authenticated
gh auth status

# If not authenticated, login
gh auth login
```

### Option 3: Manual Token Setup
1. **Create a token**: Go to https://github.com/settings/tokens/new
2. **Set permissions**: Select these scopes:
   - `repo` (Full control of private repositories)
   - `read:user` (Read access to user profile)
3. **Set as environment variable**:

```bash
# Add to your shell profile (~/.zshrc, ~/.bashrc, etc.)
echo 'export GITHUB_TOKEN="your_token_here"' >> ~/.zshrc
source ~/.zshrc
```

## Run the script

```bash
bun run start
```

The script will automatically:
1. ✅ Try environment variables first
2. ✅ Fall back to `gh auth token` if available
3. ❌ Show helpful error message if neither works

## Benefits over gh CLI

- **Faster**: Direct API calls vs CLI subprocess
- **Better error handling**: Structured error responses
- **More reliable**: No dependency on external CLI tool for core functionality
- **Programmatic**: Easy to extend and customize
- **Rate limiting**: Built-in GitHub API rate limit handling
- **Pagination**: Automatic handling of large result sets
- **Detailed PR info**: Fetches additions/deletions for each PR
