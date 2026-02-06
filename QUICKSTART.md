# Quick Start Guide

Get up and running with Notion & Confluence sync in 10 minutes!

## Prerequisites

- VS Code installed
- Node.js and npm installed
- Access to Notion and/or Confluence

## Step 1: Install Dependencies (2 min)

```bash
cd vscode-notion-integration
npm install
```

## Step 2: Choose Your Platform(s)

### Option A: Notion Only

1. Create integration: https://www.notion.so/my-integrations
2. Create database in Notion
3. Copy integration token & database ID
4. Run in VS Code: `Notion: Authenticate`

### Option B: Confluence Only

1. Create API token: https://id.atlassian.com/manage-profile/security/api-tokens
2. Find your space key in Confluence
3. Run in VS Code: `Confluence: Authenticate`
4. Enter: base URL, email, API token, space key

### Option C: Both Platforms

Follow both Option A and Option B above!

## Step 3: Compile & Run (3 min)

```bash
# Compile TypeScript
npm run compile

# Or run in watch mode
npm run watch
```

Then press **F5** in VS Code to launch the extension in development mode.

## Step 4: Test It! (2 min)

1. Open any code file (`.js`, `.py`, `.ts`, etc.)
2. Command Palette (`Cmd+Shift+P` or `Ctrl+Shift+P`)
3. Run one of:
   - `Notion: Sync Current File`
   - `Confluence: Sync Current File`
   - `Docs: Sync to Both Notion & Confluence`

4. Check your Notion database or Confluence space!

## Common First-Time Issues

### "Notion not authenticated"
→ Run `Notion: Authenticate` first

### "Confluence connection failed"
→ Check your base URL format: `https://your-domain.atlassian.net`

### "401 Unauthorized" (Confluence)
→ Verify you're using your API token, not your password

### "Database not found" (Notion)
→ Make sure the integration has access to your database

## Next Steps

- Read [CONFLUENCE.md](./CONFLUENCE.md) for detailed Confluence setup
- Check [EXAMPLES.md](./EXAMPLES.md) for usage examples
- See [COMPARISON.md](./COMPARISON.md) to choose between platforms

## Commands Cheat Sheet

```
Notion Commands:
├── Notion: Authenticate
├── Notion: Sync Current File
└── Notion: Sync Entire Project (coming soon)

Confluence Commands:
├── Confluence: Authenticate
├── Confluence: Sync Current File
└── Confluence: Sync Entire Project (coming soon)

Unified Commands:
├── Docs: Sync to Both Notion & Confluence
└── Docs: Choose Sync Destination
```

Happy documenting! 📚
