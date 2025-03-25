const esbuild = require('esbuild');
const { nodeExternalsPlugin } = require('esbuild-node-externals');
const path = require('path');
const fs = require('fs');
const http = require('http');

// Read environment variables from .env file
require('dotenv').config();

const BUILD_DIR = './build';

// Create build directory if it doesn't exist
if (!fs.existsSync(BUILD_DIR)) {
  fs.mkdirSync(BUILD_DIR);
}

// Copy HTML file to build directory
fs.copyFileSync('./public/index.html', path.join(BUILD_DIR, 'index.html'));

// Copy static assets from public folder to build
const copyPublicFolder = () => {
  const publicFiles = fs.readdirSync('./public');
  publicFiles.forEach(file => {
    if (file !== 'index.html') {
      const sourcePath = path.join('./public', file);
      const destPath = path.join(BUILD_DIR, file);
      
      if (fs.lstatSync(sourcePath).isDirectory()) {
        if (!fs.existsSync(destPath)) {
          fs.mkdirSync(destPath, { recursive: true });
        }
        const nestedFiles = fs.readdirSync(sourcePath);
        nestedFiles.forEach(nestedFile => {
          fs.copyFileSync(
            path.join(sourcePath, nestedFile),
            path.join(destPath, nestedFile)
          );
        });
      } else {
        fs.copyFileSync(sourcePath, destPath);
      }
    }
  });
};

copyPublicFolder();

// Collect environment variables
const defineEnv = {};
Object.keys(process.env).forEach(key => {
  if (key.startsWith('REACT_APP_')) {
    defineEnv[`process.env.${key}`] = JSON.stringify(process.env[key]);
  }
});

// ESBuild configuration
const buildOptions = {
  entryPoints: ['./src/index.tsx'],
  bundle: true,
  minify: process.env.NODE_ENV === 'production',
  sourcemap: true,
  sourceRoot: '/',
  outdir: BUILD_DIR,
  platform: 'browser',
  target: ['es2020'],
  loader: {
    '.js': 'jsx',
    '.jsx': 'jsx',
    '.ts': 'tsx',
    '.tsx': 'tsx',
    '.png': 'file',
    '.jpg': 'file',
    '.svg': 'file',
    '.css': 'css',
    '.json': 'json',
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
    ...defineEnv,
    // Fix for React 19 intrinsics
    'React.createContext': 'React.createContext'
  },
  plugins: [],
  metafile: true,
  // Adjustments for React 19 compatibility
  jsx: 'automatic',
  jsxImportSource: 'react',
  jsxDev: process.env.NODE_ENV !== 'production',
};

// Simple development server for testing
const startDevServer = async (port = 3000) => {
  const server = http.createServer((req, res) => {
    const url = req.url === '/' ? '/index.html' : req.url;
    const filePath = path.join(BUILD_DIR, url);
    
    fs.readFile(filePath, (err, data) => {
      if (err) {
        // If file not found, serve index.html for SPA routing
        if (err.code === 'ENOENT') {
          fs.readFile(path.join(BUILD_DIR, 'index.html'), (err, data) => {
            if (err) {
              res.writeHead(500);
              res.end('Error loading index.html');
              return;
            }
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(data);
          });
          return;
        }
        
        res.writeHead(500);
        res.end(`Error loading ${url}`);
        return;
      }
      
      // Set content type based on file extension
      const ext = path.extname(url);
      let contentType = 'text/html';
      
      switch (ext) {
        case '.js':
          contentType = 'text/javascript';
          break;
        case '.css':
          contentType = 'text/css';
          break;
        case '.json':
          contentType = 'application/json';
          break;
        case '.png':
          contentType = 'image/png';
          break;
        case '.jpg':
        case '.jpeg':
          contentType = 'image/jpeg';
          break;
        case '.svg':
          contentType = 'image/svg+xml';
          break;
        case '.map':
          contentType = 'application/json';
          break;
      }
      
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(data);
    });
  });
  
  server.listen(port, () => {
    console.log(`Development server running at http://localhost:${port}`);
    console.log(`Press Ctrl+C to stop`);
  });
  
  return server;
};

// Development mode with watch
if (process.argv.includes('--watch')) {
  esbuild
    .context(buildOptions)
    .then(async (ctx) => {
      await ctx.watch();
      console.log('Watching for changes...');
      
      // Start development server
      startDevServer();
    })
    .catch((err) => {
      console.error('Error during build:', err);
      process.exit(1);
    });
} else {
  // Production build
  esbuild
    .build(buildOptions)
    .then((result) => {
      console.log('Build completed successfully!');
      if (process.env.NODE_ENV === 'production') {
        fs.writeFileSync(
          path.join(BUILD_DIR, 'meta.json'),
          JSON.stringify(result.metafile)
        );
      }
    })
    .catch((err) => {
      console.error('Error during build:', err);
      process.exit(1);
    });
} 