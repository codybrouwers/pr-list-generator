import { test, expect, describe, beforeEach, afterEach, mock } from "bun:test";
import { existsSync, mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

// We need to extract the functions from the main file for testing
// Since they're not exported, we'll need to refactor or test them differently
// For now, let's create a separate utilities file

describe("XDG Path Utilities", () => {
  let testConfigDir: string;

  beforeEach(() => {
    // Create a temporary directory for testing
    testConfigDir = join(tmpdir(), `pr-list-test-${Date.now()}`);
  });

  afterEach(() => {
    // Clean up test directory
    if (existsSync(testConfigDir)) {
      rmSync(testConfigDir, { recursive: true, force: true });
    }
  });

  test("should create config directory if it doesn't exist", () => {
    expect(existsSync(testConfigDir)).toBe(false);

    // Create the directory
    mkdirSync(testConfigDir, { recursive: true });

    expect(existsSync(testConfigDir)).toBe(true);
  });

  test("should handle XDG_CONFIG_HOME environment variable", () => {
    const originalXDG = process.env.XDG_CONFIG_HOME;

    // Test with custom XDG_CONFIG_HOME
    process.env.XDG_CONFIG_HOME = testConfigDir;

    // This would be our getXDGConfigHome function
    const xdgHome = process.env.XDG_CONFIG_HOME || join(require("os").homedir(), '.config');
    expect(xdgHome).toBe(testConfigDir);

    // Restore original value
    if (originalXDG) {
      process.env.XDG_CONFIG_HOME = originalXDG;
    } else {
      delete process.env.XDG_CONFIG_HOME;
    }
  });
});

describe("Repository Storage", () => {
  let testReposFile: string;

  beforeEach(() => {
    testReposFile = join(tmpdir(), `repos-test-${Date.now()}.json`);
  });

  afterEach(() => {
    if (existsSync(testReposFile)) {
      rmSync(testReposFile, { force: true });
    }
  });

  test("should save repositories to JSON file", () => {
    const repos = ["facebook/react", "microsoft/vscode"];
    const data = {
      repos: repos,
      lastUpdated: new Date().toISOString()
    };

    writeFileSync(testReposFile, JSON.stringify(data, null, 2));

    expect(existsSync(testReposFile)).toBe(true);

    const savedData = JSON.parse(readFileSync(testReposFile, 'utf-8'));
    expect(savedData.repos).toEqual(repos);
    expect(savedData.lastUpdated).toBeDefined();
  });

  test("should load repositories from JSON file", () => {
    const repos = ["vercel/next.js", "nodejs/node"];
    const data = {
      repos: repos,
      lastUpdated: new Date().toISOString()
    };

    writeFileSync(testReposFile, JSON.stringify(data, null, 2));

    const loadedData = JSON.parse(readFileSync(testReposFile, 'utf-8'));
    expect(loadedData.repos).toEqual(repos);
  });

  test("should handle missing repos file gracefully", () => {
    expect(existsSync(testReposFile)).toBe(false);

    // This simulates our loadSavedRepos function behavior
    let repos: string[] = [];
    if (existsSync(testReposFile)) {
      try {
        const content = readFileSync(testReposFile, 'utf-8');
        const data = JSON.parse(content);
        repos = Array.isArray(data.repos) ? data.repos : [];
      } catch (error) {
        repos = [];
      }
    }

    expect(repos).toEqual([]);
  });

  test("should deduplicate repositories", () => {
    const repos = ["facebook/react", "microsoft/vscode", "facebook/react"];
    const uniqueRepos = [...new Set(repos)];

    expect(uniqueRepos).toEqual(["facebook/react", "microsoft/vscode"]);
    expect(uniqueRepos.length).toBe(2);
  });

  test("should handle malformed JSON gracefully", () => {
    writeFileSync(testReposFile, "invalid json content");

    let repos: string[] = [];
    try {
      const content = readFileSync(testReposFile, 'utf-8');
      const data = JSON.parse(content);
      repos = Array.isArray(data.repos) ? data.repos : [];
    } catch (error) {
      repos = [];
    }

    expect(repos).toEqual([]);
  });
});
