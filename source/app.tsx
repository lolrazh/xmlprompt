import React, { useState, useEffect } from 'react';
import { Box, Text, useInput, useStdout } from 'ink';
import clipboardy from 'clipboardy';
import Gradient from 'ink-gradient';
import BigText from 'ink-big-text';
import {
	discoverFiles,
	buildFileTree,
	flattenTree,
	generateXML,
	getSelectedFiles,
	type FileNode,
} from './file-utils.js';

// Column-perfect layout constants
const COLS = {
	cursor: '●',          // solid dot cursor
	space: ' ',           // one space
	markSelected: '*',
	markNone: ' ',
};

export default function App() {
	const [fileTree, setFileTree] = useState<FileNode[]>([]);
	const [loading, setLoading] = useState(true);
	const [cursorIndex, setCursorIndex] = useState(0);
	const [flatList, setFlatList] = useState<FileNode[]>([]);
	const [status, setStatus] = useState('Loading files...');
	const [totalFiles, setTotalFiles] = useState(0);
	const [flash, setFlash] = useState(false);
	const { stdout } = useStdout();

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
		setStatus(`${selectedCount}/${totalFiles} selected • ↑/↓ navigate • Space select • / expand • Enter generate`);
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
			
			// Flash success with green highlight
			setFlash(true);
			setTimeout(() => setFlash(false), 500);
			
			// Exit after showing success flash
			setTimeout(() => {
				process.exit(0);
			}, 1000);
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

		// 1. Fixed-width prefix: cursor + space + marker + space
		const cursor = cursorIndex === idx ? COLS.cursor : COLS.space;
		const marker = node.selected ? COLS.markSelected : COLS.markNone;
		const fixed = `${cursor}${COLS.space}${marker}${COLS.space}`;

		// 2. Tree branch (draw after fixed prefix so stars line up)
		let branch = '';
		if (depth > 0) {
			// Determine if this is the last child at its level
			const isLast = idx === flatList.length - 1 || 
				(idx + 1 < flatList.length && (flatList[idx + 1]?.path.split('/').length ?? 0) <= depth);

			branch = Array(depth)
				.fill('│ ')
				.join('')
				.slice(0, -2) + (isLast ? '└─ ' : '├─ ');
		}

		// 3. Label, folders get trailing '/'
		const label = node.type === 'directory' ? `${node.name}/` : node.name;

		return fixed + branch + label;
	};

	const termWidth = stdout?.columns ?? 80;
	const footer = flash 
		? ` ✓ XML copied to clipboard! `
		: ` ${status} `;

	return (
		<Box flexDirection="column" padding={1}>
			{/* Gradient banner */}
			<Box justifyContent="center" marginBottom={1}>
				<Gradient name="pastel">
					<BigText text="xmlprompt" font="block" />
				</Gradient>
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
					
					{/* Full-width status bar with flash effect */}
					<Text
						backgroundColor={flash ? 'green' : 'gray'}
						color="black"
						wrap="truncate"
					>
						{footer.padEnd(termWidth - 2)}
					</Text>
				</>
			)}
		</Box>
	);
}
