import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import clipboardy from 'clipboardy';
import {
	discoverFiles,
	buildFileTree,
	flattenTree,
	generateXML,
	getSelectedFiles,
	type FileNode,
} from './file-utils.js';

// Pure ASCII glyph set - clean and professional
const GLYPHS = {
	cursor: '▸',        // shows on active row
	indentPipe: '│ ',
	indentBranch: '├─ ',
	indentLast: '└─ ',
	selected: '*',
	unselected: ' ',
};

export default function App() {
	const [fileTree, setFileTree] = useState<FileNode[]>([]);
	const [loading, setLoading] = useState(true);
	const [cursorIndex, setCursorIndex] = useState(0);
	const [flatList, setFlatList] = useState<FileNode[]>([]);
	const [status, setStatus] = useState('Loading files...');
	const [totalFiles, setTotalFiles] = useState(0);

	useEffect(() => {
		discoverFiles()
			.then(files => {
				const tree = buildFileTree(files);
				setFileTree(tree);
				setFlatList(flattenTree(tree));
				setTotalFiles(files.length);
				setLoading(false);
				updateStatus(tree);
			})
			.catch(err => {
				console.error('Error discovering files:', err);
				setLoading(false);
				setStatus('Error loading files');
			});
	}, []);

	const updateStatus = (tree: FileNode[]) => {
		const selectedCount = getSelectedFiles(tree).length;
		setStatus(`${selectedCount}/${totalFiles} files selected • ↑/↓ navigate • Space select • / expand • Enter generate`);
	};

	const updateFlatList = (newTree: FileNode[]) => {
		setFlatList(flattenTree(newTree));
		updateStatus(newTree);
	};

	const toggleExpanded = (nodeIndex: number) => {
		const targetNode = flatList[nodeIndex];
		if (targetNode?.type !== 'directory') return;

		const updateNodeExpanded = (nodes: FileNode[]): FileNode[] => {
			return nodes.map(node => {
				if (node.path === targetNode.path) {
					return { ...node, expanded: !node.expanded };
				}
				if (node.children) {
					return { ...node, children: updateNodeExpanded(node.children) };
				}
				return node;
			});
		};

		const newTree = updateNodeExpanded(fileTree);
		setFileTree(newTree);
		updateFlatList(newTree);
	};

	const toggleSelected = (nodeIndex: number) => {
		const targetNode = flatList[nodeIndex];
		if (!targetNode) return;

		const updateNodeSelected = (nodes: FileNode[]): FileNode[] => {
			return nodes.map(node => {
				if (node.path === targetNode.path) {
					return { ...node, selected: !node.selected };
				}
				if (node.children) {
					return { ...node, children: updateNodeSelected(node.children) };
				}
				return node;
			});
		};

		const newTree = updateNodeSelected(fileTree);
		setFileTree(newTree);
		updateFlatList(newTree);
	};

	const generateAndCopyXML = async () => {
		const selectedFiles = getSelectedFiles(fileTree);
		if (selectedFiles.length === 0) {
			setStatus('No files selected!');
			return;
		}

		try {
			setStatus(`Generating XML for ${selectedFiles.length} files...`);
			const xml = generateXML(selectedFiles);
			await clipboardy.write(xml);
			setStatus(`✓ Generated XML for ${selectedFiles.length} files and copied to clipboard!`);
			
			// Exit after successful generation
			setTimeout(() => {
				process.exit(0);
			}, 800);
		} catch (error) {
			setStatus('Error generating XML or copying to clipboard');
		}
	};

	useInput((input, key) => {
		if (loading) return;

		if (key.upArrow) {
			setCursorIndex(prev => Math.max(0, prev - 1));
		} else if (key.downArrow) {
			setCursorIndex(prev => Math.min(flatList.length - 1, prev + 1));
		} else if (input === ' ') {
			toggleSelected(cursorIndex);
		} else if (input === '/') {
			toggleExpanded(cursorIndex);
		} else if (key.return) {
			generateAndCopyXML();
		} else if (key.escape) {
			process.exit(0);
		}
	});

	const renderRow = (node: FileNode, idx: number): string => {
		const depth = node.path.split('/').length - 1;
		
		// Build proper tree structure
		let indent = '';
		if (depth > 0) {
			// Determine if this is the last child at its level
			const isLast = idx === flatList.length - 1 || 
				(idx + 1 < flatList.length && (flatList[idx + 1]?.path.split('/').length ?? 0) <= depth);
			
			// Build the tree structure
			if (depth === 1) {
				indent = isLast ? GLYPHS.indentLast : GLYPHS.indentBranch;
			} else {
				// For deeper levels, add pipes for previous depths
				indent = Array(depth - 1).fill(GLYPHS.indentPipe).join('') + 
					(isLast ? GLYPHS.indentLast : GLYPHS.indentBranch);
			}
		}

		const cursorCol = cursorIndex === idx ? GLYPHS.cursor : ' ';
		const marker = node.selected ? GLYPHS.selected : GLYPHS.unselected;
		const label = node.type === 'directory' ? `${node.name}/` : node.name;

		return `${cursorCol} ${indent}${marker} ${label}`;
	};

	return (
		<Box flexDirection="column" padding={1}>
			{/* Clean header */}
			<Box marginBottom={1}>
				<Text bold>xmlprompt</Text>
			</Box>

			{loading ? (
				<Text>Loading files...</Text>
			) : (
				<>
					<Box flexDirection="column" marginBottom={1}>
						{flatList.map((node, index) => {
							const isActive = cursorIndex === index;
							const content = renderRow(node, index);
							
							return (
								<Text
									key={node.path}
									color={isActive ? 'cyan' : undefined}
								>
									{content}
								</Text>
							);
						})}
					</Box>
					
					{/* Clean status line */}
					<Text color="gray">{status}</Text>
				</>
			)}
		</Box>
	);
}
