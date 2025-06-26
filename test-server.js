import express from 'express';
import { createServer } from 'http';

const app = express();
const server = createServer(app);

app.get('/', (req, res) => {
  res.send('Server is working!');
});

const port = 9000;
server.listen(port, '0.0.0.0', () => {
  console.log(`Test server running on port ${port}`);
});