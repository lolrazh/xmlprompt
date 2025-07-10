import React, { useState, useEffect } from 'react';
import { Box, Text, useInput, useStdout } from 'ink';
import clipboardy from 'clipboardy';
import figures from 'figures';
import chalk from 'chalk';
import {
	discoverFiles,
	buildFileTree,
	flattenTree,
	generateXML,
	getSelectedFiles,
	type FileNode,
} from './file-utils.js';

// Consistent icon family using figures with fixed width
const icons = {
	unchecked: '○',      // Unicode circle
	checked: '●',        // Unicode filled circle  
	folderClosed: '📁',  // Folder emoji
	folderOpen: '📂',    // Open folder emoji
	star: figures.star,
	pipe: '│',
	branch: '├─',
	lastBranch: '└─',
	space: '  ',
};

export default function App() {
	const [fileTree, setFileTree] = useState<FileNode[]>([]);
	const [loading, setLoading] = useState(true);
	const [cursorIndex, setCursorIndex] = useState(0);
	const [flatList, setFlatList] = useState<FileNode[]>([]);
	const [status, setStatus] = useState('Loading files...');
	const [totalFiles, setTotalFiles] = useState(0);
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
			setStatus(chalk.red('No files selected!'));
			return;
		}

		try {
			setStatus(chalk.yellow(`Generating XML for ${selectedFiles.length} files...`));
			const xml = generateXML(selectedFiles);
			await clipboardy.write(xml);
			setStatus(chalk.green(`✓ Generated XML for ${selectedFiles.length} files and copied to clipboard!`));
			
			// Exit after successful generation
			setTimeout(() => {
				process.exit(0);
			}, 800); // Slightly longer to see the success message
		} catch (error) {
			setStatus(chalk.red('Error generating XML or copying to clipboard'));
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

	const getTreeStructure = (node: FileNode, index: number): string => {
		const depth = node.path.split('/').length - 1;
		if (depth === 0) return '';
		
		// Build proper tree connectors
		const isLastInParent = index === flatList.length - 1 || 
			(index + 1 < flatList.length && (flatList[index + 1]?.path.split('/').length ?? 0) <= depth);
		
		const connector = depth === 1 
			? (isLastInParent ? icons.lastBranch : icons.branch)
			: icons.pipe.repeat(depth - 1) + (isLastInParent ? icons.lastBranch : icons.branch);
			
		return connector + ' ';
	};

	const getIcon = (node: FileNode): string => {
		if (node.type === 'file') {
			return node.selected 
				? chalk.green(icons.checked)
				: chalk.gray(icons.unchecked);
		} else {
			return chalk.yellow(node.expanded ? icons.folderOpen : icons.folderClosed);
		}
	};

	const formatTreeLine = (node: FileNode, index: number): string => {
		const treeStructure = getTreeStructure(node, index);
		const icon = getIcon(node);
		const name = node.name;
		
		// Create the full line content
		const content = `${treeStructure}${icon} ${name}`;
		
		// Pad to terminal width for solid highlight bar
		const termWidth = stdout?.columns ?? 80;
		const paddedContent = content.padEnd(termWidth - 2); // -2 for margins
		
		return paddedContent;
	};

	return (
		<Box flexDirection="column" padding={1}>
			{/* Enhanced header with branding */}
			<Box marginBottom={1}>
				<Text bold>
					{chalk.cyan(icons.star)} <Text color="cyan">xmlprompt</Text>
				</Text>
			</Box>

			{loading ? (
				<Text>Loading files...</Text>
			) : (
				<>
					<Box flexDirection="column" marginBottom={1}>
						{flatList.map((node, index) => {
							const isSelected = cursorIndex === index;
							const content = formatTreeLine(node, index);
							
							return (
								<Text
									key={node.path}
									inverse={isSelected}
									wrap="truncate"
								>
									{content}
								</Text>
							);
						})}
					</Box>
					
					{/* Enhanced status bar with full width */}
					<Box width={stdout?.columns ?? 80}>
						<Text backgroundColor="gray" color="white">
							{` ${status}`.padEnd((stdout?.columns ?? 80) - 2)}
						</Text>
					</Box>
				</>
			)}
		</Box>
	);
}
