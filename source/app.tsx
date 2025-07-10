import React, { useState, useEffect } from 'react';
import { Box, Text, useInput, useApp, useStdout } from 'ink';
import clipboardy from 'clipboardy';
import Gradient from 'ink-gradient';
import BigText from 'ink-big-text';
import Spinner from 'ink-spinner';
import gradient from 'gradient-string';
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
	markSelected: '*',    // fully selected
	markPartial: '-',     // partially selected (for folders)
	markNone: ' ',        // not selected
};

export default function App() {
	const [fileTree, setFileTree] = useState<FileNode[]>([]);
	const [loading, setLoading] = useState(true);
	const [cursorIndex, setCursorIndex] = useState(0);
	const [flatList, setFlatList] = useState<FileNode[]>([]);
	const [showHelp] = useState(true);
	const [isGenerating, setIsGenerating] = useState(false);
	const [generationComplete, setGenerationComplete] = useState(false);
	const { exit } = useApp();

	useEffect(() => {
		discoverFiles()
			.then(files => {
				const tree = buildFileTree(files);
				setFileTree(tree);
				setFlatList(flattenTree(tree));
				setLoading(false);
			})
			.catch(err => {
				console.error('Error discovering files:', err);
				setLoading(false);
			});
	}, []);

	const updateFlatList = (newTree: FileNode[]) => {
		setFlatList(flattenTree(newTree));
	};

	// Get selection state for a folder: 'none', 'partial', or 'full'
	const getFolderSelectionState = (node: FileNode): 'none' | 'partial' | 'full' => {
		if (node.type === 'file') {
			return node.selected ? 'full' : 'none';
		}

		if (!node.children || node.children.length === 0) {
			return 'none';
		}

		const childStates = node.children.map(child => getFolderSelectionState(child));
		const selectedCount = childStates.filter(state => state === 'full').length;
		const partialCount = childStates.filter(state => state === 'partial').length;

		if (selectedCount === node.children.length && partialCount === 0) {
			return 'full';
		} else if (selectedCount > 0 || partialCount > 0) {
			return 'partial';
		} else {
			return 'none';
		}
	};

	// Update tree with selection states
	const updateTreeWithSelectionStates = (nodes: FileNode[]): FileNode[] => {
		return nodes.map(node => {
			if (node.type === 'file') {
				return node;
			} else {
				const updatedChildren = node.children ? updateTreeWithSelectionStates(node.children) : [];
				const selectionState = getFolderSelectionState({ ...node, children: updatedChildren });
				return {
					...node,
					children: updatedChildren,
					selected: selectionState === 'full',
				};
			}
		});
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
					if (node.type === 'file') {
						// Simple toggle for files
						return { ...node, selected: !node.selected };
					} else {
						// Smart folder selection logic
						const currentState = getFolderSelectionState(node);
						const newSelection = currentState !== 'full'; // If not fully selected, select all; otherwise deselect all
						
						// Recursively update all children
						const updateChildren = (children: FileNode[]): FileNode[] => {
							return children.map(child => ({
								...child,
								selected: child.type === 'file' ? newSelection : child.selected,
								children: child.children ? updateChildren(child.children) : undefined,
							}));
						};

						return {
							...node,
							selected: newSelection,
							children: node.children ? updateChildren(node.children) : undefined,
						};
					}
				}
				if (node.children) {
					return { ...node, children: updateNodeSelected(node.children) };
				}
				return node;
			});
		};

		let newTree = updateNodeSelected(fileTree);
		// Update folder selection states based on their children
		newTree = updateTreeWithSelectionStates(newTree);
		setFileTree(newTree);
		updateFlatList(newTree);
	};

	const generateAndCopyXML = async () => {
		const selectedFiles = getSelectedFiles(fileTree);
		if (selectedFiles.length === 0) {
			return; // Do nothing if no files selected
		}

		try {
			setIsGenerating(true);
			const xml = generateXML(selectedFiles);
			await clipboardy.write(xml);
			
			setIsGenerating(false);
			setGenerationComplete(true);
			
			// Exit after showing success
			setTimeout(() => {
				exit();
			}, 800);
		} catch (error) {
			setIsGenerating(false);
			// Could add error state here
		}
	};

	useInput((input, key) => {
		if (loading || isGenerating) return;

		if (key.upArrow) {
			setCursorIndex(prev => Math.max(0, prev - 1));
		} else if (key.downArrow) {
			setCursorIndex(prev => Math.min(flatList.length - 1, prev + 1));
		} else if (key.leftArrow || input === 'h') {
			// Collapse folder
			const targetNode = flatList[cursorIndex];
			if (targetNode?.type === 'directory' && targetNode.expanded) {
				toggleExpanded(cursorIndex);
			}
		} else if (key.rightArrow || input === 'l') {
			// Expand folder
			const targetNode = flatList[cursorIndex];
			if (targetNode?.type === 'directory' && !targetNode.expanded) {
				toggleExpanded(cursorIndex);
			}
		} else if (input === '/') {
			// Keep / as backup for expand/collapse
			toggleExpanded(cursorIndex);
		} else if (input === ' ') {
			toggleSelected(cursorIndex);
		} else if (key.return) {
			generateAndCopyXML();
		} else if (input === 'q' || key.escape) {
			exit();
		}
	});

	const renderRow = (node: FileNode, idx: number): string => {
		const depth = node.path.split('/').length - 1;

		// 1. Fixed-width prefix: cursor + space + marker + space
		const cursor = cursorIndex === idx ? COLS.cursor : COLS.space;
		
		// 2. Get marker based on selection state
		let marker: string;
		if (node.type === 'file') {
			marker = node.selected ? COLS.markSelected : COLS.markNone;
		} else {
			const selectionState = getFolderSelectionState(node);
			if (selectionState === 'full') {
				marker = COLS.markSelected;
			} else if (selectionState === 'partial') {
				marker = COLS.markPartial;
			} else {
				marker = COLS.markNone;
			}
		}
		
		const fixed = `${cursor}${COLS.space}${marker}${COLS.space}`;

		// 3. Tree branch (draw after fixed prefix so markers line up)
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

		// 4. Label, folders get trailing '/'
		const label = node.type === 'directory' ? `${node.name}/` : node.name;

		return fixed + branch + label;
	};



	return (
		<Box flexDirection="column" padding={1}>
			{/* Gradient banner */}
			<Box marginBottom={0}>
				<Gradient name="pastel">
					<BigText text="xmlprompt" font="block" />
				</Gradient>
			</Box>

			{/* ───────────────────────────────── hint bar ─────────────────────────────── */}
			{showHelp && (
				<HintBar />
			)}

			{loading ? (
				<Text>Loading files...</Text>
			) : (
				<>
					{/* File directory */}
					<Box flexDirection="column">
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

					{/* gap before status bar */}
					<Text>{'\n'}</Text>
					
					{/* Status bar (spinner / success / idle) */}
					<StatusBar
						isGenerating={isGenerating}
						generationComplete={generationComplete}
						fileCount={getSelectedFiles(fileTree).length}
					/>
				</>
			)}
		</Box>
	);
}

// ─────────────────────────  components  ─────────────────────────

function HorizontalRule({width}: {width: number}) {
	return <Text color="gray">{'─'.repeat(width)}</Text>;
}

function HintBar() {
	// Calculate width based on help text content length
	const helpText = "↑/↓  move   •   ←/→  fold   •   Space  toggle   •   Enter  generate   •   q  quit";
	const helpWidth = helpText.length;
	
	return (
		<>
			<HorizontalRule width={helpWidth} />
			<Text bold color="white">
				<Text bold color="cyanBright">↑/↓</Text>  move   <Text color="gray">•</Text>{' '}
				<Text bold color="cyanBright">←/→</Text>  fold   <Text color="gray">•</Text>{' '}
				<Text bold color="cyanBright">Space</Text>  toggle   <Text color="gray">•</Text>{' '}
				<Text bold color="cyanBright">Enter</Text>  generate   <Text color="gray">•</Text>{' '}
				<Text bold color="cyanBright">q</Text>  quit
			</Text>
			<HorizontalRule width={helpWidth} />

			{/* one-line gap below the bar */}
			<Text>{'\n'}</Text>
		</>
	);
}

function StatusBar({
	isGenerating,
	generationComplete,
	fileCount,
}: {
	isGenerating: boolean;
	generationComplete: boolean;
	fileCount: number;
}) {
	const {stdout} = useStdout();
	const width = stdout.columns ?? 80;

	if (isGenerating) {
		return (
			<Text>
				<Spinner type="dots" />{' '}
				<Text bold>
					Generating XML for {fileCount} file{fileCount === 1 ? '' : 's'}…
				</Text>
			</Text>
		);
	}

	if (generationComplete) {
		const msg = gradient('green', 'cyan')(
			'  ✓  XML COPIED TO CLIPBOARD  '
		);
		return (
			<Text bold>
				{msg.padEnd(width - 1)}
			</Text>
		);
	}

	// Idle: nothing (the hint bar already shows)
	return null;
}
