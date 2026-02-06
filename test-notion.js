#!/usr/bin/env node
/**
 * Quick test script to verify Notion credentials and database access.
 * Also lists all databases the integration can access.
 * Run: node test-notion.js
 */

require('dotenv').config();

const { Client } = require('@notionhq/client');

const apiKey = process.env.NOTION_API_KEY;
const databaseId = process.env.NOTION_DATABASE_ID;

if (!apiKey) {
    console.error('❌ Missing NOTION_API_KEY in .env');
    process.exit(1);
}

console.log('Testing Notion credentials...');
console.log(`API Key (masked): ${apiKey.slice(0, 10)}...${apiKey.slice(-10)}`);
console.log(`Database ID from .env: ${databaseId || '(not set)'}`);

const notion = new Client({ auth: apiKey });

(async () => {
    try {
        // Test 1: Check if API key is valid by fetching user info
        console.log('\n[1/4] Testing API key...');
        const user = await notion.users.me({});
        console.log(`✅ API key is valid. Workspace: ${user.workspace_name || 'Unknown'}`);

        // Test 2: List all accessible databases
        console.log('\n[2/4] Listing all accessible databases...');
        const searchResults = await notion.search({
            filter: { property: 'object', value: 'database' },
            sort: { direction: 'descending', timestamp: 'last_edited_time' }
        });

        if (searchResults.results.length === 0) {
            console.log('⚠️  No databases found. Make sure you have shared databases with the integration.');
        } else {
            console.log(`✅ Found ${searchResults.results.length} database(s):\n`);
            searchResults.results.forEach((db, i) => {
                const dbId = db.id.replace(/-/g, '');
                const title = db.title?.[0]?.plain_text || 'Untitled';
                console.log(`  ${i + 1}. "${title}"`);
                console.log(`     ID (no dashes): ${dbId}`);
                console.log(`     ID (with dashes): ${db.id}`);
            });
        }

        // Test 3: Try to fetch the configured database (if set)
        if (databaseId) {
            console.log(`\n[3/4] Testing configured database...`);
            try {
                const db = await notion.databases.retrieve({ database_id: databaseId });
                console.log(`✅ Database found! Title: ${db.title?.[0]?.plain_text || 'Untitled'}`);

                // Test 4: Query the database
                console.log('\n[4/4] Querying database...');
                const query = await notion.databases.query({ database_id: databaseId });
                console.log(`✅ Database query successful. Pages in DB: ${query.results.length}`);
                console.log('\n✅ All tests passed! Your credentials are working.');
            } catch (dbError) {
                console.log(`❌ Configured database not found or not shared.`);
                console.log(`   Error: ${dbError.message}`);
                console.log('\n   ⚠️  Your DATABASE_ID might be incorrect or the integration is not shared with it.');
                console.log('   Check the list above and update NOTION_DATABASE_ID in .env with the correct ID.');
            }
        } else {
            console.log('\n[3/4] No database ID configured.');
            console.log('   Pick a database from the list above and set NOTION_DATABASE_ID in .env');
        }
    } catch (error) {
        console.error('\n❌ Error:', error.message);
        process.exit(1);
    }
})();
