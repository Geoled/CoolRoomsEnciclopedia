Теперь я полностью проанализировал проект. Вот полноценный README:

```markdown
# TIHIE ROOMS ARCHIVE v3.0

Single-page web application for cataloging and exploring a fictional universe. Acts as an interactive encyclopedia with four core registries — Levels, Entities, Objects, and Sustenance — all synchronized via GitHub.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [GitHub Integration](#github-integration)
- [Data Model](#data-model)
- [Themes](#themes)
- [Keyboard Shortcuts](#keyboard-shortcuts)
- [Custom Markdown Extensions](#custom-markdown-extensions)
- [Browser Support](#browser-support)
- [License](#license)

---

## Overview

TIHIE ROOMS ARCHIVE is a client-side web application designed for collaborative world-building and documentation. It provides a structured interface for managing four types of records:

| Registry   | Description                                 | Classification Levels                                   |
|------------|---------------------------------------------|--------------------------------------------------------|
| **Levels**       | Locations/dimensions within the universe    | 0 (Safe) through 5 (Deadly)                             |
| **Entities**     | Creatures and beings                        | 0 (Harmless) through 3 (Deadly)                         |
| **Objects**      | Items, weapons, and tools                   | Melee, Firearm, Tool, Misc                              |
| **Sustenance**   | Food, drink, flora                          | Beverage, Dish, Flora, Misc                             |

Each record carries structured stats, markdown descriptions, cross-references to other records, image galleries, and tags.

Data is persisted as JSON files in a GitHub repository. The application reads from and writes to the repository via the GitHub API, enabling multi-user collaboration without a backend server.

---

## Features

- **Boot Sequence** — Animated terminal-style launch sequence on page load
- **25 Color Themes** — Cycle through themes with a button or Ctrl+Arrow keys
- **Catalog Views** — Grid-based card layout with stat bars, class icons, and thumbnails
- **Search, Filter, Sort** — Full-text search, tag filtering, and multi-key sorting
- **Sidebar Tree** — Hierarchical navigation grouped by cluster (for levels) or flat list
- **Detail View** — Modal with full description (rendered from Markdown), stats, cross-references, and image gallery
- **CRUD Operations** — Create, read, update, and delete records via a form modal
- **Bookmarks** — Star records for quick access from a dedicated tab
- **Timeline** — Chronological view sorted by discovery date
- **Changelog** — Fetches and displays the most recent 30 commits from the configured GitHub repository
- **Record Comparison** — Side-by-side comparison of any two records with highlighted differences
- **Encounter Simulator** — Randomized entity encounter scenario generator
- **Statistics Dashboard** — Aggregate stats: total records, averages, dangerous zone counts, top tags
- **Export/Import** — Full data export and import as JSON files
- **Image Upload** — Upload images directly to the GitHub repository
- **Report Copy** — Copy a formatted text report of any record to clipboard
- **Compact Mode** — Toggle dense layout (Ctrl+D)
- **Fullscreen Mode** — Toggle fullscreen view (Ctrl+F or button)
- **Mobile Responsive** — Collapsible sidebar with hamburger menu for narrow screens
- **Konami Code** — Easter egg that cycles through all themes rapidly
- **Keyboard Shortcuts Panel** — Press `?` to display available shortcuts
- **Scroll-to-Top Button** — Appears after scrolling down
- **Draft Persistence** — Edit form content is saved to localStorage to prevent data loss

---

## Project Structure

```
tihie-rooms-archive/
├── index.html          # Main HTML document with all modals and structural markup
├── css/
│   └── styles.css      # Base styles, all 25 theme definitions, responsive rules
└── js/
    ├── app.js          # Initialization, theme management, event wiring, boot sequence
    ├── api.js          # GitHub API client, classification styles, utility functions
    ├── render.js       # All rendering: cards, views, edit forms, tree, changelog, compare
    └── utils.js        # Global state, DOM references, constants
```

### Dependencies

The application loads one external library via CDN:

- **[marked](https://github.com/markedjs/marked)** v4.3.0 — Markdown parser and compiler

Everything else is vanilla JavaScript with no frameworks, no build step, and no package manager required.

---

## Getting Started

### Prerequisites

- A modern web browser with JavaScript enabled
- A GitHub account (for data persistence)
- A GitHub repository with the following directory structure:

```
repository/
├── levels/
├── entities/
├── items/
└── foods/
```

### Setup

1. **Clone or download** this repository to your local machine.
2. **Create a GitHub repository** for your data and generate a classic personal access token with `repo` scope.
3. **Open `index.html`** in a browser — no server required.
4. **Configure GitHub** by clicking the "REPO SETTINGS" button in the sidebar and filling in:
   - **Owner** — your GitHub username
   - **Repository** — the name of your data repository
   - **Token** — your classic personal access token (`ghp_...`)
5. Click "SAVE". Settings are stored in `localStorage`.
6. Click the "SYNC" button or press the refresh button to load records from the repository.
7. Use the "+ NEW" button to create records.

### Running Locally

The application works by opening `index.html` directly in a browser. For image uploads to work without CORS issues, consider serving it through a local HTTP server:

```bash
# Using Python
python3 -m http.server 8080

# Using Node.js
npx serve .
```

---

## GitHub Integration

The application uses the GitHub Contents API to read, write, and delete files.

### How It Works

- **Reading**: The app fetches the repository tree, then loads each JSON file from the `levels/`, `entities/`, `items/`, and `foods/` directories.
- **Writing**: Records are saved as individual JSON files using the naming pattern `{type}/{type}_{id}.json` (e.g., `levels/levels_0.json`).
- **Deleting**: Files are removed via the DELETE endpoint, using the file's SHA hash to avoid conflicts.
- **Image Uploads**: Images are uploaded to a `media/` directory in the repository and the resulting URL is stored in the record.

### File Naming Convention

| Record Type | File Path               |
|-------------|-------------------------|
| Level       | `levels/levels_{id}.json` |
| Entity      | `entities/entities_{id}.json` |
| Item        | `items/items_{id}.json`     |
| Food        | `foods/foods_{id}.json`     |

### Token Security

The GitHub token is stored in `localStorage` in the user's browser. It is never transmitted anywhere except to `api.github.com`. For production use, consider implementing a proxy server to avoid exposing tokens in client-side code.

---

## Data Model

### Common Fields

All record types share these fields:

| Field          | Type     | Description                                     |
|----------------|----------|-------------------------------------------------|
| `id`           | string   | Unique identifier (auto-incremented integer as string) |
| `title`/`name` | string   | Display name (title for levels, name for others)       |
| `cls`          | string   | Classification code (see type-specific tables)         |
| `desc`         | string   | Markdown description with custom extensions             |
| `tags`         | string[] | Array of tag strings                                     |
| `discoveredAt` | string   | ISO date string (YYYY-MM-DD)                             |
| `thumbnail`    | string   | URL of primary image                                     |
| `images`       | object[] | Array of `{ url, description }` objects for gallery      |
| `stats`        | object   | Type-specific numerical stats                            |

### Level-Specific Fields

| Field      | Type     | Description                                   |
|------------|----------|-----------------------------------------------|
| `title`    | string   | Level name                                    |
| `cluster`  | string   | Grouping label for sidebar tree               |
| `stats`    | object   | `safety`, `stability`, `entities`, `resources`, `mental`, `navigation` (all 1-5) |
| `ent`      | string[] | IDs of inhabiting entities                    |
| `foodIds`  | string[] | IDs of sustenance found on the level          |
| `itemIds`  | string[] | IDs of objects present on the level           |
| `in`       | string   | Comma-separated entrance level IDs             |
| `out`      | string   | Comma-separated exit level IDs                |

### Entity-Specific Fields

| Field      | Type   | Description                                   |
|------------|--------|-----------------------------------------------|
| `name`     | string | Entity name                                   |
| `stats`    | object | `danger`, `frequency`, `intelligence`, `aggression` (all 1-5) |
| `habitat`  | string | Natural habitat description                   |
| `behavior` | string | Behavioral patterns                           |
| `survival` | string | Survival guide / countermeasures              |

### Item-Specific Fields

| Field   | Type   | Description                                   |
|---------|--------|-----------------------------------------------|
| `name`  | string | Item name                                     |
| `stats` | object | `weight` (kg), `rarity` (1-5), `usefulness` (1-5), `durability` (1-5) |
| `props` | string | Physical properties and characteristics        |

### Sustenance-Specific Fields

| Field   | Type   | Description                                   |
|---------|--------|-----------------------------------------------|
| `name`  | string | Sustenance name                               |
| `stats` | object | `calories` (kcal), `availability` (1-10), `taste` (1-5), `shelfLife` (days) |
| `effect`| string | Consumption effects                           |

---

## Themes

The application includes 25 color themes. Each theme defines a complete set of CSS custom properties: accent color, text colors, background colors, border styles, border radius, letter spacing, scanline overlay intensity, and font weight.

| #  | Theme        | Palette        | Characteristics                |
|----|--------------|----------------|-------------------------------|
| 1  | Amber        | Gold/Brown     | Default, military terminal     |
| 2  | Green        | Green/Dark     | Retro monitor                  |
| 3  | White        | Grey/Black     | Minimalist, light weight       |
| 4  | Crimson      | Red/Dark       | Heavy borders, scanlines       |
| 5  | Ocean        | Blue/Dark      | Rounded cards                  |
| 6  | Midnight     | Purple/Dark    | Rounded cards, subtle scanlines|
| 7  | Forest       | Olive/Green    | Natural tones                  |
| 8  | Sunset       | Orange/Warm    | Rounded, warm                  |
| 9  | Ghost        | Pale Blue/Dark | Wide spacing, scanlines        |
| 10 | Monochrome   | Grey/Black     | Thick borders, wide spacing    |
| 11 | Retro        | Gold/Brown     | Vintage terminal               |
| 12 | Matrix       | Green/Black    | Classic hacker aesthetic       |
| 13 | Arctic       | Cyan/Ice       | Cold blue tones                |
| 14 | Ember        | Red-Orange/Dark| Warm fiery tones               |
| 15 | Lavender     | Purple/Pastel  | Soft purple hues               |
| 16 | Moss         | Dark Green     | Deep forest vibe               |
| 17 | Neon         | Pink/Cyan      | High contrast cyberpunk        |
| 18 | Steel        | Blue-Grey      | Industrial metallic            |
| 19 | Ink          | Dark Blue/Black| Deep navy tones                |
| 20 | Sepia        | Brown/Warm     | Vintage photograph             |
| 21 | Aqua         | Teal/Turquoise | Oceanic                        |
| 22 | Ruby         | Deep Red/Dark  | Rich crimson                   |
| 23 | Olive        | Olive/Drab     | Military drab                  |
| 24 | Sky          | Light Blue     | Airy, bright                   |
| 25 | Noir         | True B&W       | Film noir aesthetic            |

Theme preference is saved to `localStorage` and restored on next visit. Cycle themes with the paint palette button in the sidebar or `Ctrl+Left` / `Ctrl+Right`.

---

## Keyboard Shortcuts

| Shortcut       | Action                    |
|----------------|---------------------------|
| `/`            | Focus search input        |
| `Esc`          | Close active modal        |
| `?`            | Toggle shortcuts panel    |
| `Ctrl+D`       | Toggle compact mode       |
| `Ctrl+F`       | Toggle fullscreen         |
| `Ctrl+Left`    | Previous theme            |
| `Ctrl+Right`   | Next theme                |

---

## Custom Markdown Extensions

The application extends standard Markdown with two custom syntax elements:

### `[COLLAPSED]`

Creates a collapsible section. The first line after `[COLLAPSED]` becomes the header.

```markdown
[COLLAPSED] Entity Behavior
- Nocturnal activity observed
- Territorial within 50-meter radius
- Responds to light stimuli
```

### `[REDACTED]`

Renders a blacked-out text block that reveals its content on click.

```markdown
Access code: [REDACTED]
```

Standard Markdown (headings, lists, bold, italic, links) is fully supported via the `marked` library.

---

## Browser Support

The application targets modern browsers with ES5+ support:

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

JavaScript must be enabled. A `<noscript>` banner is displayed otherwise.

---

## LocalStorage Keys

The application uses the following `localStorage` keys:

| Key              | Purpose                       |
|------------------|-------------------------------|
| `gh_owner`       | GitHub username               |
| `gh_repo`        | GitHub repository name        |
| `gh_token`       | GitHub personal access token  |
| `tihie_theme`    | Active theme name             |
| `tihie_compact`  | Compact mode state (`0`/`1`)  |
| `tihie_bm`       | Bookmarks array (JSON)        |
| `tihie_img`      | Image URL cache (JSON)        |
| `formDraft_{type}`| Unsaved form draft (JSON)    |

---

## License

This project is provided as-is for personal and collaborative use. If you plan to redistribute or modify it, include attribution to the original author.

---

## Acknowledgments

- [marked](https://github.com/markedjs/marked) for Markdown parsing
- The Backrooms community for inspiration
```

Файл готов. Сохраняю как `README.md`:
