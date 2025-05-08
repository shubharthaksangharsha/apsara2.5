// get_gmail_refresh_token.js
import { google } from 'googleapis';
import http from 'http';
import url from 'url';
import open from 'open'; // npm install open
import readline from 'readline/promises'; // Built-in
import fs from 'fs';

// --- Start Configuration ---
// Load credentials from your credentials.json
let credentials;
try {
    const credsFile = fs.readFileSync('./credentials.json'); // Make sure this path is correct
    credentials = JSON.parse(credsFile.toString()).installed || JSON.parse(credsFile.toString()).web;
    if (!credentials) throw new Error("Could not find 'installed' or 'web' key in credentials.json");
} catch (err) {
    console.error("Error reading or parsing credentials.json:", err.message);
    console.error("Please ensure 'credentials.json' exists in the current directory and is correctly formatted.");
    process.exit(1);
}

const { client_secret, client_id, redirect_uris } = credentials;
const REDIRECT_URI = redirect_uris[0]; // Use the first redirect URI

// Scopes define the level of access you are requesting.
const SCOPES = [
    'https://www.googleapis.com/auth/gmail.send',      // Already had
    'https://www.googleapis.com/auth/gmail.readonly',  // Good for listing/getting messages
    'https://www.googleapis.com/auth/gmail.compose',  // Needed for creating drafts
    'https://www.googleapis.com/auth/gmail.modify',   // Often needed to manage drafts/labels etc.
    'https://www.googleapis.com/auth/calendar'        // For future Calendar tools
];
// --- End Configuration ---

const oauth2Client = new google.auth.OAuth2(client_id, client_secret, REDIRECT_URI);

async function main() {
    const server = http.createServer(async (req, res) => {
        try {
            const qs = new url.URL(req.url, `http://localhost:${PORT}`).searchParams;
            const code = qs.get('code');

            if (code) {
                res.end('Authentication successful! You can close this tab. Check your console.');
                console.log(`\nAuthorization code received: ${code}`);
                server.close();

                const { tokens } = await oauth2Client.getToken(code);
                oauth2Client.setCredentials(tokens);
                console.log('\nTokens acquired:');
                console.log('Access Token:', tokens.access_token);
                if (tokens.refresh_token) {
                    console.log('--------------------------------------------------------------------');
                    console.log('IMPORTANT: Refresh Token:', tokens.refresh_token);
                    console.log('--------------------------------------------------------------------');
                    console.log('\nACTION REQUIRED:');
                    console.log('1. Copy the Refresh Token above.');
                    console.log('2. Add it to your .env file like this:');
                    console.log(`   GMAIL_REFRESH_TOKEN=${tokens.refresh_token}`);
                    console.log('3. Also add your client ID and secret to .env if not already there:');
                    console.log(`   GMAIL_CLIENT_ID=${client_id}`);
                    console.log(`   GMAIL_CLIENT_SECRET=${client_secret}`);
                    console.log('   GMAIL_REDIRECT_URI=' + REDIRECT_URI);

                } else {
                    console.log('--------------------------------------------------------------------');
                    console.log('WARNING: No Refresh Token received.');
                    console.log('This might happen if you have previously authorized this app for these scopes.');
                    console.log('To force a new refresh token, you might need to revoke access for this app ');
                    console.log('from your Google account settings (https://myaccount.google.com/permissions) and try again.');
                    console.log('Or, if you are using a service account, this flow is not applicable.');
                    console.log('Access token (short-lived):', tokens.access_token);
                    console.log('--------------------------------------------------------------------');
                }
                process.exit(0); // Exit after getting the token
            } else {
                res.end('Waiting for authentication...');
            }
        } catch (e) {
            console.error('Error during OAuth callback:', e);
            res.end('Authentication failed. Check console.');
            server.close();
            process.exit(1);
        }
    }).listen(PORT, () => {
        const authorizeUrl = oauth2Client.generateAuthUrl({
            access_type: 'offline', // IMPORTANT: requests a refresh token
            scope: SCOPES,
            prompt: 'consent' // Optional: forces consent screen even if already authorized, good for getting refresh token again
        });
        console.log('--------------------------------------------------------------------');
        console.log('ACTION REQUIRED: Authorize this app by visiting this url:');
        console.log(authorizeUrl);
        console.log('--------------------------------------------------------------------');
        open(authorizeUrl, { wait: false }).catch(err => console.warn("Failed to open browser automatically:", err.message));
    });
    console.log(`\nOAuth2 server listening on http://localhost:${PORT}`);
    console.log(`Ensure "${REDIRECT_URI}" is one of your authorized redirect URIs in Google Cloud Console.`);
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
let PORT = 3000; // Default port

(async () => {
    try {
        const redirectUriObj = new URL(REDIRECT_URI);
        if (redirectUriObj.hostname.toLowerCase() !== 'localhost' && redirectUriObj.hostname !== '127.0.0.1') {
            console.warn(`\nWARNING: Your redirect URI "${REDIRECT_URI}" is not localhost.`);
            console.warn(`This script's local server may not be reachable for the OAuth redirect.`);
            console.warn(`Make sure your redirect URI points to the machine where this script is running.`);
        }
        PORT = parseInt(redirectUriObj.port) || PORT; // Use port from redirect URI if specified
    } catch (e) {
        console.error(`Invalid REDIRECT_URI in credentials.json: ${REDIRECT_URI}. It should be like http://localhost:3000`);
        process.exit(1);
    }

    const answer = await rl.question(`\nThis script will attempt to open a browser for Google OAuth2 authentication to get a refresh token for Gmail.
It will start a temporary server on port ${PORT} using the redirect URI: ${REDIRECT_URI}.
Make sure this redirect URI is configured in your Google Cloud project for the client ID: ${client_id}.
Press ENTER to continue, or CTRL+C to abort: `);
    rl.close();
    main().catch(console.error);
})();