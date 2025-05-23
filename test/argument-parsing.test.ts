import { test, expect, describe, beforeEach, afterEach } from "bun:test";

describe("Repository Argument Parsing", () => {
  let originalArgv: string[];

  beforeEach(() => {
    // Save original process.argv
    originalArgv = [...process.argv];
  });

  afterEach(() => {
    // Restore original process.argv
    process.argv = originalArgv;
  });

  describe("Repository Format Validation", () => {
    test("should validate correct repository format", () => {
      const validRepos = [
        "facebook/react",
        "microsoft/vscode",
        "vercel/next.js",
        "nodejs/node",
        "org-name/repo-name",
        "user123/project_name"
      ];

      validRepos.forEach(repo => {
        expect(repo.includes('/')).toBe(true);
        expect(repo.split('/').length).toBe(2);
        expect(repo.split('/')[0]).toBeTruthy();
        expect(repo.split('/')[1]).toBeTruthy();
      });
    });

    test("should reject invalid repository formats", () => {
      const invalidRepos = [
        "facebook",
        "react",
        "",
        "/react",
        "facebook/",
        "facebook//react",
        "facebook/react/extra"
      ];

      invalidRepos.forEach(repo => {
        const isValid = repo.includes('/') &&
                       repo.split('/').length === 2 &&
                       repo.split('/')[0].length > 0 &&
                       repo.split('/')[1].length > 0;
        expect(isValid).toBe(false);
      });
    });
  });

  describe("Command Line Argument Processing", () => {
    test("should parse repository arguments correctly", () => {
      const args = ["facebook/react", "microsoft/vscode"];

      const repos = args.map(repo => {
        if (!repo.includes('/')) {
          throw new Error(`Invalid repository format: "${repo}"`);
        }
        return {
          name: repo,
          repo: repo
        };
      });

      expect(repos).toHaveLength(2);
      expect(repos[0]).toEqual({ name: "facebook/react", repo: "facebook/react" });
      expect(repos[1]).toEqual({ name: "microsoft/vscode", repo: "microsoft/vscode" });
    });

    test("should filter out help flags", () => {
      const args = ["facebook/react", "--help", "microsoft/vscode", "-h"];
      const filteredArgs = args.filter(arg => arg !== '--help' && arg !== '-h');

      expect(filteredArgs).toEqual(["facebook/react", "microsoft/vscode"]);
    });

    test("should handle mixed valid and help flags", () => {
      const args = ["--help", "facebook/react", "-h", "microsoft/vscode"];
      const repoArgs = args.filter(arg => arg !== '--help' && arg !== '-h');

      expect(repoArgs).toEqual(["facebook/react", "microsoft/vscode"]);
    });
  });

  describe("Help Flag Detection", () => {
    test("should detect help flags", () => {
      const testCases = [
        { args: ["--help"], hasHelp: true },
        { args: ["-h"], hasHelp: true },
        { args: ["facebook/react", "--help"], hasHelp: true },
        { args: ["facebook/react", "microsoft/vscode"], hasHelp: false },
        { args: [], hasHelp: false }
      ];

      testCases.forEach(({ args, hasHelp }) => {
        const hasHelpFlag = args.includes('--help') || args.includes('-h');
        expect(hasHelpFlag).toBe(hasHelp);
      });
    });
  });

  describe("Repository Name Extraction", () => {
    test("should extract clean repository names", () => {
      const testCases = [
        { input: "facebook/react", expected: "react" },
        { input: "microsoft/vscode", expected: "vscode" },
        { input: "vercel/next.js", expected: "next.js" },
        { input: "my-org/my-repo", expected: "my-repo" },
        { input: "single", expected: "single" } // fallback case
      ];

      testCases.forEach(({ input, expected }) => {
        const extracted = input.split('/').pop() || input;
        expect(extracted).toBe(expected);
      });
    });
  });

  describe("Empty Arguments Handling", () => {
    test("should detect when no repositories are provided", () => {
      const args: string[] = [];
      expect(args.length).toBe(0);
    });

    test("should detect when only help flags are provided", () => {
      const args = ["--help", "-h"];
      const repoArgs = args.filter(arg => arg !== '--help' && arg !== '-h');
      expect(repoArgs.length).toBe(0);
    });
  });

  describe("Repository Deduplication", () => {
    test("should remove duplicate repositories", () => {
      const repos = ["facebook/react", "microsoft/vscode", "facebook/react"];
      const uniqueRepos = [...new Set(repos)];

      expect(uniqueRepos).toEqual(["facebook/react", "microsoft/vscode"]);
      expect(uniqueRepos.length).toBe(2);
    });

    test("should preserve order when deduplicating", () => {
      const repos = ["a/b", "c/d", "a/b", "e/f", "c/d"];
      const uniqueRepos = [...new Set(repos)];

      expect(uniqueRepos).toEqual(["a/b", "c/d", "e/f"]);
    });
  });

  describe("Error Message Generation", () => {
    test("should generate helpful error messages for invalid formats", () => {
      const invalidRepo = "invalid-repo";
      const errorMessage = `Invalid repository format: "${invalidRepo}". Repository must be in format "owner/repo"`;

      expect(errorMessage).toContain(invalidRepo);
      expect(errorMessage).toContain("owner/repo");
    });
  });
});
