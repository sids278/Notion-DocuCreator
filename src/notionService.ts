import * as vscode from 'vscode';
import { Client } from '@notionhq/client';

export interface DocumentContent {
    title: string;
    content: string;
    filePath: string;
    language: string;
    tags?: string[];
}

export class NotionService {
    private notion: Client | null = null;
    private context: vscode.ExtensionContext;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.initializeClient();
    }

    private initializeClient() {
        const config = vscode.workspace.getConfiguration('notionSync');
        // Prefer environment variable `NOTION_API_KEY` if present, fall back to workspace setting
        const apiKey = process.env.NOTION_API_KEY || config.get<string>('apiKey');

        if (apiKey) {
            this.notion = new Client({ auth: apiKey });
        }
    }

    async syncToNotion(docContent: DocumentContent): Promise<void> {
        if (!this.notion) {
            this.initializeClient();
            if (!this.notion) {
                throw new Error('Notion not authenticated. Please run "Notion: Authenticate" command first.');
            }
        }

        const config = vscode.workspace.getConfiguration('notionSync');
        // Prefer environment variable `NOTION_DATABASE_ID` if present, fall back to workspace setting
        let rawDatabaseId = (process.env.NOTION_DATABASE_ID || config.get<string>('databaseId') || '').toString().trim();
        // Remove surrounding quotes if present (e.g., from .env file with quoted values)
        rawDatabaseId = rawDatabaseId.replace(/^['"]|['"]$/g, '');

        // If user supplied a full Notion URL, try to extract the database id
        const databaseId = this.extractDatabaseId(rawDatabaseId);

        if (!databaseId) {
            console.error('Failed to parse NOTION_DATABASE_ID. Raw input (masked):', this.maskSecret(rawDatabaseId));
            throw new Error('Database ID not configured. Please set the environment variable `NOTION_DATABASE_ID` (ID or full URL) or run "Notion: Authenticate" command.');
        }

        try {
            // Create a new page in the database with just the title property
            const response = await this.notion.pages.create({
                parent: { database_id: databaseId },
                properties: {
                    Name: {
                        title: [
                            {
                                text: {
                                    content: docContent.title
                                }
                            }
                        ]
                    }
                }
            });

            console.log('Successfully created Notion page:', response.id);

            // Now append the content blocks to the page
            const blocks = this.convertToNotionBlocks(docContent.content, docContent.language);
            if (blocks.length > 0) {
                await this.notion.blocks.children.append({
                    block_id: response.id,
                    children: blocks
                });
                console.log('Successfully appended content blocks to Notion page');
            }
        } catch (error) {
            console.error('Error syncing to Notion (as database):', error);

            // If the provided ID was actually a page id (not a database), try creating a child page under that page
            try {
                const fallbackResponse = await this.notion.pages.create({
                    parent: { page_id: databaseId },
                    properties: {}
                });

                console.log('Successfully created Notion child page:', fallbackResponse.id);

                // Append content blocks to the child page
                const blocks = this.convertToNotionBlocks(`# ${docContent.title}\n\n${docContent.content}`, docContent.language);
                if (blocks.length > 0) {
                    await this.notion.blocks.children.append({
                        block_id: fallbackResponse.id,
                        children: blocks
                    });
                    console.log('Successfully appended content blocks to Notion child page');
                }
                return;
            } catch (fallbackError) {
                console.error('Error syncing to Notion (as page):', fallbackError);
                throw fallbackError;
            }
        }
    }

    private convertToNotionBlocks(content: string, language: string): any[] {
        const blocks: any[] = [];

        // Split content into lines
        const lines = content.split('\n');
        let codeBlock = '';
        let inCodeBlock = false;

        for (const line of lines) {
            // Handle code blocks
            if (line.trim().startsWith('```')) {
                if (inCodeBlock) {
                    // End code block
                    if (codeBlock) {
                        blocks.push({
                            object: 'block',
                            type: 'code',
                            code: {
                                rich_text: [{
                                    type: 'text',
                                    text: { content: codeBlock }
                                }],
                                language: language
                            }
                        });
                        codeBlock = '';
                    }
                    inCodeBlock = false;
                } else {
                    inCodeBlock = true;
                }
                continue;
            }

            if (inCodeBlock) {
                codeBlock += line + '\n';
            } else if (line.trim().startsWith('#')) {
                // Handle headers
                const headerLevel = line.match(/^#+/)?.[0].length || 1;
                const headerText = line.replace(/^#+\s*/, '');
                
                blocks.push({
                    object: 'block',
                    type: `heading_${Math.min(headerLevel, 3)}`,
                    [`heading_${Math.min(headerLevel, 3)}`]: {
                        rich_text: [{
                            type: 'text',
                            text: { content: headerText }
                        }]
                    }
                });
            } else if (line.trim()) {
                // Regular paragraph
                blocks.push({
                    object: 'block',
                    type: 'paragraph',
                    paragraph: {
                        rich_text: [{
                            type: 'text',
                            text: { content: line }
                        }]
                    }
                });
            }
        }

        // Handle any remaining code block
        if (codeBlock) {
            blocks.push({
                object: 'block',
                type: 'code',
                code: {
                    rich_text: [{
                        type: 'text',
                        text: { content: codeBlock }
                    }],
                    language: language
                }
            });
        }

        return blocks;
    }

    /**
     * Mask a secret string for logging: show only first 4 and last 4 chars if length > 8.
     */
    private maskSecret(s: string | undefined | null): string {
        if (!s) { return '(empty)'; }
        const str = s.toString();
        if (str.length <= 8) { return '****'; }
        return str.slice(0, 4) + '...' + str.slice(-4);
    }

    /**
     * Extract a database ID from a raw string which may be the ID itself or a full Notion URL.
     */
    private extractDatabaseId(raw: string | undefined | null): string | null {
        if (!raw) { return null; }
        const s = raw.toString().trim();

        // If it's already a 32-char hex without dashes
        const match32 = s.match(/([0-9a-f]{32})/i);
        if (match32) { return match32[1]; }

        // If it's a dashed UUID
        const matchDashed = s.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
        if (matchDashed) { return matchDashed[1]; }

        // As a fallback, try to pull the last path segment (after last /)
        try {
            const url = new URL(s);
            const parts = url.pathname.split('/').filter(Boolean);
            if (parts.length > 0) {
                const last = parts[parts.length - 1];
                // strip query-like fragments
                const candidate = last.split('?')[0].split('#')[0];
                const candMatch = candidate.match(/([0-9a-f-]{32,36})/i);
                if (candMatch) { return candMatch[1]; }
            }
        } catch (e) {
            // Not a valid URL, ignore
        }

        return null;
    }

    async testConnection(): Promise<boolean> {
        if (!this.notion) {
            return false;
        }

        try {
            await this.notion.users.me({});
            return true;
        } catch (error) {
            return false;
        }
    }
}
