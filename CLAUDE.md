# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js 16 application with TypeScript and Tailwind CSS v4. The project uses React 19.2, the App Router architecture, and follows modern Next.js conventions.

## Common Commands

### Development
```bash
npm run dev          # Start development server (http://localhost:3000)
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
```

## Architecture

### Technology Stack
- **Framework**: Next.js 16.0.1 with App Router
- **React**: 19.2.0
- **TypeScript**: 5.x with strict mode enabled
- **Styling**: Tailwind CSS v4 with PostCSS, tw-animate-css for animations
- **Fonts**: Geist Sans and Geist Mono (loaded via next/font)
- **Utilities**:
  - `class-variance-authority` for variant-based component styling
  - `clsx` + `tailwind-merge` for conditional class composition (via `cn()` utility)
  - `lucide-react` for icons

### Project Structure
```
/app
  layout.tsx       # Root layout with font configuration and metadata
  page.tsx         # Home page component
  globals.css      # Global styles with Tailwind v4 and CSS variables
/lib
  utils.ts         # Utility functions (cn() for class merging)
/public            # Static assets (SVG files)
```

### Path Aliases
- `@/*` maps to the root directory (configured in tsconfig.json)

### Styling System
- Uses Tailwind CSS v4 with inline theme configuration in globals.css
- CSS custom properties for theming (light/dark mode support)
- Dark mode: Uses custom variant with `.dark` class scoping
- Design tokens defined via CSS variables (colors, radius, etc.)
- Color system: OKLCH color space for better perceptual uniformity

### TypeScript Configuration
- Target: ES2017
- Module: esnext with bundler resolution
- Strict mode enabled
- JSX: react-jsx
- Next.js plugin enabled for enhanced type checking

### ESLint Configuration
- Uses Next.js recommended configs (core-web-vitals + typescript)
- Flat config format (eslint.config.mjs)
- Standard ignores: .next/, out/, build/, next-env.d.ts
