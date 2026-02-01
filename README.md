# Open Quran View - React + TypeScript Playground

This playground demonstrates the `OpenQuranView` React component with full TypeScript support.

## Usage

```bash
# From the project root
pnpm playground:react

# Or directly in this directory
pnpm install
pnpm dev
```

## Features

- React 18 with TypeScript
- Vite for fast development
- Hot Module Replacement (HMR)
- Workspace dependency resolution (`open-quran-view: workspace:*`)

## Component Props

```typescript
interface OpenQuranViewProps {
  page: number;
  width: number;
  height: number;
  theme: "light" | "dark";
  mushafLayout?: "hafs-v2" | "hafs-v4" | "hafs-unicode";
  onPageChange?: (page: number) => void;
  onWordClick?: (word: { id: number; surahNumber?: number; ayahNumber?: number }) => void;
  onLoad?: (layout: unknown) => void;
}
```

## Available Mushaf Layouts

| Value | Description |
|-------|-------------|
| `hafs-v2` | Hafs (QCF V2) |
| `hafs-v4` | Hafs with Tajweed (QCF V4) |
| `hafs-unicode` | Hafs Unicode |
