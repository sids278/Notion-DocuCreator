import * as vscode from 'vscode';
import { DocumentContent } from './notionService';
import * as path from 'path';

export class DocumentParser {
    parseDocument(document: vscode.TextDocument): DocumentContent {
        const fileName = path.basename(document.fileName);
        const content = document.getText();
        const language = document.languageId;

        // Extract documentation comments
        const documentation = this.extractDocumentation(content, language);

        // If no documentation was found, include a summary of the file with language info
        const finalContent = documentation && documentation !== content 
            ? documentation
            : `## ${fileName}\n\nLanguage: ${language}\n\n\`\`\`${language}\n${content}\n\`\`\``;

        return {
            title: fileName,
            content: finalContent,
            filePath: document.fileName,
            language: language,
            tags: this.extractTags(content, language)
        };
    }

    private extractDocumentation(content: string, language: string): string {
        let docContent = '';

        switch (language) {
            case 'javascript':
            case 'typescript':
            case 'java':
            case 'c':
            case 'cpp':
                docContent = this.extractJSDocStyle(content);
                break;
            case 'python':
                docContent = this.extractPythonDocstrings(content);
                break;
            default:
                // Return original content if no specific parser
                docContent = content;
        }

        return docContent;
    }

    private extractJSDocStyle(content: string): string {
        // Match JSDoc style comments /** ... */
        const jsdocPattern = /\/\*\*[\s\S]*?\*\//g;
        const matches = content.match(jsdocPattern);

        if (!matches) {
            return content;
        }

        let documentation = '';
        for (const match of matches) {
            // Clean up the comment
            const cleaned = match
                .replace(/\/\*\*|\*\//g, '')
                .replace(/^\s*\*\s?/gm, '')
                .trim();
            documentation += cleaned + '\n\n';
        }

        // Also include the actual code
        documentation += '\n---\n## Full Code\n```\n' + content + '\n```';

        return documentation;
    }

    private extractPythonDocstrings(content: string): string {
        // Match Python docstrings """ ... """ or ''' ... '''
        const docstringPattern = /("""[\s\S]*?"""|'''[\s\S]*?''')/g;
        const matches = content.match(docstringPattern);

        if (!matches) {
            return content;
        }

        let documentation = '';
        for (const match of matches) {
            // Clean up the docstring
            const cleaned = match
                .replace(/"""|'''/g, '')
                .trim();
            documentation += cleaned + '\n\n';
        }

        // Also include the actual code
        documentation += '\n---\n## Full Code\n```python\n' + content + '\n```';

        return documentation;
    }

    private extractTags(content: string, language: string): string[] {
        const tags: string[] = [language];

        // Check for common patterns
        if (content.includes('class ')) {
            tags.push('class');
        }
        if (content.includes('function ') || content.includes('def ')) {
            tags.push('function');
        }
        if (content.includes('interface ')) {
            tags.push('interface');
        }
        if (content.includes('TODO') || content.includes('FIXME')) {
            tags.push('needs-review');
        }

        return tags;
    }

    async parseWorkspace(workspaceFolder: vscode.WorkspaceFolder): Promise<DocumentContent[]> {
        const documents: DocumentContent[] = [];
        
        // Find all relevant files in workspace
        const files = await vscode.workspace.findFiles(
            '**/*.{ts,js,py,java,cpp,c,h}',
            '**/node_modules/**'
        );

        for (const file of files) {
            const document = await vscode.workspace.openTextDocument(file);
            documents.push(this.parseDocument(document));
        }

        return documents;
    }
}
