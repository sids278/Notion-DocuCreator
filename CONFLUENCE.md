# Confluence Integration Guide

Complete guide for setting up and using Confluence API integration with VS Code.

## Table of Contents
- [Getting API Credentials](#getting-api-credentials)
- [Configuration](#configuration)
- [Usage](#usage)
- [Advanced Features](#advanced-features)
- [Troubleshooting](#troubleshooting)

## Getting API Credentials

### Step 1: Create an API Token

1. **Go to Atlassian Account Settings:**
   - Visit: https://id.atlassian.com/manage-profile/security/api-tokens
   - Log in with your Atlassian account

2. **Create a new API token:**
   - Click "Create API token"
   - Give it a label (e.g., "VS Code Documentation Sync")
   - Click "Create"
   - **Copy the token immediately** - you won't see it again!

### Step 2: Find Your Confluence Details

1. **Base URL:**
   - Your Confluence URL format: `https://your-domain.atlassian.net`
   - Example: If you access Confluence at `https://acme.atlassian.net/wiki`, your base URL is `https://acme.atlassian.net`

2. **Space Key:**
   - Go to your Confluence space
   - Click "Space settings" (bottom left)
   - Look for "Space details" → "Key" field
   - Example: `DOCS`, `TEAM`, `DEV`

3. **Parent Page ID (Optional):**
   - Navigate to the page you want as parent
   - Look at the URL: `https://your-domain.atlassian.net/wiki/spaces/DOCS/pages/123456789/Page+Title`
   - The number `123456789` is your page ID

## Configuration

### Method 1: Using VS Code Command (Recommended)

1. Open Command Palette (`Cmd+Shift+P` or `Ctrl+Shift+P`)
2. Run: `Confluence: Authenticate`
3. Enter:
   - Base URL: `https://your-domain.atlassian.net`
   - Username: Your email address
   - API Token: The token you created
   - Space Key: Your space key (e.g., `DOCS`)
   - Parent Page ID: (Optional) Leave empty for root level

### Method 2: Manual Configuration

Edit VS Code settings (JSON):

```json
{
  "confluenceSync.baseUrl": "https://your-domain.atlassian.net",
  "confluenceSync.username": "your-email@example.com",
  "confluenceSync.apiToken": "your-api-token-here",
  "confluenceSync.spaceKey": "DOCS",
  "confluenceSync.parentPageId": "123456789"
}
```

## Usage

### Sync Single File to Confluence

1. Open any code file
2. Command Palette → `Confluence: Sync Current File`
3. Page will be created/updated in Confluence
4. Click "Open Page" to view in browser

### Sync to Both Notion and Confluence

1. Open any code file
2. Command Palette → `Docs: Sync to Both Notion & Confluence`
3. Documents sync to both platforms simultaneously

### Choose Destination Interactively

1. Open any code file
2. Command Palette → `Docs: Choose Sync Destination`
3. Select: Notion, Confluence, or Both

## How It Works

### Page Creation
- Extension checks if a page with the same title exists
- If **no existing page**: Creates a new page
- If **page exists**: Updates the existing page (increments version)

### Content Conversion
The extension converts your code documentation to Confluence Storage Format:

**Markdown → Confluence:**
- `# Header` → `<h1>Header</h1>`
- `## Header` → `<h2>Header</h2>`
- ` ```code``` ` → Confluence code macro
- `**bold**` → `<strong>bold</strong>`
- `*italic*` → `<em>italic</em>`
- Bullet lists → `<ul>` elements

### Labels/Tags
Files are automatically tagged based on:
- Programming language
- Content type (class, function, interface)
- Special markers (TODO, FIXME)

## Advanced Features

### Setting a Parent Page

All created pages can be nested under a parent:

```typescript
// In extension.ts or your code
const pageUrl = await confluenceService.syncToConfluence({
    title: 'My Documentation',
    content: documentContent,
    labels: ['api', 'backend'],
    parentId: '123456789'  // Specific parent
});
```

### Custom Labels

```typescript
const pageUrl = await confluenceService.syncToConfluence({
    title: 'Authentication Service',
    content: docContent,
    labels: ['authentication', 'security', 'api', 'v2']
});
```

### Listing Spaces

Get all available spaces programmatically:

```typescript
const spaces = await confluenceService.getSpaces();
spaces.forEach(space => {
    console.log(`${space.name} - ${space.key}`);
});
```

### Listing Pages in a Space

```typescript
const pages = await confluenceService.getPages('DOCS');
pages.forEach(page => {
    console.log(`${page.title} - ${page.id}`);
});
```

## Confluence Storage Format

Confluence uses a specific XML-based storage format. Here's what you need to know:

### Basic Elements
```xml
<!-- Paragraphs -->
<p>This is a paragraph</p>

<!-- Headers -->
<h1>Header 1</h1>
<h2>Header 2</h2>
<h3>Header 3</h3>

<!-- Lists -->
<ul>
  <li>Item 1</li>
  <li>Item 2</li>
</ul>
```

### Macros (Advanced)

**Code Block:**
```xml
<ac:structured-macro ac:name="code">
  <ac:parameter ac:name="language">javascript</ac:parameter>
  <ac:plain-text-body><![CDATA[
    function hello() {
      console.log("Hello World");
    }
  ]]></ac:plain-text-body>
</ac:structured-macro>
```

**Info Panel:**
```xml
<ac:structured-macro ac:name="info">
  <ac:rich-text-body>
    <p>This is an info panel</p>
  </ac:rich-text-body>
</ac:structured-macro>
```

## Troubleshooting

### Authentication Issues

**Error: "401 Unauthorized"**
- Check that your API token is correct
- Verify your email/username is correct
- Make sure you're using the token, not your password

**Error: "403 Forbidden"**
- You don't have permission to create pages in this space
- Ask your Confluence admin to grant you permission
- Verify the space key is correct

### Connection Issues

**Error: "Cannot connect to Confluence"**
- Verify your base URL is correct
- Check you're not behind a firewall blocking Confluence
- Test the URL in a browser: `https://your-domain.atlassian.net/wiki`

**Error: "ENOTFOUND"**
- Your domain name is incorrect
- Check for typos in the base URL
- Ensure you're using `.atlassian.net` for cloud instances

### Page Creation Issues

**Pages aren't appearing**
- Check the space key is correct
- Verify you have permission to create pages
- Look in the space's page tree (might be at root level)

**Error: "Space not found"**
- Space key is case-sensitive (use uppercase)
- Verify the space exists and you have access
- Check you're logged into the right Confluence instance

**Error: "Page already exists"**
- This shouldn't happen as the extension updates existing pages
- If it does, manually delete the old page and try again

### Content Formatting Issues

**Code blocks not rendering properly**
- Check that code fence markers (```) are properly closed
- Verify language identifier is supported by Confluence
- Try without language identifier

**Special characters breaking content**
- HTML entities might need escaping
- Use `<![CDATA[...]]>` for literal content
- Check for unescaped `<` and `>` characters

## API Rate Limits

Atlassian Cloud has rate limits:
- **Standard**: ~200 requests per minute per user
- **App limits**: ~2000 requests per minute

The extension should stay well under these limits for normal use.

## Security Best Practices

1. **Never commit API tokens** to version control
2. **Use API tokens, not passwords** for authentication
3. **Rotate tokens periodically** (every 90 days recommended)
4. **Use specific space permissions** rather than global admin access
5. **Keep tokens in VS Code settings** (stored securely)

## Permissions Required

Your Confluence user needs:
- ✅ **View** space permission
- ✅ **Create** page permission
- ✅ **Edit** page permission (for updates)
- ✅ **Add labels** permission (optional but recommended)

## Next Steps

- Set up automatic sync on file save
- Create custom Confluence templates
- Build hierarchical documentation structure
- Integrate with CI/CD pipeline
- Export entire codebase documentation

## Resources

- [Confluence REST API Documentation](https://developer.atlassian.com/cloud/confluence/rest/v1/intro/)
- [Confluence Storage Format](https://confluence.atlassian.com/doc/confluence-storage-format-790796544.html)
- [API Token Management](https://id.atlassian.com/manage-profile/security/api-tokens)
- [Atlassian Developer Community](https://community.developer.atlassian.com/)
