<!--suppress HtmlUnknownAnchorTarget, HtmlDeprecatedAttribute -->
<div id="top"></div>

<div align="center">
  <a href="https://github.com/wlgdev/wlguserscripts/actions/workflows/secrets-update.yml">
    <img src="https://github.com/wlgdev/wlguserscripts/actions/workflows/secrets-update.yml/badge.svg" alt="status"/>
  </a>
</div>
<h1 align="center">
  wlguserscripts
</h1>

<p align="center">
   A collection of userscripts for various websites.
</p>

<div align="center">
  📦 :octocat:
</div>
<div align="center">
  <img src="./docs/description.webp" alt="description"/>
</div>

<!-- TABLE OF CONTENT -->
<details>
  <summary>Table of Contents</summary>
  <ol>
    <li>
      <a href="#-description">📃 Description</a>
      <ul>
        <li><a href="#built-with">Built With</a></li>
      </ul>
    </li>
    <li>
      <a href="#-getting-started">🪧 Getting Started</a>
      <ul>
        <li><a href="#prerequisites">Prerequisites</a></li>
        <li><a href="#installation">Installation</a></li>
      </ul>
    </li>
    <li>
      <a href="#%EF%B8%8F-how-to-use">⚠️ How to use</a>
    </li>
  </ol>
</details>

<br>

## 📃 Description

This repository contains a collection of userscripts designed to enhance the user experience on various websites. Each userscript is located in its own subdirectory under `src/`.

<p align="right">(<a href="#top">back to top</a>)</p>

### Built With

- [TypeScript](https://www.typescriptlang.org/)
- [Deno](https://deno.land/)

## 🪧 Getting Started

To develop and build these userscripts, you will need Deno. To use the pre-built userscripts, you only need a userscript manager in your browser (e.g., Tampermonkey, Violentmonkey).

### Prerequisites

#### For Development:

- [Deno](https://deno.land/#installation)

#### For Usage:

- A userscript manager for your browser (e.g., [Tampermonkey](https://www.tampermonkey.net/), [Violentmonkey](https://violentmonkey.github.io/))

### Installation

1.  **Clone the repository (for development):**
    ```bash
    git clone https://github.com/wlgdev/wlguserscripts.git
    cd wlguserscripts
    ```
2.  **Build the userscripts (for development):**
    ```bash
    deno run -A scripts/bundle.ts
    ```
    This will generate the bundled userscript files in the `dist/` directory.
3.  **Install userscripts in your browser (for usage):**
    Open your userscript manager, create a new userscript, and paste the content of the desired `.user.js` file from the `dist/` directory.

<p align="right">(<a href="#top">back to top</a>)</p>

## ⚠️ How to use

After installation via your userscript manager, the scripts will automatically run on the specified websites. Refer to the individual userscript files in `src/` for details on their functionality and the websites they target.

### Click to install

- [wlgboosty](https://github.com/wlgdev/wlguserscript/raw/refs/heads/main/dist/wlgboosty.user.js)
- [wlghottwitch](https://github.com/wlgdev/wlguserscript/raw/refs/heads/main/dist/wlghottwitch.user.js)
- [wlgtwitch](https://github.com/wlgdev/wlguserscript/raw/refs/heads/main/dist/wlgtwitch.user.js)

<p align="right">(<a href="#top">back to top</a>)</p>
