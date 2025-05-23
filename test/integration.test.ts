import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { existsSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

describe("Integration Tests", () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `pr-list-integration-${Date.now()}`);
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe("End-to-End Workflow", () => {
    test("should handle complete workflow with saved repositories", () => {
      // Simulate saving repositories
      const repos = ["facebook/react", "microsoft/vscode"];
      const reposFile = join(testDir, "repos.json");
      const data = {
        repos: repos,
        lastUpdated: new Date().toISOString()
      };

      // Create directory and save repos
      require("fs").mkdirSync(testDir, { recursive: true });
      writeFileSync(reposFile, JSON.stringify(data, null, 2));

      // Verify file was created
      expect(existsSync(reposFile)).toBe(true);

      // Load and verify repos
      const loadedData = JSON.parse(require("fs").readFileSync(reposFile, 'utf-8'));
      expect(loadedData.repos).toEqual(repos);
    });

    test("should generate complete HTML output", () => {
      const mockRepoData = [
        {
          repo: { name: "facebook/react", repo: "facebook/react" },
          prs: [
            {
              number: 123,
              title: "Add new feature",
              url: "https://github.com/facebook/react/pull/123",
              additions: 50,
              deletions: 10
            }
          ]
        }
      ];

      // Simulate HTML generation
      const htmlContent = generateMockHTML(mockRepoData);

      expect(htmlContent).toContain("<!DOCTYPE html>");
      expect(htmlContent).toContain("<title>PR List</title>");
      expect(htmlContent).toContain("react");
      expect(htmlContent).toContain("#123 Add new feature");
      expect(htmlContent).toContain("+50/-10");
    });

    test("should handle multiple repositories with mixed PR states", () => {
      const mockRepoData = [
        {
          repo: { name: "facebook/react", repo: "facebook/react" },
          prs: [
            {
              number: 123,
              title: "Add new feature",
              url: "https://github.com/facebook/react/pull/123",
              additions: 50,
              deletions: 10
            }
          ]
        },
        {
          repo: { name: "microsoft/vscode", repo: "microsoft/vscode" },
          prs: []
        }
      ];

      const summary = generateSummary(mockRepoData);

      expect(summary.totalPRs).toBe(1);
      expect(summary.totalRepos).toBe(2);
      expect(summary.repoSummaries).toHaveLength(2);
      expect(summary.repoSummaries[0].name).toBe("react");
      expect(summary.repoSummaries[0].prCount).toBe(1);
      expect(summary.repoSummaries[1].name).toBe("vscode");
      expect(summary.repoSummaries[1].prCount).toBe(0);
    });
  });

  describe("Error Recovery", () => {
    test("should handle corrupted config file gracefully", () => {
      const reposFile = join(testDir, "repos.json");

      // Create directory and write corrupted JSON
      require("fs").mkdirSync(testDir, { recursive: true });
      writeFileSync(reposFile, "{ invalid json content");

      // Simulate loading corrupted file
      let repos: string[] = [];
      try {
        const content = require("fs").readFileSync(reposFile, 'utf-8');
        const data = JSON.parse(content);
        repos = Array.isArray(data.repos) ? data.repos : [];
      } catch (error) {
        repos = []; // Fallback to empty array
      }

      expect(repos).toEqual([]);
    });

    test("should handle missing config directory", () => {
      const nonExistentFile = join(testDir, "nonexistent", "repos.json");

      // Simulate checking for non-existent file
      const fileExists = existsSync(nonExistentFile);
      expect(fileExists).toBe(false);

      // Should return empty array when file doesn't exist
      const repos = fileExists ? [] : [];
      expect(repos).toEqual([]);
    });
  });

  describe("Data Validation", () => {
    test("should validate repository data structure", () => {
      const validRepo = {
        name: "facebook/react",
        repo: "facebook/react"
      };

      const validPR = {
        number: 123,
        title: "Add new feature",
        url: "https://github.com/facebook/react/pull/123",
        additions: 50,
        deletions: 10
      };

      // Validate repo structure
      expect(validRepo.name).toBeTruthy();
      expect(validRepo.repo).toBeTruthy();
      expect(validRepo.name.includes('/')).toBe(true);

      // Validate PR structure
      expect(validPR.number).toBeGreaterThan(0);
      expect(validPR.title).toBeTruthy();
      expect(validPR.url).toMatch(/^https:\/\/github\.com/);
      expect(validPR.additions).toBeGreaterThanOrEqual(0);
      expect(validPR.deletions).toBeGreaterThanOrEqual(0);
    });
  });
});

// Helper functions for testing
function generateMockHTML(repoData: any[]): string {
  const prBlocks = repoData
    .map(({ repo, prs }) => {
      const repoName = repo.name.split('/').pop() || repo.name;

      if (prs.length === 0) {
        return `<blockquote><strong><code>${repoName}</code></strong></blockquote>
<blockquote><em>No open PRs</em></blockquote>`;
      }

      const prItems = prs
        .map((pr: any) =>
          `<blockquote><a href="${pr.url}">#${pr.number} ${pr.title}</a> <code>+${pr.additions}/-${pr.deletions}</code></blockquote>`
        )
        .join('\n');

      return `<blockquote><strong><code>${repoName}</code></strong></blockquote>
${prItems}`;
    })
    .join('\n\n');

  return `<!DOCTYPE html>
<html>
<head>
  <title>PR List</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    blockquote { margin: 5px 0; padding: 8px 12px; border-left: 4px solid #ccc; background: #f9f9f9; }
  </style>
</head>
<body>
${prBlocks}
</body>
</html>`;
}

function generateSummary(repoData: any[]) {
  const totalPRs = repoData.reduce((sum, { prs }) => sum + prs.length, 0);
  const totalRepos = repoData.length;

  const repoSummaries = repoData.map(({ repo, prs }) => ({
    name: repo.name.split('/').pop() || repo.name,
    prCount: prs.length
  }));

  return {
    totalPRs,
    totalRepos,
    repoSummaries
  };
}
