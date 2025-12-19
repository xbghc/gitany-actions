/**
 * Git command builder helper
 */
export class GitCommandBuilder {
  /**
   * Configure git credentials to use GITCODE_TOKEN environment variable.
   * This command should be run in a shell where GITCODE_TOKEN is available.
   */
  static configureCredentials(): string {
    return `if [ -n "$GITCODE_TOKEN" ]; then git config --global url."https://oauth2:$GITCODE_TOKEN@gitcode.com".insteadOf "https://gitcode.com"; fi`;
  }

  /**
   * Clone a repository.
   * @param url The repository URL.
   * @param path The target path.
   */
  static clone(url: string, path: string): string {
    return `git clone ${url} ${path}`;
  }

  /**
   * Fetch a Pull Request.
   * @param pr The PR number.
   */
  static fetchPr(pr: number): string {
    return `git fetch origin pull/${pr}/head:pr-${pr}`;
  }

  /**
   * Checkout a reference (branch, tag, or commit SHA).
   * @param ref The reference to checkout.
   */
  static checkout(ref: string): string {
    return `git checkout ${ref}`;
  }
}
