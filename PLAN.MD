## 🎯 **xmlprompt** Implementation Plan

Based on your PRD, I've created a methodical plan following the sprint structure. We'll build this tool brick by brick, with testing after each major milestone.

### **Sprint 1: Spike & PoC** (Week 1)
**Goal**: Hard-coded paths → XML proof with performance measurement

**Step 1.1**: Basic XML Generation
- Implement core XML generation using `xmlbuilder2`
- Create simple file → XML conversion
- Test with a few hard-coded files

**Step 1.2**: File Reading & CDATA
- Add proper file reading with error handling
- Implement CDATA wrapping for code content
- Handle binary files gracefully

**Step 1.3**: Performance Baseline
- Add timing measurements
- Test with varying file sizes
- Establish baseline performance metrics

### **Sprint 2: Core CLI** (Week 2)
**Goal**: Commander flags, all output modes working

**Step 2.1**: CLI Arguments
- Implement all flags from PRD (`-o`, `--tag`, `--ignore`, etc.)
- Add help and version commands
- Proper error handling and validation

**Step 2.2**: Output Modes
- Clipboard copy (when TTY)
- Stdout streaming (when piped)
- File output (`-o` flag)
- Smart detection between modes

**Step 2.3**: Basic Glob Support
- File discovery with `fast-glob`
- Handle glob patterns from CLI args
- Basic file filtering

### **Sprint 3: TUI Implementation** (Week 3-4)
**Goal**: Full interactive tree view with Ink

**Step 3.1**: Directory Tree Display
- Build and display file tree structure
- Basic navigation (↑/↓ keys)
- Tree rendering with Ink

**Step 3.2**: Selection Logic
- Space bar selection/deselection
- Folder selection cascading to children
- Visual indicators for selected items

**Step 3.3**: Complete Navigation
- Expand/collapse folders with `/` key
- Enter to confirm, ESC to abort
- Status footer with selection count

### **Sprint 4: Ignore & Config** (Week 5)
**Goal**: Smart file filtering and configuration

**Step 4.1**: .gitignore Support
- Parse and apply .gitignore rules
- Integration with fast-glob
- Override with `--no-gitignore`

**Step 4.2**: Configuration Files
- `.xmlpromptrc` JSON/YAML support
- Default settings and presets
- CLI flag overrides

**Step 4.3**: .xmlpromptignore
- Additional ignore patterns
- Merge with .gitignore rules

### **Sprint 5-6: Polish & Ship** (Week 6-7)
- Binary compilation with bun
- CI/CD pipeline
- Testing and documentation
- Performance optimization