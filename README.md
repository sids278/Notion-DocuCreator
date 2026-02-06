# VS Code Documentation Sync (Notion + Confluence)

A VS Code extension that syncs your code documentation to **Notion** and **Confluence** automatically.

## Features

- 🔄 Sync to Notion, Confluence, or both
- 📝 Extract documentation comments (JSDoc, Python docstrings, etc.)
- 🏷️ Auto-tag documents based on content
- 🔐 Secure credential storage
- ⚡ Update existing pages automatically
- 🌐 Support for both Notion databases and Confluence spaces

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Notion (Optional)

See original instructions below or skip to Confluence setup.

### 3. Set Up Confluence

1. **Create API Token:**

   - Visit: https://id.atlassian.com/manage-profile/security/api-tokens
   - Click "Create API token"
   - Copy the token
2. **Get Space Key:**

   - Go to your Confluence space
   - Space settings → Space details → Key
   - Example: `DOCS`, `TEAM`, `DEV`
3. **Authenticate in VS Code:**

   - Command: `Confluence: Authenticate`
   - Enter: Base URL, username (email), API token, space key

📖 **Detailed Confluence setup:** See [CONFLUENCE.md](./CONFLUENCE.md)

### 4. Start Syncing!

```bash
# Compile the extension
npm run compile

# Press F5 in VS Code to test
```

**Commands:**

- `Confluence: Sync Current File` - Sync to Confluence
- `Notion: Sync Current File` - Sync to Notion
- `Docs: Sync to Both Notion & Confluence` - Sync to both!
- `Docs: Choose Sync Destination` - Pick where to sync

## Documentation

- **[README.md](./README.md)** - This file (overview)
- **[CONFLUENCE.md](./CONFLUENCE.md)** - Complete Confluence setup & troubleshooting
- **[EXAMPLES.md](./EXAMPLES.md)** - Usage examples and code samples

### 1. Create a Notion Integration

1. Go to [Notion Integrations](https://www.notion.so/my-integrations)
2. Click "+ New integration"
3. Name it (e.g., "VS Code Docs Sync")
4. Select the workspace
5. Copy the **Integration Token** (starts with `secret_`)

### 2. Create a Notion Database

1. In Notion, create a new page
2. Add a **Database - Full page**
3. Add these properties:

   - **Name** (Title) - already exists
   - **Language** (Select) - optional
   - **File Path** (Text) - optional
   - **Tags** (Multi-select) - optional
4. Click "..." → "Connections" → Add your integration
5. Get the Database ID:

   - Open the database as a full page
   - Copy the URL: `https://notion.so/workspace/<DATABASE_ID>?v=...`
   - Extract the DATABASE_ID (between workspace name and `?v=`)

### 3. Install Dependencies

```bash
npm install
```

### 4. Development

```bash
# Compile TypeScript
npm run compile

# Watch mode (auto-compile on changes)
npm run watch
```

### 5. Run the Extension

1. Press `F5` in VS Code to open Extension Development Host
2. In the new window, run command: `Notion: Authenticate`
3. Enter your Integration Token and Database ID
4. Open any code file and run: `Notion: Sync Current File`

## Commands

### Notion Commands

- **Notion: Authenticate** - Set up Notion credentials
- **Notion: Sync Current File** - Sync the active file to Notion
- **Notion: Sync Entire Project** - (Coming soon) Sync all files in workspace

### Confluence Commands

- **Confluence: Authenticate** - Set up Confluence credentials
- **Confluence: Sync Current File** - Sync the active file to Confluence
- **Confluence: Sync Entire Project** - (Coming soon) Sync all files in workspace

### Unified Commands

- **Docs: Sync to Both Notion & Confluence** - Sync to both platforms at once
- **Docs: Choose Sync Destination** - Interactively choose where to sync

## Configuration

Settings are stored in VS Code settings:

### Notion Settings

```json
{
  "notionSync.apiKey": "your-integration-token",
  "notionSync.databaseId": "your-database-id"
}
```

### Confluence Settings

```json
{
  "confluenceSync.baseUrl": "https://your-domain.atlassian.net",
  "confluenceSync.username": "your-email@example.com",
  "confluenceSync.apiToken": "your-api-token",
  "confluenceSync.spaceKey": "DOCS",
  "confluenceSync.parentPageId": "123456789"
}
```

### General Settings

```json
{
  "docsSync.defaultDestination": "both"  // "notion", "confluence", or "both"
}
```

## Supported Languages

Currently extracts documentation from:

- JavaScript/TypeScript (JSDoc comments)
- Python (docstrings)
- Java, C, C++ (Javadoc/Doxygen style)

## Next Steps

### Planned Features

- [ ] Bi-directional sync (Notion → VS Code)
- [ ] Auto-sync on file save
- [ ] Workspace-wide documentation generation
- [ ] Support for more documentation formats
- [ ] Integration with GitHub
- [ ] Custom Notion templates
- [ ] Search Notion docs from VS Code

### Extending the Code

**Add support for new languages:**

Edit `src/documentParser.ts` and add a new case in `extractDocumentation()`:

```typescript
case 'ruby':
    docContent = this.extractRubyDocs(content);
    break;
```

**Customize Notion page properties:**

Edit `src/notionService.ts` in the `syncToNotion()` method to add more properties matching your database schema.

**Add more commands:**

Register new commands in `src/extension.ts` and add them to `package.json` under `contributes.commands`.

## Troubleshooting

**"Notion not authenticated" error:**

- Run `Notion: Authenticate` command first
- Verify your integration token is valid

**"Database ID not configured" error:**

- Make sure you entered the database ID during authentication
- Check it matches your Notion database URL

**Pages not appearing in Notion:**

- Ensure your integration has access to the database
- Check "Connections" in your Notion database settings

## Development

### Project Structure

```
vscode-notion-integration/
├── src/
│   ├── extension.ts           # Main extension entry point
│   ├── notionService.ts       # Notion API wrapper
│   ├── confluenceService.ts   # Confluence API wrapper
│   └── documentParser.ts      # Code documentation extractor
├── package.json               # Extension manifest
├── tsconfig.json             # TypeScript config
├── README.md                 # This file
├── CONFLUENCE.md             # Confluence setup guide
└── EXAMPLES.md               # Usage examples
```

### Building

```bash
npm run compile
```

### Testing

Press `F5` in VS Code to launch the Extension Development Host.

## License

MIT

## Contributing

Pull requests welcome! Areas for contribution:

- Additional language support
- Better documentation parsing
- UI improvements
- Bug fixes
