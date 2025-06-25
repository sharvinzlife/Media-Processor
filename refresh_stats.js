const fs = require('fs');
const path = require('path');

// Read stats directly from file
const statsPath = path.join(__dirname, 'web-app/api/stats.json');
console.log('Reading from:', statsPath);

try {
  const data = fs.readFileSync(statsPath, 'utf8');
  const stats = JSON.parse(data);
  
  console.log('File contents:');
  console.log('English Movies:', stats.english_movies);
  console.log('Malayalam Movies:', stats.malayalam_movies);
  console.log('Malayalam TV Shows:', stats.malayalam_tv_shows);
  console.log('Total files:', stats.files.length);
  
  // Test API call
  const http = require('http');
  
  const options = {
    hostname: 'localhost',
    port: 3005,
    path: '/api/stats',
    method: 'GET'
  };
  
  const req = http.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    res.on('end', () => {
      console.log('\nAPI Response:');
      console.log(data);
    });
  });
  
  req.on('error', (e) => {
    console.error('API request failed:', e);
  });
  
  req.end();
  
} catch (error) {
  console.error('Error reading stats:', error);
}