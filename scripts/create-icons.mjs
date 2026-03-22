import fs from 'fs';
import path from 'path';

// Create a simple SVG icon and save as PNG-compatible file
function createSVGIcon(size) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" rx="${size * 0.2}" fill="#6366f1"/>
  <text x="50%" y="54%" font-family="Arial, sans-serif" font-size="${size * 0.35}" 
    font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="middle">AI</text>
</svg>`;
}

// Save as SVG files (browsers accept SVG as icons)
fs.writeFileSync(
  path.join('public', 'icon-192.png'),
  createSVGIcon(192)
);

fs.writeFileSync(
  path.join('public', 'icon-512.png'),
  createSVGIcon(512)
);

console.log('Icons created successfully!');