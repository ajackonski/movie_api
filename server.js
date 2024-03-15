
const http = require('http');
const url = require('url');
const fs = require('fs');

// Create a server
const server = http.createServer((req, res) => {
    // Parse the request URL
    const parsedUrl = url.parse(req.url, true);

    // Get the current timestamp
    const timestamp = new Date().toISOString();

    // Log the request to the console
    console.log(`[${timestamp}] Received request for ${parsedUrl.pathname}`);

    // Log the request to a file
    const logMessage = `[${timestamp}] ${req.method} ${parsedUrl.pathname}\n`;
    fs.appendFile('log.txt', logMessage, (err) => {
        if (err) {
            console.error('Error writing to log file:', err);
        }
    });

    // Send a response
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Hello World!\n');
});

// Start the server on port 8080
const PORT = 8080;
server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
});