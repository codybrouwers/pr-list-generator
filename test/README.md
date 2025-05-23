# Test Suite Documentation

This directory contains the comprehensive test suite for the PR List Generator.

## Test Structure

### Test Files

- **`storage.test.ts`** - Tests for XDG path utilities and repository storage
  - XDG Base Directory compliance
  - JSON file persistence
  - Error handling for corrupted files
  - Repository deduplication

- **`html-generation.test.ts`** - Tests for HTML and Slack formatting
  - Slack text format generation
  - HTML format generation
  - Repository name extraction
  - PR data formatting

- **`argument-parsing.test.ts`** - Tests for command-line argument processing
  - Repository format validation
  - Help flag detection
  - Argument filtering and parsing
  - Error message generation

- **`github-api.test.ts`** - Tests for GitHub API integration
  - Authentication testing with mocks
  - PR fetching and filtering
  - Error handling (rate limits, network errors)
  - Data transformation

- **`integration.test.ts`** - End-to-end workflow tests
  - Complete workflow simulation
  - Error recovery scenarios
  - Data validation

## Test Patterns

### Using Bun Test

```typescript
import { test, expect, describe, beforeEach, afterEach, mock } from "bun:test";

describe("Feature Name", () => {
  beforeEach(() => {
    // Setup before each test
  });

  afterEach(() => {
    // Cleanup after each test
  });

  test("should do something", () => {
    expect(result).toBe(expected);
  });
});
```

### Mocking

```typescript
// Mock functions
const mockFunction = mock(() => "mocked result");

// Mock API responses
const mockOctokit = {
  rest: {
    pulls: {
      list: mock(() => Promise.resolve({ data: [] }))
    }
  }
};
```

### File System Testing

```typescript
import { existsSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

// Create temporary files for testing
const testFile = join(tmpdir(), `test-${Date.now()}.json`);

// Always clean up in afterEach
afterEach(() => {
  if (existsSync(testFile)) {
    rmSync(testFile, { force: true });
  }
});
```

## Adding New Tests

1. **Create a new test file** following the naming convention: `feature.test.ts`

2. **Import required testing utilities**:
   ```typescript
   import { test, expect, describe, beforeEach, afterEach } from "bun:test";
   ```

3. **Structure your tests** with `describe` blocks for organization

4. **Use `beforeEach`/`afterEach`** for setup and cleanup

5. **Mock external dependencies** to isolate units under test

6. **Test both success and error scenarios**

## Running Tests

```bash
# Run all tests
bun test

# Run specific test file
bun test test/storage.test.ts

# Run tests in watch mode
bun test --watch

# Run with coverage
bun test --coverage

# Run tests matching a pattern
bun test --test-name-pattern "storage"
```

## Test Configuration

Tests are configured in `bunfig.toml`:

```toml
[test]
coverage = true
coverageSkipTestFiles = true
```

## Best Practices

1. **Test one thing at a time** - Each test should verify a single behavior
2. **Use descriptive test names** - Test names should clearly describe what is being tested
3. **Clean up resources** - Always clean up temporary files, mocks, etc.
4. **Test error conditions** - Don't just test the happy path
5. **Use mocks for external dependencies** - Don't make real API calls in tests
6. **Keep tests fast** - Tests should run quickly to encourage frequent execution
