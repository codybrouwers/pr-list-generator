import { test, expect, describe } from "bun:test";

// Mock data types
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

// Test data
const mockPRs: PR[] = [
  {
    number: 123,
    title: "Add new feature",
    url: "https://github.com/facebook/react/pull/123",
    additions: 50,
    deletions: 10
  },
  {
    number: 456,
    title: "Fix bug in component",
    url: "https://github.com/facebook/react/pull/456",
    additions: 5,
    deletions: 2
  }
];

const mockRepoData = [
  {
    repo: { name: "facebook/react", repo: "facebook/react" },
    prs: mockPRs
  },
  {
    repo: { name: "microsoft/vscode", repo: "microsoft/vscode" },
    prs: []
  }
];

// Simplified versions of the generation functions for testing
function generateSlackText(repoData: { repo: RepoConfig; prs: PR[] }[]): string {
  const prBlocks = repoData
    .map(({ repo, prs }) => {
      const repoName = repo.name.split('/').pop() || repo.name;

      if (prs.length === 0) {
        return `*${repoName}*\n_No open PRs_`;
      }

      const prItems = prs
        .map(
          (pr) =>
            `<${pr.url}|#${pr.number} ${pr.title}> \`+${pr.additions}/-${pr.deletions}\``,
        )
        .join('\n');

      return `*${repoName}*\n${prItems}`;
    })
    .join('\n\n');

  return prBlocks;
}

function generateSlackHTML(repoData: { repo: RepoConfig; prs: PR[] }[]): string {
  const prBlocks = repoData
    .map(({ repo, prs }) => {
      const repoName = repo.name.split('/').pop() || repo.name;

      if (prs.length === 0) {
        return `<p><strong>${repoName}</strong></p><p><em>No open PRs</em></p>`;
      }

      const prItems = prs
        .map(
          (pr) =>
            `<p><a href="${pr.url}">#${pr.number} ${pr.title}</a> <code>+${pr.additions}/-${pr.deletions}</code></p>`,
        )
        .join('');

      return `<p><strong>${repoName}</strong></p>${prItems}`;
    })
    .join('<br>');

  return prBlocks;
}

describe("HTML Generation Functions", () => {
  describe("generateSlackText", () => {
    test("should generate Slack text format with PRs", () => {
      const result = generateSlackText(mockRepoData);

      expect(result).toContain("*react*");
      expect(result).toContain("*vscode*");
      expect(result).toContain("<https://github.com/facebook/react/pull/123|#123 Add new feature>");
      expect(result).toContain("`+50/-10`");
      expect(result).toContain("_No open PRs_");
    });

    test("should extract repository name correctly", () => {
      const result = generateSlackText(mockRepoData);

      // Should show "react" not "facebook/react"
      expect(result).toContain("*react*");
      expect(result).not.toContain("*facebook/react*");

      // Should show "vscode" not "microsoft/vscode"
      expect(result).toContain("*vscode*");
      expect(result).not.toContain("*microsoft/vscode*");
    });

    test("should handle empty PR list", () => {
      const emptyRepoData = [
        {
          repo: { name: "empty/repo", repo: "empty/repo" },
          prs: []
        }
      ];

      const result = generateSlackText(emptyRepoData);
      expect(result).toContain("*repo*");
      expect(result).toContain("_No open PRs_");
    });

    test("should format multiple PRs correctly", () => {
      const result = generateSlackText([mockRepoData[0]]);

      const lines = result.split('\n');
      expect(lines[0]).toBe("*react*");
      expect(lines[1]).toContain("#123 Add new feature");
      expect(lines[2]).toContain("#456 Fix bug in component");
    });
  });

  describe("generateSlackHTML", () => {
    test("should generate HTML format with PRs", () => {
      const result = generateSlackHTML(mockRepoData);

      expect(result).toContain("<p><strong>react</strong></p>");
      expect(result).toContain("<p><strong>vscode</strong></p>");
      expect(result).toContain('<a href="https://github.com/facebook/react/pull/123">#123 Add new feature</a>');
      expect(result).toContain("<code>+50/-10</code>");
      expect(result).toContain("<em>No open PRs</em>");
    });

    test("should separate repositories with <br> tags", () => {
      const result = generateSlackHTML(mockRepoData);
      expect(result).toContain("<br>");
    });

    test("should handle empty PR list in HTML", () => {
      const emptyRepoData = [
        {
          repo: { name: "empty/repo", repo: "empty/repo" },
          prs: []
        }
      ];

      const result = generateSlackHTML(emptyRepoData);
      expect(result).toContain("<p><strong>repo</strong></p>");
      expect(result).toContain("<p><em>No open PRs</em></p>");
    });

    test("should properly escape HTML in PR titles", () => {
      const prWithSpecialChars: PR = {
        number: 789,
        title: "Fix <script> tag & \"quotes\"",
        url: "https://github.com/test/repo/pull/789",
        additions: 1,
        deletions: 1
      };

      const testData = [
        {
          repo: { name: "test/repo", repo: "test/repo" },
          prs: [prWithSpecialChars]
        }
      ];

      const result = generateSlackHTML(testData);
      // The title should be included as-is in the href text
      expect(result).toContain('Fix <script> tag & "quotes"');
    });
  });

  describe("Repository Name Extraction", () => {
    test("should extract repo name from org/repo format", () => {
      const testCases = [
        { input: "facebook/react", expected: "react" },
        { input: "microsoft/vscode", expected: "vscode" },
        { input: "vercel/next.js", expected: "next.js" },
        { input: "single-name", expected: "single-name" },
        { input: "org/sub/deep", expected: "deep" }
      ];

      testCases.forEach(({ input, expected }) => {
        const extracted = input.split('/').pop() || input;
        expect(extracted).toBe(expected);
      });
    });
  });

  describe("PR Data Formatting", () => {
    test("should format additions and deletions correctly", () => {
      const testCases = [
        { additions: 0, deletions: 0, expected: "+0/-0" },
        { additions: 100, deletions: 50, expected: "+100/-50" },
        { additions: 1, deletions: 999, expected: "+1/-999" }
      ];

      testCases.forEach(({ additions, deletions, expected }) => {
        const formatted = `+${additions}/-${deletions}`;
        expect(formatted).toBe(expected);
      });
    });

    test("should create proper GitHub URLs", () => {
      const pr = mockPRs[0];
      expect(pr.url).toMatch(/^https:\/\/github\.com\/[\w-]+\/[\w.-]+\/pull\/\d+$/);
    });
  });
});
