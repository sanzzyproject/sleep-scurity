const express = require('express');
const path = require('path');
const apiRoutes = require('./routes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// API Routes
app.use('/api', apiRoutes);

// Serve static frontend files (used for local development)
app.use(express.static(path.join(__dirname, '../frontend')));

// Fallback to index.html for any other frontend routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Start server locally (Vercel will bypass this listening phase)
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}

// Export for Vercel Serverless
module.exports = app;
