import { defineConfig } from 'vite';

// On GitHub Pages the site lives under /<repo>/, so derive the base from the
// repository name when building inside GitHub Actions. Local dev/preview use '/'.
const repo = process.env.GITHUB_REPOSITORY?.split('/')[1];
const base = process.env.GITHUB_ACTIONS && repo ? `/${repo}/` : '/';

export default defineConfig({ base });
