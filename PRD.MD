# Product Requirements & Implementation Plan

## Project: **xmlprompt** – CLI tool to convert selected repo files into a single XML blob for prompt engineering

---

## 1. Purpose & Vision

Develop **xmlprompt**, a zero‑friction command‑line utility that lets developers select any subset of files/folders in their codebase via an interactive terminal UI and instantaneously output those files as a single, well‑structured XML document—copied to clipboard, streamed to stdout, or written to disk. The tool eliminates repetitive copy‑paste rituals during prompt‑building sessions (e.g., on xmlprompt.dev) and slots seamlessly into existing npm/bun workflows (`npx xmlprompt`).

**North‑star UX**: *“Type `npx xmlprompt`, hit **Space** a few times, press **Enter**, and paste.”*

---

## 2. Problem Statement

Prompt engineers and devs frequently need to embed code snippets inside XML‑formatted prompts. Manually traversing the filesystem, opening files, copying contents, wrapping in tags, and maintaining indentation is tedious and error‑prone. Current tools (editors, generic archivers) do not output clean XML tailored for LLM ingestion.

---

## 3. Goals / Non‑Goals

### Goals

1. **Interactive CLI** that renders the repo’s directory tree in <200 ms on medium projects (≤5k files).
2. **Keyboard‑only selection model**:

   * `/` – expand/collapse folder under cursor.
   * **Space** – select/deselect node (folder selection cascades).
3. **gitignore aware**: obey `.gitignore` and `.xmlpromptignore` rules by default.
4. **Output modes**: clipboard (TTY), stdout (pipe/redirect), or file (`-o`).
5. **Config overrides** via `.xmlpromptrc` (YAML/JSON).
6. **Single‑binary install** (`npx` or homebrew) across macOS, Linux, Windows.
7. Unit and E2E tests with 90 %+ coverage.

### Non‑Goals

* Full GUI desktop app (Tauri) – deferred to v1.
* IDE extensions – future work.
* Non‑code assets preview (images, binaries).

---

## 4. Success Metrics

| Metric                             | Target                                           | Measurement           |
| ---------------------------------- | ------------------------------------------------ | --------------------- |
| Median cold start time             | ≤300 ms on 2020‑era MacBook                      | Telemetry opt‑in flag |
| Median XML build time (1 MB input) | ≤100 ms                                          | Bench script in CI    |
| Dog‑food adoption                  | Team uses for ≥80 % prompt sessions over 2 weeks | Self‑reported survey  |
| GitHub stars post‑launch           | 100 in 30 days                                   | GitHub API            |

---

## 5. Personas & User Stories

* **Prompt Engineer “Aisha”** – works in VS Code, builds RAG prompts 5×/day.

  * *“As Aisha, I want to convert selected React components into XML so I can paste them into GPT without scrolling through file tabs.”*
* **Backend Dev “Ravi”** – runs scripts in CI.

  * *“As Ravi, I need to generate an XML blob of all migration files and stream it to `curl` so my automated tests can evaluate LLM responses.”*

---

## 6. Detailed User Flow

1. **Invoke**: `npx xmlprompt [paths…] [--flags]`.
2. **Init**:

   * Resolve project root (nearest `.git`).
   * Read `.gitignore` → build ignore list.
   * Apply CLI globs (if any).
3. **TUI** (Ink):

   * Display tree.
   * Navigation keys:

     * `↑/↓` move cursor.
     * `/` expand/collapse.
     * **Space** select/deselect.
   * Footer shows selection count.
4. **Generate XML**: depth‑first traversal, streaming writes via `xmlbuilder2`.

   * `<folder name="…">` & `<file name="…">` nodes.
   * Contents are wrapped in `<![CDATA[…]]>` blocks for safety.
5. **Output**:

   * If `stdout` is piped → emit full XML.
   * Else if `-o` supplied → write file.
   * Else copy to clipboard and echo summary line.
6. **Exit codes**: 0 success, 130 user abort (ESC), 1 generic error.

Sequence Diagram (text):

```
User -> CLI: npx xmlprompt
CLI -> FS: read .gitignore
FS --> CLI: ignore rules
CLI -> TUI: render tree
User -> TUI: navigate/select
TUI -> CLI: selected paths
CLI -> XML Builder: stream files
XML Builder --> CLI: XML string
CLI -> Clipboard / Stdout: output
```

---

## 7. Functional Requirements

### 7.1 CLI Interface

```
xmlprompt [globs] [options]

Options
  -i, --interactive      force TUI even if paths provided
  -o, --output <file>    write to file instead of clipboard/stdout
  --tag <rootTag>        override root tag (default: repo‑root‑name)
  --ignore <glob>        extra ignore patterns (repeatable)
  --no-gitignore         ignore .gitignore rules
  --config <file>        path to custom .xmlpromptrc
  -v, --version          show version
  -h, --help             usage
```

### 7.2 Selection Logic

* Folder toggle (`/`) recursively flips all descendants.
* Child deselect → parent shows half‑checked indicator.
* Hidden files (dotfiles) visible but deselected by default.

### 7.3 XML Schema

```xml
<root tag="src">
  <folder name="components">
    <file name="Button.tsx"><![CDATA[
      // code…
    ]]></file>
  </folder>
</root>
```

### 7.4 Configuration

* **.xmlpromptrc** (JSON/YAML): default tag, ignore globs, preset globs (e.g., `react-core`).
* **.xmlpromptignore** (gitignore syntax) – merged with `.gitignore`.

### 7.5 Performance

* Must stream—no loading entire XML into memory for >10 MB projects.
* Node ≥18, thread‑safe on Windows.

### 7.6 Cross‑platform Packaging

* Use **bun** `bun build --compile` to emit standalone binaries for darwin‑arm64, darwin‑x64, linux‑x64, win‑x64.
* Homebrew tap + Scoop manifest.

### 7.7 Security

* No outbound network.
* Respect `.npmrc` proxy env but never leak code externally.

### 7.8 Logging & Telemetry

* `DEBUG=xmlprompt` prints verbose logs.
* Anonymous opt‑in telemetry flag collects performance metrics.

---

## 8. Non‑Functional Requirements

| Category             | Requirement                                                          |
| -------------------- | -------------------------------------------------------------------- |
| Performance          | Start ≤300 ms, traverse 5k files ≤200 ms                             |
| Reliability          | 99.9 % successful runs in CI test matrix                             |
| Usability            | Keyboard‑only, discoverable help (`?`)                               |
| Accessibility        | High‑contrast TUI palette; screen‑reader friendly (Node‑TTY prompts) |
| Internationalisation | UTF‑8 filenames & contents                                           |
| Maintainability      | 90 % test coverage, typed codebase, eslint + prettier                |
| Extensibility        | Core logic exported as JS/TS lib                                     |

---

## 9. Tech Stack & Dependencies

| Layer          | Library                          | Justification              |
| -------------- | -------------------------------- | -------------------------- |
| CLI args       | **Commander**                    | de‑facto, typed            |
| TUI            | **Ink** + `ink-tree-view`        | React mental model         |
| File discovery | **fast-glob**                    | fast, gitignore compatible |
| Ignore parser  | **ignore** npm pkg               | proven gitignore parser    |
| XML builder    | **xmlbuilder2**                  | streaming API              |
| Clipboard      | **clipboardy**                   | cross‑platform             |
| Packaging      | **bun** compiler, `pkg` fallback | single binary              |
| Tests          | **vitest** + **zx**              | fast, ESM                  |
| CI             | GitHub Actions matrix            | multi‑platform             |

---

## 10. Milestones & Timeline (agile S‑prints)

| Sprint                   | Length | Key Deliverables                              |
| ------------------------ | ------ | --------------------------------------------- |
| **S1 – Spike & PoC**     | 1 wk   | Hard‑coded paths → XML proof, measure perf    |
| **S2 – Core CLI**        | 1 wk   | Commander flags, xmlbuilder2, clipboardy      |
| **S3 – TUI**             | 2 wks  | Ink tree view, selection logic, ESC abort     |
| **S4 – Ignore & Config** | 1 wk   | .gitignore merge, .xmlpromptrc loader         |
| **S5 – Packaging & CI**  | 1 wk   | bun compile, GitHub release workflow          |
| **S6 – QA & Docs**       | 1 wk   | README, man page, blog post, telemetry opt‑in |

> **Total**: \~7 weeks to public v0.1.

---

## 11. Risks & Mitigations

| Risk                          | Likelihood | Impact       | Mitigation                             |
| ----------------------------- | ---------- | ------------ | -------------------------------------- |
| Ink performance on huge repos | Medium     | Sluggish UI  | Virtualised tree, lazy load nodes      |
| Binary size (>10 MB)          | Low        | Slower `npx` | Use ESBuild/Bun minify                 |
| Windows clipboard quirks      | Medium     | Failed copy  | CI test on Windows, fallback to stdout |