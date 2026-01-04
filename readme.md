# Blur - Blur the Noise

**Blur** is a Roblox browser extension designed to hide content you may not want to see and improve your Roblox experience.

## Features
- **Best Friends**
- **Home Greeting**

## How to Use the Extension

### Chromium Browsers
1. Download or clone the Blur extension folder to your computer.  
2. Open Chrome and go to `chrome://extensions/`.  
3. Enable **Developer Mode** (toggle in the top-right).  
4. Click **Load unpacked** and select the Blur folder.  
5. Open Roblox in your browser and enjoy the refined experience.

### Firefox
No instructions yet.

---
Made with ♡ by Novix.

## Development

Compile a single-file distribution used for the precompiled build in `blur-selfcomplied/src/oneFile.js`:

1. Install dev dependencies:

```
npm install
```

2. Run the compiler:

```
npm run compile:onefile
```

This bundles `src/injecter.js` and all imports, and inlines CSS from `src/pages/css` as `*CSS` constants as well as constants exported by `src/constaints/logos.js`.
