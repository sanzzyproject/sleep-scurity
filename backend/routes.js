const express = require('express');
const router = express.Router();

// GET endpoint to check server status
router.get('/status', (req, res) => {
    res.json({ 
        success: true, 
        message: 'Security API is running smoothly.',
        timestamp: new Date().toISOString()
    });
});

// POST endpoint for potential future logging/auth
router.post('/log', (req, res) => {
    const { event, details } = req.body;
    console.log(`[LOG] Event: ${event}`, details);
    res.json({ success: true, message: 'Log received' });
});

module.exports = router;
