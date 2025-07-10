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

export default function App() {
	const [fileTree, setFileTree] = useState<FileNode[]>([]);
	const [loading, setLoading] = useState(true);
	const [cursorIndex, setCursorIndex] = useState(0);
	const [flatList, setFlatList] = useState<FileNode[]>([]);
	const [status, setStatus] = useState('Loading files...');

	useEffect(() => {
		discoverFiles()
			.then(files => {
				const tree = buildFileTree(files);
				setFileTree(tree);
				setFlatList(flattenTree(tree));
				setLoading(false);
				setStatus(`Found ${files.length} files. Use ↑/↓ to navigate, Space to select, / to expand/collapse, Enter to generate XML.`);
			})
			.catch(err => {
				console.error('Error discovering files:', err);
				setLoading(false);
				setStatus('Error loading files');
			});
	}, []);

	const updateFlatList = (newTree: FileNode[]) => {
		setFlatList(flattenTree(newTree));
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
			const xml = generateXML(selectedFiles);
			await clipboardy.write(xml);
			setStatus(`Generated XML for ${selectedFiles.length} files and copied to clipboard!`);
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

	const getIndentation = (path: string): string => {
		const depth = path.split('/').length - 1;
		return '  '.repeat(depth);
	};

	const getIcon = (node: FileNode): string => {
		if (node.type === 'file') {
			return node.selected ? '[✓]' : '[ ]';
		} else {
			return node.expanded ? '📂' : '📁';
		}
	};

	return (
		<Box flexDirection="column" padding={1}>
			<Box marginBottom={1}>
				<Text bold color="blue">xmlprompt</Text>
			</Box>

			{loading ? (
				<Text>Loading files...</Text>
			) : (
				<>
					<Box flexDirection="column" marginBottom={1}>
						{flatList.map((node, index) => (
							<Text
								key={node.path}
								color={cursorIndex === index ? 'cyan' : undefined}
								backgroundColor={cursorIndex === index ? 'blue' : undefined}
							>
								{cursorIndex === index ? '> ' : '  '}
								{getIndentation(node.path)}
								{getIcon(node)} {node.name}
							</Text>
						))}
					</Box>
					
					<Box marginTop={1}>
						<Text color="gray">{status}</Text>
					</Box>
				</>
			)}
		</Box>
	);
}
