import * as vscode from 'vscode';
import axios, { AxiosInstance } from 'axios';

export interface ConfluencePageContent {
    title: string;
    content: string;
    labels?: string[];
    spaceKey?: string;
    parentId?: string;
}

export class ConfluenceService {
    private client: AxiosInstance | null = null;
    private context: vscode.ExtensionContext;
    private baseUrl: string = '';
    private spaceKey: string = '';

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.initializeClient();
    }

    private initializeClient() {
        const config = vscode.workspace.getConfiguration('confluenceSync');
        // Prefer environment variables where available, fallback to workspace settings
        const baseUrl = process.env.CONFLUENCE_BASE_URL || config.get<string>('baseUrl');
        const username = process.env.CONFLUENCE_USERNAME || config.get<string>('username');
        const apiToken = process.env.CONFLUENCE_API_TOKEN || config.get<string>('apiToken');
        const spaceKey = process.env.CONFLUENCE_SPACE_KEY || config.get<string>('spaceKey');

        if (baseUrl && username && apiToken) {
            this.baseUrl = baseUrl;
            this.spaceKey = spaceKey || '';
            
            this.client = axios.create({
                baseURL: `${baseUrl}/wiki/rest/api`,
                auth: {
                    username: username,
                    password: apiToken
                },
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });
        }
    }

    async syncToConfluence(pageContent: ConfluencePageContent): Promise<string> {
        if (!this.client) {
            this.initializeClient();
            if (!this.client) {
                throw new Error('Confluence not authenticated. Please run "Confluence: Authenticate" command first.');
            }
        }

        const spaceKey = pageContent.spaceKey || this.spaceKey;
        if (!spaceKey) {
            throw new Error('Space key not configured. Please run "Confluence: Authenticate" command.');
        }

        try {
            // Check if page already exists with this title
            const existingPage = await this.findPageByTitle(pageContent.title, spaceKey);

            if (existingPage) {
                // Update existing page
                return await this.updatePage(existingPage.id, pageContent);
            } else {
                // Create new page
                return await this.createPage(pageContent, spaceKey);
            }
        } catch (error) {
            console.error('Error syncing to Confluence:', error);
            throw error;
        }
    }

    private async findPageByTitle(title: string, spaceKey: string): Promise<any> {
        try {
            const response = await this.client!.get('/content', {
                params: {
                    spaceKey: spaceKey,
                    title: title,
                    expand: 'version'
                }
            });

            if (response.data.results && response.data.results.length > 0) {
                return response.data.results[0];
            }
            return null;
        } catch (error) {
            console.error('Error finding page:', error);
            return null;
        }
    }

    private async createPage(pageContent: ConfluencePageContent, spaceKey: string): Promise<string> {
        const config = vscode.workspace.getConfiguration('confluenceSync');
        // Allow parent page id from env `CONFLUENCE_PARENT_PAGE_ID` as well
        const parentPageId = pageContent.parentId || process.env.CONFLUENCE_PARENT_PAGE_ID || config.get<string>('parentPageId');

        const data: any = {
            type: 'page',
            title: pageContent.title,
            space: {
                key: spaceKey
            },
            body: {
                storage: {
                    value: this.convertToConfluenceStorage(pageContent.content),
                    representation: 'storage'
                }
            }
        };

        // Add parent page if specified
        if (parentPageId) {
            data.ancestors = [{ id: parentPageId }];
        }

        // Add labels if provided
        if (pageContent.labels && pageContent.labels.length > 0) {
            data.metadata = {
                labels: pageContent.labels.map(label => ({ name: label }))
            };
        }

        const response = await this.client!.post('/content', data);
        console.log('Successfully created Confluence page:', response.data.id);
        return response.data._links.webui;
    }

    private async updatePage(pageId: string, pageContent: ConfluencePageContent): Promise<string> {
        // Get current version
        const currentPage = await this.client!.get(`/content/${pageId}`, {
            params: { expand: 'version' }
        });

        const data = {
            version: {
                number: currentPage.data.version.number + 1
            },
            title: pageContent.title,
            type: 'page',
            body: {
                storage: {
                    value: this.convertToConfluenceStorage(pageContent.content),
                    representation: 'storage'
                }
            }
        };

        const response = await this.client!.put(`/content/${pageId}`, data);
        
        // Update labels if provided
        if (pageContent.labels && pageContent.labels.length > 0) {
            await this.updateLabels(pageId, pageContent.labels);
        }

        console.log('Successfully updated Confluence page:', response.data.id);
        return response.data._links.webui;
    }

    private async updateLabels(pageId: string, labels: string[]): Promise<void> {
        const labelData = labels.map(label => ({
            prefix: 'global',
            name: label
        }));

        await this.client!.post(`/content/${pageId}/label`, labelData);
    }

    private convertToConfluenceStorage(content: string): string {
        // Convert markdown-like content to Confluence Storage Format
        let confluenceContent = content;

        // Convert headers
        confluenceContent = confluenceContent.replace(/^### (.*?)$/gm, '<h3>$1</h3>');
        confluenceContent = confluenceContent.replace(/^## (.*?)$/gm, '<h2>$1</h2>');
        confluenceContent = confluenceContent.replace(/^# (.*?)$/gm, '<h1>$1</h1>');

        // Convert code blocks
        confluenceContent = confluenceContent.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
            const language = lang || 'none';
            return `<ac:structured-macro ac:name="code"><ac:parameter ac:name="language">${language}</ac:parameter><ac:plain-text-body><![CDATA[${code.trim()}]]></ac:plain-text-body></ac:structured-macro>`;
        });

        // Convert inline code
        confluenceContent = confluenceContent.replace(/`([^`]+)`/g, '<code>$1</code>');

        // Convert bold
        confluenceContent = confluenceContent.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

        // Convert italic
        confluenceContent = confluenceContent.replace(/\*(.+?)\*/g, '<em>$1</em>');

        // Convert bullet lists
        confluenceContent = confluenceContent.replace(/^- (.+?)$/gm, '<li>$1</li>');
        confluenceContent = confluenceContent.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');

        // Convert numbered lists
        confluenceContent = confluenceContent.replace(/^\d+\. (.+?)$/gm, '<li>$1</li>');

        // Convert paragraphs (lines that aren't already wrapped)
        confluenceContent = confluenceContent.split('\n\n').map(para => {
            if (!para.match(/^<[a-z]/)) {
                return `<p>${para}</p>`;
            }
            return para;
        }).join('\n');

        return confluenceContent;
    }

    async testConnection(): Promise<boolean> {
        if (!this.client) {
            this.initializeClient();
            if (!this.client) {
                return false;
            }
        }

        try {
            const response = await this.client.get('/space', {
                params: { limit: 1 }
            });
            return response.status === 200;
        } catch (error) {
            console.error('Confluence connection test failed:', error);
            return false;
        }
    }

    async getSpaces(): Promise<any[]> {
        if (!this.client) {
            this.initializeClient();
            if (!this.client) {
                return [];
            }
        }

        try {
            const response = await this.client.get('/space');
            return response.data.results || [];
        } catch (error) {
            console.error('Error getting spaces:', error);
            return [];
        }
    }

    async getPages(spaceKey: string): Promise<any[]> {
        if (!this.client) {
            this.initializeClient();
            if (!this.client) {
                return [];
            }
        }

        try {
            const response = await this.client.get('/content', {
                params: {
                    spaceKey: spaceKey,
                    type: 'page',
                    limit: 100
                }
            });
            return response.data.results || [];
        } catch (error) {
            console.error('Error getting pages:', error);
            return [];
        }
    }
}
