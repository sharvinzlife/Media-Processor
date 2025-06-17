const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(cors());

// Serve static files from the React app
app.use(express.static(path.join(__dirname, 'build')));

// Proxy API requests to the Python backend
app.use('/api', createProxyMiddleware({ 
  target: 'http://127.0.0.1:5001',
  changeOrigin: true
}));

// For any request that doesn't match the above, send back React's index.html file
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`Proxy server listening on port ${port}`);
  console.log(`Forwarding API requests to http://127.0.0.1:5001`);
});
