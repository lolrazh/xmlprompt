import React, { useState, useEffect } from 'react';
import { render, Box, Text, useInput } from 'ink';
import { readFileSync } from 'fs';
import { join } from 'path';
import fg from 'fast-glob';
import ignore from 'ignore';

async function discoverFiles(rootPath: string = '.'): Promise<string[]> {
  let ig = ignore();
  try {
    const gitignoreContent = readFileSync(join(rootPath, '.gitignore'), 'utf-8');
    ig = ig.add(gitignoreContent);
  } catch (error) {
    // No .gitignore
  }

  const allFiles = await fg('**/*', {
    cwd: rootPath,
    dot: false,
    onlyFiles: true,
    ignore: ['node_modules/**', '.git/**'],
  });

  return allFiles.filter(file => !ig.ignores(file));
}

const App: React.FC = () => {
  const [files, setFiles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [cursorIndex, setCursorIndex] = useState(0);

  useEffect(() => {
    discoverFiles()
      .then(discoveredFiles => {
        setFiles(discoveredFiles);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error discovering files:", err);
        setLoading(false);
      });
  }, []);

  useInput((input, key) => {
    if (key.upArrow) {
      setCursorIndex(prev => Math.max(0, prev - 1));
    }
    if (key.downArrow) {
      setCursorIndex(prev => Math.min(files.length - 1, prev + 1));
    }
  });

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold>xmlprompt</Text>
      </Box>

      {loading ? (
        <Text>Loading files...</Text>
      ) : (
        <Box flexDirection="column">
          <Text>Found {files.length} files (Use ↑/↓ to navigate):</Text>
          {files.map((file, index) => (
            <Text key={file} color={cursorIndex === index ? 'cyan' : undefined}>
              {cursorIndex === index ? '> ' : '  '}
              {file}
            </Text>
          ))}
        </Box>
      )}
    </Box>
  );
};

render(<App />); 