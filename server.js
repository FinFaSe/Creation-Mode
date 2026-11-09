const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = __dirname;
const publicFiles = { '/': ['index.html', 'text/html'], '/app.js': ['app.js', 'text/javascript'], '/styles.css': ['styles.css', 'text/css'], '/markets.js': ['markets.js', 'text/javascript'] };
http.createServer((req, res) => {
  const file = publicFiles[new URL(req.url, 'http://localhost').pathname];
  if (!file) { res.writeHead(404); res.end('No encontrado'); return; }
  fs.readFile(path.join(root, file[0]), (err, data) => {
    res.writeHead(err ? 500 : 200, { 'Content-Type': `${file[1]}; charset=utf-8` });
    res.end(err ? 'Error al leer el archivo' : data);
  });
}).listen(process.env.PORT || 3000, '0.0.0.0', () => console.log('Creation Mode en puerto ' + (process.env.PORT || 3000)));
