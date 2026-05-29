const express = require('express');
const https = require('https');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'static')));

// Serve index.html at root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'static', 'index.html'));
});

// GitHub upload API route
app.post('/api/upload-to-github', async (req, res) => {
    const { fileName, content, path } = req.body;
    
    if (!content || !path) {
        return res.status(400).json({ error: 'Missing content or path' });
    }

    const repoOwner = 'Pe-bot603';
    const repoName = 'creative-canvas';
    const branch = 'main';
    
    // GitHub API request
    const apiPath = `/repos/${repoOwner}/${repoName}/contents/${path}`;
    
    const options = {
        hostname: 'api.github.com',
        path: apiPath,
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`,
            'Content-Type': 'application/json',
            'Accept': 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28'
        }
    };

    const request = https.request(options, (response) => {
        let data = '';
        response.on('data', (chunk) => data += chunk);
        response.on('end', () => {
            if (response.statusCode >= 200 && response.statusCode < 300) {
                res.json({ success: true, message: 'File uploaded' });
            } else {
                res.status(response.statusCode).json({ error: data });
            }
        });
    });

    request.on('error', (error) => {
        res.status(500).json({ error: error.message });
    });

    const body = JSON.stringify({
        message: `Upload project: ${fileName}`,
        content: content,
        branch: branch
    });

    request.write(body);
    request.end();
});

app.listen(3001, () => {
    console.log('API server running on port 3001');
});