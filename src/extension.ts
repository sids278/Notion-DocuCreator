import * as vscode from 'vscode';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { NotionService } from './notionService';
import { ConfluenceService } from './confluenceService';
import { DocumentParser } from './documentParser';

let notionService: NotionService;
let confluenceService: ConfluenceService;

export async function activate(context: vscode.ExtensionContext) {
    console.log('Notion & Confluence Documentation Sync extension is now active');
    
    // Load .env file from workspace root if it exists (for local development)
    try {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (workspaceFolders && workspaceFolders.length > 0) {
            const envPath = path.join(workspaceFolders[0].uri.fsPath, '.env');
            if (fs.existsSync(envPath)) {
                dotenv.config({ path: envPath });
                console.log('Loaded environment variables from .env file');
            }
        }
    } catch (err) {
        console.log('Could not load .env file (this is optional):', err);
    }

    // Provide a visible notification in the Extension Development Host so activation is obvious
    try {
        vscode.window.showInformationMessage('Notion & Confluence Documentation Sync activated');
    } catch (e) {
        console.log('Could not show activation message:', e);
    }

    // Initialize services with safe error handling so activation doesn't fail silently
    try {
        notionService = new NotionService(context);
    } catch (err) {
        console.error('Failed to initialize NotionService:', err);
        notionService = new NotionService(context);
    }

    try {
        confluenceService = new ConfluenceService(context);
    } catch (err) {
        console.error('Failed to initialize ConfluenceService:', err);
        confluenceService = new ConfluenceService(context);
    }

    // After initializing, attempt to verify connections automatically so users don't need to run auth commands
    try {
        const notionConnected = notionService ? await notionService.testConnection() : false;
        const confluenceConnected = confluenceService ? await confluenceService.testConnection() : false;

        if (notionConnected && confluenceConnected) {
            vscode.window.showInformationMessage('Connected to Notion and Confluence (credentials loaded from environment or workspace settings)');
        } else if (notionConnected) {
            vscode.window.showInformationMessage('Connected to Notion (credentials loaded from environment or workspace settings)');
        } else if (confluenceConnected) {
            vscode.window.showInformationMessage('Connected to Confluence (credentials loaded from environment or workspace settings)');
        } else {
            // Do not spam users with errors — only show a single informational warning
            vscode.window.showWarningMessage('Not authenticated to Notion or Confluence. You can run the authentication commands or set environment variables in a .env file.');
        }
    } catch (err) {
        console.error('Error while testing service connections at activation:', err);
    }

    // ========== NOTION COMMANDS ==========
    
    // Authenticate with Notion
    let authenticateNotionCommand = vscode.commands.registerCommand('notion-sync.authenticate', async () => {
        const apiKey = await vscode.window.showInputBox({
            prompt: 'Enter your Notion Integration Token',
            password: true,
            placeHolder: 'secret_...'
        });

        if (apiKey) {
            const config = vscode.workspace.getConfiguration('notionSync');
            await config.update('apiKey', apiKey, vscode.ConfigurationTarget.Global);
            
            const databaseId = await vscode.window.showInputBox({
                prompt: 'Enter your Notion Database ID',
                placeHolder: 'abc123...'
            });

            if (databaseId) {
                await config.update('databaseId', databaseId, vscode.ConfigurationTarget.Global);
                vscode.window.showInformationMessage('Notion credentials saved!');
            }
        }
    });

    // Sync current file to Notion
    let syncNotionCommand = vscode.commands.registerCommand('notion-sync.syncToNotion', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active file to sync');
            return;
        }

        try {
            const document = editor.document;
            const parser = new DocumentParser();
            const parsedContent = parser.parseDocument(document);

            await notionService.syncToNotion(parsedContent);
            vscode.window.showInformationMessage(`Successfully synced ${document.fileName} to Notion!`);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to sync to Notion: ${error}`);
        }
    });

    // Sync entire project to Notion
    let syncNotionProjectCommand = vscode.commands.registerCommand('notion-sync.syncProject', async () => {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            vscode.window.showErrorMessage('No workspace folder open');
            return;
        }

        vscode.window.showInformationMessage('Notion project sync feature coming soon!');
    });

    // ========== CONFLUENCE COMMANDS ==========
    
    // Authenticate with Confluence
    let authenticateConfluenceCommand = vscode.commands.registerCommand('confluence-sync.authenticate', async () => {
        const baseUrl = await vscode.window.showInputBox({
            prompt: 'Enter your Confluence base URL',
            placeHolder: 'https://your-domain.atlassian.net'
        });

        if (!baseUrl) { return; }

        const username = await vscode.window.showInputBox({
            prompt: 'Enter your Confluence username/email',
            placeHolder: 'user@example.com'
        });

        if (!username) { return; }

        const apiToken = await vscode.window.showInputBox({
            prompt: 'Enter your Confluence API token',
            password: true,
            placeHolder: 'Get token from: https://id.atlassian.com/manage-profile/security/api-tokens'
        });

        if (!apiToken) { return; }

        const spaceKey = await vscode.window.showInputBox({
            prompt: 'Enter your Confluence Space Key',
            placeHolder: 'DOCS (found in space settings)'
        });

        if (!spaceKey) { return; }

        // Optional parent page
        const parentPageId = await vscode.window.showInputBox({
            prompt: 'Enter parent page ID (optional - leave empty for root)',
            placeHolder: '123456789'
        });

        const config = vscode.workspace.getConfiguration('confluenceSync');
        await config.update('baseUrl', baseUrl, vscode.ConfigurationTarget.Global);
        await config.update('username', username, vscode.ConfigurationTarget.Global);
        await config.update('apiToken', apiToken, vscode.ConfigurationTarget.Global);
        await config.update('spaceKey', spaceKey, vscode.ConfigurationTarget.Global);
        
        if (parentPageId) {
            await config.update('parentPageId', parentPageId, vscode.ConfigurationTarget.Global);
        }

        // Test connection
        const connected = await confluenceService.testConnection();
        if (connected) {
            vscode.window.showInformationMessage('Confluence credentials saved and connection verified!');
        } else {
            vscode.window.showWarningMessage('Confluence credentials saved but connection test failed. Please verify your settings.');
        }
    });

    // Sync current file to Confluence
    let syncConfluenceCommand = vscode.commands.registerCommand('confluence-sync.syncToConfluence', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active file to sync');
            return;
        }

        try {
            const document = editor.document;
            const parser = new DocumentParser();
            const parsedContent = parser.parseDocument(document);

            const pageUrl = await confluenceService.syncToConfluence({
                title: parsedContent.title,
                content: parsedContent.content,
                labels: parsedContent.tags
            });

            vscode.window.showInformationMessage(`Successfully synced to Confluence!`, 'Open Page')
                .then(selection => {
                    if (selection === 'Open Page') {
                        vscode.env.openExternal(vscode.Uri.parse(pageUrl));
                    }
                });
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to sync to Confluence: ${error}`);
        }
    });

    // Sync entire project to Confluence
    let syncConfluenceProjectCommand = vscode.commands.registerCommand('confluence-sync.syncProject', async () => {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            vscode.window.showErrorMessage('No workspace folder open');
            return;
        }

        vscode.window.showInformationMessage('Confluence project sync feature coming soon!');
    });

    // ========== UNIFIED COMMANDS ==========
    
    // Sync to both platforms
    let syncBothCommand = vscode.commands.registerCommand('docs-sync.syncToBoth', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active file to sync');
            return;
        }

        const document = editor.document;
        const parser = new DocumentParser();
        const parsedContent = parser.parseDocument(document);

        let notionSuccess = false;
        let confluenceSuccess = false;
        let confluenceUrl = '';

        // Try syncing to Notion
        try {
            await notionService.syncToNotion(parsedContent);
            notionSuccess = true;
        } catch (error) {
            console.error('Notion sync failed:', error);
        }

        // Try syncing to Confluence
        try {
            confluenceUrl = await confluenceService.syncToConfluence({
                title: parsedContent.title,
                content: parsedContent.content,
                labels: parsedContent.tags
            });
            confluenceSuccess = true;
        } catch (error) {
            console.error('Confluence sync failed:', error);
        }

        // Show results
        if (notionSuccess && confluenceSuccess) {
            vscode.window.showInformationMessage(
                `Successfully synced to both Notion and Confluence!`,
                'Open Confluence Page'
            ).then(selection => {
                if (selection === 'Open Confluence Page') {
                    vscode.env.openExternal(vscode.Uri.parse(confluenceUrl));
                }
            });
        } else if (notionSuccess) {
            vscode.window.showWarningMessage('Synced to Notion only. Confluence sync failed.');
        } else if (confluenceSuccess) {
            vscode.window.showWarningMessage('Synced to Confluence only. Notion sync failed.');
        } else {
            vscode.window.showErrorMessage('Failed to sync to both platforms.');
        }
    });

    // Choose destination
    let chooseDestinationCommand = vscode.commands.registerCommand('docs-sync.chooseDestination', async () => {
        const destination = await vscode.window.showQuickPick(
            ['Notion', 'Confluence', 'Both'],
            { placeHolder: 'Choose where to sync documentation' }
        );

        if (!destination) { return; }

        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active file to sync');
            return;
        }

        switch (destination) {
            case 'Notion':
                vscode.commands.executeCommand('notion-sync.syncToNotion');
                break;
            case 'Confluence':
                vscode.commands.executeCommand('confluence-sync.syncToConfluence');
                break;
            case 'Both':
                vscode.commands.executeCommand('docs-sync.syncToBoth');
                break;
        }
    });

    // Show effective configuration (masked) for debugging
    let showConfigCommand = vscode.commands.registerCommand('docs-sync.showConfig', async () => {
        const out = vscode.window.createOutputChannel('Docs Sync Config');
        out.clear();

        const notionConfig = vscode.workspace.getConfiguration('notionSync');
        const confluenceConfig = vscode.workspace.getConfiguration('confluenceSync');

        const notionApi = process.env.NOTION_API_KEY || notionConfig.get<string>('apiKey') || '';
        const notionDb = process.env.NOTION_DATABASE_ID || notionConfig.get<string>('databaseId') || '';

        const confBase = process.env.CONFLUENCE_BASE_URL || confluenceConfig.get<string>('baseUrl') || '';
        const confUser = process.env.CONFLUENCE_USERNAME || confluenceConfig.get<string>('username') || '';
        const confSpace = process.env.CONFLUENCE_SPACE_KEY || confluenceConfig.get<string>('spaceKey') || '';

        const mask = (s: string) => {
            if (!s) { return '(not set)'; }
            if (s.length <= 8) { return '****'; }
            return s.slice(0, 4) + '...' + s.slice(-4);
        };

        out.appendLine('Docs Sync — Effective Configuration (masked)');
        out.appendLine('---');
        out.appendLine(`Notion API Key: ${mask(notionApi)}`);
        out.appendLine(`Notion Database ID: ${mask(notionDb)}`);
        out.appendLine('');
        out.appendLine(`Confluence Base URL: ${confBase || '(not set)'}`);
        out.appendLine(`Confluence Username: ${mask(confUser)}`);
        out.appendLine(`Confluence Space Key: ${confSpace || '(not set)'}`);

        out.show(true);
        vscode.window.showInformationMessage('Shown Docs Sync configuration in the Output panel (Docs Sync Config)');
    });

    // Set notionSync.databaseId from environment variable (or .env)
    let setDbFromEnvCommand = vscode.commands.registerCommand('docs-sync.setDatabaseFromEnv', async () => {
        const dbFromEnv = "2ffff72a55d580ffbd06ffcae89c7866";

        try {
            const cleaned = dbFromEnv.toString().trim().replace(/^['\"]|['\"]$/g, '');
            await vscode.workspace.getConfiguration('notionSync').update('databaseId', cleaned, vscode.ConfigurationTarget.Workspace);
            vscode.window.showInformationMessage('Set workspace `notionSync.databaseId` from environment (.env).');
        } catch (err) {
            console.error('Failed to set notionSync.databaseId from env:', err);
            vscode.window.showErrorMessage('Failed to set database ID from environment. See console for details.');
        }
    });

    // Clear saved workspace/global config for Notion and Confluence (useful for resetting cached IDs)
    let clearConfigCommand = vscode.commands.registerCommand('docs-sync.clearConfig', async () => {
        const confirm = await vscode.window.showWarningMessage(
            'This will remove `notionSync.databaseId` and Confluence settings from Workspace and Global settings. Continue?',
            { modal: true },
            'Yes'
        );

        if (confirm !== 'Yes') {
            return;
        }

        const notionKey = 'notionSync.databaseId';
        const confluenceKeys = ['confluenceSync.baseUrl','confluenceSync.username','confluenceSync.apiToken','confluenceSync.spaceKey','confluenceSync.parentPageId'];

        try {
            // Remove from Workspace settings
            await vscode.workspace.getConfiguration().update(notionKey, undefined, vscode.ConfigurationTarget.Workspace);
            for (const k of confluenceKeys) {
                await vscode.workspace.getConfiguration().update(k, undefined, vscode.ConfigurationTarget.Workspace);
            }

            // Remove from Global settings
            await vscode.workspace.getConfiguration().update(notionKey, undefined, vscode.ConfigurationTarget.Global);
            for (const k of confluenceKeys) {
                await vscode.workspace.getConfiguration().update(k, undefined, vscode.ConfigurationTarget.Global);
            }

            vscode.window.showInformationMessage('Cleared saved Notion and Confluence configuration from Workspace and Global settings.');
        } catch (err) {
            console.error('Error clearing config:', err);
            vscode.window.showErrorMessage('Failed to clear configuration. See console for details.');
        }
    });

    context.subscriptions.push(
        authenticateNotionCommand,
        syncNotionCommand,
        syncNotionProjectCommand,
        authenticateConfluenceCommand,
        syncConfluenceCommand,
        syncConfluenceProjectCommand,
        syncBothCommand,
        chooseDestinationCommand,
        showConfigCommand,
        setDbFromEnvCommand,
        clearConfigCommand
    );
}

export function deactivate() {}
