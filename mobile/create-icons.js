const fs = require('fs');

// Create a simple 1024x1024 purple icon with "TB" text
const iconSVG = `<svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg">
  <rect width="1024" height="1024" fill="#5D3FD3" rx="200"/>
  <text x="512" y="650" font-family="Arial, sans-serif" font-size="500" font-weight="bold" fill="white" text-anchor="middle">TB</text>
</svg>`;

// Create a simple splash screen
const splashSVG = `<svg width="1242" height="2688" xmlns="http://www.w3.org/2000/svg">
  <rect width="1242" height="2688" fill="#5D3FD3"/>
  <text x="621" y="1400" font-family="Arial, sans-serif" font-size="200" font-weight="bold" fill="white" text-anchor="middle">TickBox</text>
</svg>`;

fs.writeFileSync('icon.svg', iconSVG);
fs.writeFileSync('splash.svg', splashSVG);

console.log('SVG files created. Now convert to PNG using: npx @expo/svg-to-png');
