# Example Usage Guide

## Quick Start

### Step 1: Set Up Notion

1. **Create Integration:**
   - Visit: https://www.notion.so/my-integrations
   - Click "New integration"
   - Give it a name: "VS Code Docs"
   - Copy the secret token

2. **Create Database:**
   ```
   In Notion:
   → New Page
   → Add a Database (full page)
   → Add these columns:
      - Name (Title) ✓
      - Language (Select)
      - Tags (Multi-select)
   → Share with your integration (... → Connections → Add your integration)
   ```

3. **Get Database ID:**
   - Open database as full page
   - Copy URL: `https://notion.so/workspace/abc123...?v=xyz`
   - The part between workspace and `?v=` is your Database ID

### Step 2: Install & Run

```bash
# In your project directory
npm install

# Compile TypeScript
npm run compile

# Or run in watch mode during development
npm run watch
```

### Step 3: Test the Extension

1. Press `F5` in VS Code (opens Extension Development Host)
2. In the new window, open Command Palette (`Cmd+Shift+P` or `Ctrl+Shift+P`)
3. Run: `Notion: Authenticate`
4. Paste your Integration Token
5. Paste your Database ID

### Step 4: Sync a File

1. Open any code file (`.js`, `.ts`, `.py`, etc.)
2. Command Palette → `Notion: Sync Current File`
3. Check your Notion database!

## Example Code to Test With

Create a test file `test.js`:

```javascript
/**
 * User Authentication Service
 * 
 * Handles user login, registration, and session management.
 * Uses JWT tokens for authentication.
 * 
 * @author Your Name
 * @version 1.0.0
 */

/**
 * Authenticates a user with email and password
 * 
 * @param {string} email - User's email address
 * @param {string} password - User's password
 * @returns {Promise<Object>} Authentication token and user data
 * @throws {Error} If credentials are invalid
 */
async function authenticateUser(email, password) {
    // Authentication logic here
    return {
        token: 'jwt-token-here',
        user: { email, id: 123 }
    };
}

/**
 * Validates a JWT token
 * 
 * @param {string} token - JWT token to validate
 * @returns {boolean} True if token is valid
 */
function validateToken(token) {
    // Validation logic
    return true;
}
```

Now sync this file to Notion and see how the documentation is extracted!

## Advanced Usage

### Custom Database Schema

Modify `src/notionService.ts` to match your database properties:

```typescript
properties: {
    Name: {
        title: [{ text: { content: docContent.title } }]
    },
    Language: {
        select: { name: docContent.language }
    },
    "File Path": {
        rich_text: [{ text: { content: docContent.filePath } }]
    },
    Tags: {
        multi_select: docContent.tags?.map(tag => ({ name: tag })) || []
    },
    Status: {
        select: { name: "Draft" }
    }
}
```

### Auto-sync on Save

Add this to `src/extension.ts`:

```typescript
// Watch for file saves
vscode.workspace.onDidSaveTextDocument(async (document) => {
    const config = vscode.workspace.getConfiguration('notionSync');
    const autoSync = config.get<boolean>('autoSyncOnSave');
    
    if (autoSync) {
        const parser = new DocumentParser();
        const parsedContent = parser.parseDocument(document);
        await notionService.syncToNotion(parsedContent);
    }
});
```

And add to `package.json`:

```json
"notionSync.autoSyncOnSave": {
    "type": "boolean",
    "default": false,
    "description": "Automatically sync files to Notion on save"
}
```

## Troubleshooting

### Common Issues

**Error: "object_type must be database_id"**
- Your database ID is incorrect
- Make sure you copied the ID from the database URL correctly

**Error: "Unauthorized"**
- Check your integration token
- Ensure the integration has access to your database

**No pages appearing in Notion**
- Verify the integration is connected to your database
- Check database permissions in Notion

### Debugging

Enable verbose logging in `src/notionService.ts`:

```typescript
console.log('Syncing document:', docContent);
console.log('Using database:', databaseId);
console.log('Response:', response);
```

## Next Steps

- Add more language parsers
- Implement bi-directional sync
- Create custom Notion templates
- Add search functionality
- Integrate with git commit hooks
