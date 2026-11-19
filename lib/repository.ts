export type Commit = {
  sha: string;
  message: string;
  author: string;
  date: string;
  parents: string[];
  lane: number;
};

export type Branch = { name: string; sha: string; protected: boolean };

export type Repository = {
  name: string;
  description: string;
  url: string;
  defaultBranch: string;
  branches: Branch[];
  commits: Commit[];
  files: { path: string; type: string }[];
  fetchedAt: string;
  truncated: boolean;
};
