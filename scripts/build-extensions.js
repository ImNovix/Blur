import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const DIST_DIR = "dist";
const CHROME_DIR = path.join(DIST_DIR, "chrome");
const FIREFOX_DIR = path.join(DIST_DIR, "firefox");
const INJECTOR_FILE = path.join(DIST_DIR, "injector.js");
const IMAGES_DIR = path.join("src", "images");
const BACKGROUND_FILE = path.join("src", "background.js");

// Make sure target dirs exist
fs.mkdirSync(CHROME_DIR, { recursive: true });
fs.mkdirSync(FIREFOX_DIR, { recursive: true });

// ----------------------------
// Step 1: Compile pages (injecter.js)
// ----------------------------
console.log("🛠 Compiling pages...");
execSync("node scripts/build-pages.js", { stdio: "inherit" });

// ----------------------------
// Step 2: Copy injector.js and background.js to extensions
// ----------------------------
if (!fs.existsSync(INJECTOR_FILE)) {
  throw new Error("❌ injector.js not found. Did build-pages.js run correctly?");
}
if (!fs.existsSync(BACKGROUND_FILE)) {
  throw new Error("❌ background.js not found in src/");
}

fs.copyFileSync(INJECTOR_FILE, path.join(CHROME_DIR, "injecter.js"));
fs.copyFileSync(INJECTOR_FILE, path.join(FIREFOX_DIR, "injecter.js"));

fs.copyFileSync(BACKGROUND_FILE, path.join(CHROME_DIR, "background.js"));
fs.copyFileSync(BACKGROUND_FILE, path.join(FIREFOX_DIR, "background.js"));

// ----------------------------
// Step 3: Copy src/images folder into dist/*/src/images
// ----------------------------
function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const file of fs.readdirSync(src)) {
    const srcPath = path.join(src, file);
    const destPath = path.join(dest, file);
    const stat = fs.statSync(srcPath);
    if (stat.isDirectory()) copyDir(srcPath, destPath);
    else fs.copyFileSync(srcPath, destPath);
  }
}

// Updated paths: add "src" in the destination
copyDir(IMAGES_DIR, path.join(CHROME_DIR, "src", "images"));
copyDir(IMAGES_DIR, path.join(FIREFOX_DIR, "src", "images"));

console.log("📦 images folder copied to dist/*/src/images");

// ----------------------------
// Step 4: Generate Chrome manifest (MV3)
// ----------------------------
const chromeManifest = {
  manifest_version: 3,
  name: "Blur",
  description: "Blur the Noise",
  version: "1.0.0",
  permissions: ["storage", "activeTab", "notifications"],
  host_permissions: ["https://*.roblox.com/*"],
  icons: {
    "16": "src/images/icons/16.png",
    "32": "src/images/icons/32.png",
    "48": "src/images/icons/48.png",
    "128": "src/images/icons/128.png"
  },
  content_scripts: [
    {
      matches: ["https://www.roblox.com/*"],
      js: ["injecter.js"],
      run_at: "document_start"
    }
  ],
  web_accessible_resources: [
    {
      resources: ["**/*.js", "src/images/*.png", "src/images/icons/*.png"],
      matches: ["<all_urls>"]
    }
  ],
  background: {
    service_worker: "background.js",
    type: "module"
  }
};

fs.writeFileSync(
  path.join(CHROME_DIR, "manifest.json"),
  JSON.stringify(chromeManifest, null, 2)
);

// ----------------------------
// Step 5: Generate Firefox manifest (MV2-style)
// ----------------------------
const firefoxManifest = {
  ...chromeManifest,
  permissions: ["storage", "notifications"], // Firefox doesn't need activeTab
  background: {
    scripts: ["background.js"], // classic background
    persistent: false           // event page style
  },
  browser_specific_settings: {
    gecko: {
      id: "blur@yourdomain.com",
      strict_min_version: "109.0"
    }
  }
};

fs.writeFileSync(
  path.join(FIREFOX_DIR, "manifest.json"),
  JSON.stringify(firefoxManifest, null, 2)
);

console.log("✅ Chrome and Firefox extensions built successfully!");
console.log("📁 dist/chrome/src/images");
console.log("📁 dist/firefox/src/images");

// ----------------------------
// Step 6: Inline helpers into background.js
// ----------------------------
console.log("🛠 Inlining helpers into background.js...");
execSync("node scripts/build-background.js", { stdio: "inherit" });
console.log("✅ background.js updated in both extensions!");