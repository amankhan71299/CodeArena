import fs from 'fs';
import path from 'path';

const walk = (dir, callback) => {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? 
      walk(dirPath, callback) : callback(path.join(dir, f));
  });
};

walk('./src', (filePath) => {
  if (filePath.endsWith('.js') || filePath.endsWith('.jsx')) {
    let content = fs.readFileSync(filePath, 'utf8');
    if (content.includes('http://localhost:5000/api')) {
      content = content.replace(/http:\/\/localhost:5000\/api/g, '/api');
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Updated ${filePath}`);
    } else if (content.includes('http://localhost:5000')) {
      content = content.replace(/http:\/\/localhost:5000/g, ''); // For socket context maybe?
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Updated ${filePath}`);
    }
  }
});
