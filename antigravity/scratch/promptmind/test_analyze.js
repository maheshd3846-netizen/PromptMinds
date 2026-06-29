const http = require('http');

const data = JSON.stringify({
  prompt: 'make a list of ideas'
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/analyze',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    console.log('STATUS:', res.statusCode);
    try {
      const parsed = JSON.parse(body);
      console.log('SUCCESS! Parsed Response keys:', Object.keys(parsed));
      console.log('Score:', parsed.score);
      console.log('Analysis Breakdown:', JSON.stringify(parsed.analysis, null, 2));
      console.log('Heatmap Sample:', parsed.heatmap ? JSON.stringify(parsed.heatmap.slice(0, 5), null, 2) : null);
      process.exit(res.statusCode === 200 ? 0 : 1);
    } catch (e) {
      console.error('Failed to parse JSON response:', body);
      process.exit(1);
    }
  });
});

req.on('error', (e) => {
  console.error('Request error:', e.message);
  process.exit(1);
});

req.write(data);
req.end();
