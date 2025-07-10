# XMLprompt

> *Instantly wrap any subset of your repo in well‑formed XML — straight from the terminal.*

---

![npm](https://img.shields.io/npm/v/xmlprompt?color=%23c678dd\&label=npm%20package)
![License](https://img.shields.io/github/license/your‑org/xmlprompt)

<img src="/media/xmlprompt.png" width="700" />

---

## ✨ Why?

Prompt engineers (and anyone pasting code into ChatGPT/Gemini) waste minutes hopping between files, hand‑wrapping snippets in `<file>` tags, and fighting clipboard chaos. **xmlprompt** turns that slog into a 5‑second keyboard ritual:

```bash
$ npx xmlprompt            # 1️⃣ launch
▸ src/                     # 2️⃣ up/down to your folder
Space                      # 3️⃣ star what you need
Enter                      # 4️⃣ paste in the LLM – done!
```

Zero boilerplate. Zero mouse.

---

## 🚀 Features

| Capability             | Details                                                     |
| ---------------------- | ----------------------------------------------------------- |
| **Interactive TUI**    | Fast Ink‑powered tree view, gitignore‑aware                 |
| **Tri‑state folders**  | ✔️ full, － partial, blank none  → accurate selection counts |
| **One‑touch XML**      | Streams to **clipboard**, `stdout`, or `‑o file.xml`        |
| **Batteries included** | Works offline, single‑binary install (`bunx xmlprompt`)     |
| **Cross‑platform**     | macOS, Linux, Windows (WSL)                                 |

---

## 🛠️ Installation

```bash
# choose one
npm  i -g xmlprompt      # global
pnpm add -g xmlprompt
bun  add -g xmlprompt

# or zero‑install
npx xmlprompt
```

---

## ⚡ Quick start

```bash
# in any git repo
xmlprompt
```

**Key bindings**

| Key     | Action                      |
| ------- | --------------------------- |
| ↑ / ↓   | Move cursor                 |
| ← / →   | Collapse / expand directory |
| Space   | Toggle select               |
| Enter   | Generate XML                |
| q / Esc | Quit                        |

---

## 📂 Output schema

```xml
<root>
  <folder>
    <file>
      // code here…
    </file>
  </folder>
</root>
```

*Binary files are skipped. Line endings preserved.*

---

## 📑 Configuration

Same syntax as `.gitignore`; merged automatically.

---

## 🗺️ Roadmap

* [ ] Watch mode (`xmlprompt --watch src/**`)

See [issues](https://github.com/your‑org/xmlprompt/issues) to up‑vote or suggest more.

---

## 🪪 License

MIT © 2025 Sandheep & contributors
