import { readFileSync } from 'fs';
import { join } from 'path';
import fg from 'fast-glob';
import ignore from 'ignore';

export interface FileNode {
	name: string;
	path: string;
	type: 'file' | 'directory';
	children?: FileNode[];
	selected?: boolean;
	expanded?: boolean;
}

export async function discoverFiles(rootPath: string = '.'): Promise<string[]> {
	const ig = ignore();
	try {
		const gitignoreContent = readFileSync(join(rootPath, '.gitignore'), 'utf-8');
		ig.add(gitignoreContent);
	} catch (error) {
		// No .gitignore file found, continue without it
	}

	const allFiles = await fg('**/*', {
		cwd: rootPath,
		dot: false,
		onlyFiles: true,
		ignore: ['node_modules/**', '.git/**'],
	});

	return allFiles.filter(file => !ig.ignores(file));
}

export function buildFileTree(files: string[]): FileNode[] {
	const rootNodes: FileNode[] = [];
	const nodeMap: Record<string, FileNode> = {};

	for (const filePath of files) {
		const parts = filePath.split('/');
		
		for (let i = 0; i < parts.length; i++) {
			const currentPath = parts.slice(0, i + 1).join('/');
			const isFile = i === parts.length - 1;
			
			if (!nodeMap[currentPath]) {
				const node: FileNode = {
					name: parts[i] || '',
					path: currentPath,
					type: isFile ? 'file' : 'directory',
					children: isFile ? undefined : [],
					selected: false,
					expanded: false,
				};
				
				nodeMap[currentPath] = node;
				
				if (i === 0) {
					// Root level node
					rootNodes.push(node);
				} else {
					// Add to parent
					const parentPath = parts.slice(0, i).join('/');
					const parent = nodeMap[parentPath];
					if (parent && parent.children) {
						parent.children.push(node);
					}
				}
			}
		}
	}

	return rootNodes;
}

export function generateXML(selectedFiles: string[], rootPath: string = '.'): string {
	const rootName = rootPath === '.' ? 'root' : rootPath.split('/').pop() || 'root';
	
	// Build hierarchical structure
	const structure: Record<string, any> = {};
	
	for (const filePath of selectedFiles) {
		const parts = filePath.split('/');
		let current = structure;
		
		for (let i = 0; i < parts.length; i++) {
			const part = parts[i];
			if (!part) continue;
			
			const isFile = i === parts.length - 1;
			
			if (isFile) {
				try {
					const content = readFileSync(join(rootPath, filePath), 'utf-8');
					current[part] = content;
				} catch (error) {
					console.warn(`Could not read file: ${filePath}`);
				}
			} else {
				if (!current[part]) {
					current[part] = {};
				}
				current = current[part] as Record<string, any>;
			}
		}
	}
	
	// Convert structure to XML
	function structureToXML(obj: any, tagName: string, indent: string = ''): string {
		if (typeof obj === 'string') {
			// File content
			return `${indent}<${tagName}>\n${obj}\n${indent}</${tagName}>\n`;
		} else {
			// Directory
			let xml = `${indent}<${tagName}>\n`;
			for (const [key, value] of Object.entries(obj)) {
				xml += structureToXML(value, key, indent + '  ');
			}
			xml += `${indent}</${tagName}>\n`;
			return xml;
		}
	}
	
	return structureToXML(structure, rootName).trim();
}

export function flattenTree(nodes: FileNode[]): FileNode[] {
	const result: FileNode[] = [];

	function traverse(nodes: FileNode[]) {
		for (const node of nodes) {
			result.push(node);
			if (node.type === 'directory' && node.expanded && node.children) {
				traverse(node.children);
			}
		}
	}

	traverse(nodes);
	return result;
}

export function getSelectedFiles(nodes: FileNode[]): string[] {
	const selected: string[] = [];

	function traverse(nodes: FileNode[]) {
		for (const node of nodes) {
			if (node.selected && node.type === 'file') {
				selected.push(node.path);
			}
			if (node.children) {
				traverse(node.children);
			}
		}
	}

	traverse(nodes);
	return selected;
} 