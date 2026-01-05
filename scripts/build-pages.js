import fs from "fs";
import path from "path";
import { parse } from "@babel/parser";
import traverseModule from "@babel/traverse";
import generateModule from "@babel/generator";
import * as t from "@babel/types";

const traverse = traverseModule.default;
const generate = generateModule.default;

const PAGES_DIR = "src/pages";
const DIST_DIR = "dist";
const BUNDLE_FILE = path.join(DIST_DIR, "injector.js");

// Ensure dist exists
if (!fs.existsSync(DIST_DIR)) fs.mkdirSync(DIST_DIR, { recursive: true });

// ---------------------------
// State Tracking
// ---------------------------
const globalModules = new Map(); 
const compiledPages = [];
const cssGlobals = []; // Stores the const blurCssName = "..." strings

// ---------------------------
// Helper: Resolve Imports
// ---------------------------
function resolveImport(importPath, parentFile) {
  if (importPath.startsWith(".")) {
    let fullPath = path.resolve(path.dirname(parentFile), importPath);
    if (!fs.existsSync(fullPath) && fs.existsSync(fullPath + ".js")) {
      fullPath += ".js";
    }
    if (!fs.existsSync(fullPath)) throw new Error(`File not found: ${fullPath} (imported by ${parentFile})`);
    return fullPath;
  }
  return null;
}

// ---------------------------
// Core Logic: Process a Module
// ---------------------------
function processModule(filePath, isPage = false) {
  if (!isPage && globalModules.has(filePath)) return;

  const code = fs.readFileSync(filePath, "utf8");
  const ast = parse(code, { sourceType: "module", plugins: ["topLevelAwait"] });
  
  traverse(ast, {
    ImportDeclaration(path) {
      const source = path.node.source.value;
      const resolvedPath = resolveImport(source, filePath);
      if (resolvedPath) processModule(resolvedPath, false);
      path.remove();
    },
    ExportNamedDeclaration(path) {
      if (path.node.declaration) path.replaceWith(path.node.declaration);
      else path.remove();
    },
    ExportDefaultDeclaration(path) {
      const decl = path.node.declaration;
      if (t.isClassDeclaration(decl) || t.isFunctionDeclaration(decl)) path.replaceWith(decl);
      else path.remove(); 
    },
    FunctionDeclaration(path) {
      if (path.node.id?.name === "injectUnreleasedVersionPopup") {
        console.log(`[build-pages] Excluding function injectUnreleasedVersionPopup from ${filePath}`);
        path.remove();
      }
    },
    CallExpression(path) {
      if (t.isIdentifier(path.node.callee, { name: "injectUnreleasedVersionPopup" })) {
        console.log(`[build-pages] Removing call to injectUnreleasedVersionPopup in ${filePath}`);
        path.remove();
      }
    }
  });

  const cleanedCode = generate(ast).code;

  if (isPage) return cleanedCode;
  else globalModules.set(filePath, cleanedCode);
}

// ---------------------------
// 1. Process Pages
// ---------------------------
console.log("Compiling pages...");

if (fs.existsSync(PAGES_DIR)) {
  const pageFiles = fs.readdirSync(PAGES_DIR).filter(f => f.endsWith(".js"));

  for (const file of pageFiles) {
    const fullPath = path.join(PAGES_DIR, file);
    const name = path.basename(file, ".js");
    
    // Naming Convention: home.js -> blurPageHome, blurCssHome
    const suffix = name.charAt(0).toUpperCase() + name.slice(1);
    const funcName = `blurPage${suffix}`;
    const cssVarName = `blurCss${suffix}`;

    // Process JS
    const pageBody = processModule(fullPath, true);

    // Process CSS
    const cssPath = path.join(PAGES_DIR, "css", `${name}.css`);
    if (fs.existsSync(cssPath)) {
      const cssText = fs.readFileSync(cssPath, "utf8");
      
      // 1. Remove comments (/* ... */)
      // 2. Remove newlines/returns
      // 3. Remove extra whitespace
      // 4. Escape double quotes for JS string
      const cleanCss = cssText
        .replace(/\/\*[\s\S]*?\*\//g, "") 
        .replace(/\r?\n|\r/g, "")
        .replace(/\s+/g, " ")
        .replace(/"/g, '\\"');

      // Create global variable: const blurCssHome = "...";
      cssGlobals.push(`const ${cssVarName} = "${cleanCss}";`);
    }

    // Add JS Function
    compiledPages.push(
      `async function ${funcName}() {\n` +
      `  // Page Source: ${name}\n` +
      `  ${pageBody}\n` +
      `}\n` +
      `window.${funcName} = ${funcName};`
    );
  }
} else {
  console.warn(`Warning: ${PAGES_DIR} does not exist.`);
}

// ---------------------------
// 2. Build the Output Runtime
// ---------------------------

const globalsCode = Array.from(globalModules.values()).join("\n\n");
const cssGlobalsCode = cssGlobals.join("\n");

// We inject the RegEx logic you requested for cleaner code generation
const regrex = '/[.+?^${}()|[\\]\\\\]/g, "\\\\$&").replace(/\\*/g, ".*"';
const injectorRuntime = `
window.__blurPages = window.__blurPages || {};

window.injectCSS = function (id, cssText) {
  if (!window._loadedStyles) window._loadedStyles = new Set();
  if (window._loadedStyles.has(id)) return;
  window._loadedStyles.add(id);

  const addStyle = () => {
    const style = document.createElement("style");
    style.dataset.extCss = id;
    style.textContent = cssText;
    (document.head || document.documentElement).appendChild(style);
    console.log("[injectCSS] Injected CSS:", id);
  };

  if (document.head) addStyle();
  else document.addEventListener("DOMContentLoaded", addStyle);
};

function simplePageInjector(pages) {
  // Sort by specificity
  pages.sort((a, b) => b.url.length - a.url.length);

  function matchUrl(pattern) {
    // Escape regex chars but allow * wildcard
    const regexString = "^" + pattern.replace(${regrex});
    const regex = new RegExp(regexString, "i");
    return regex.test(window.location.href);
  }

  async function runPageFeatures() {
    console.log("[runPageFeatures] Checking...");
    
    for (const page of pages) {
      if (!matchUrl(page.url)) continue;

      // Inject CSS if defined in config
      if (page.css) {
        injectCSS(page.run + "_css", page.css);
      }

      const funcs = Array.isArray(page.run) ? page.run : [page.run];
      for (const fnName of funcs) {
        if (typeof window[fnName] === "function") {
          console.log("[runPageFeatures] Executing:", fnName);
          try { await window[fnName](); }
          catch (e) { console.error("Error in", fnName, e); }
        } else {
          console.warn("Function not found:", fnName);
        }
      }
    }
  }

  function hookHistory(onChange) {
    const push = history.pushState;
    const replace = history.replaceState;
    history.pushState = function (...args) { push.apply(this, args); onChange(); };
    history.replaceState = function (...args) { replace.apply(this, args); onChange(); };
    window.addEventListener("popstate", onChange);
  }

  console.log("[simplePageInjector] Init");
  runPageFeatures();
  hookHistory(runPageFeatures);
}

// ---------------------------
// Configuration
// ---------------------------
simplePageInjector([
  { 
    url: "https://www.roblox.com/home*", 
    run: "blurPageHome",
    css: typeof blurCssHome !== 'undefined' ? blurCssHome : null
  },
  { 
    url: "https://www.roblox.com/users/friends*", 
    run: "blurPageFriends",
    css: typeof blurCssFriends !== 'undefined' ? blurCssFriends : null
  },
  { 
    url: "https://www.roblox.com/users/*/profile", 
    run: "blurPageProfile",
    css: typeof blurCssProfile !== 'undefined' ? blurCssProfile : null
  },
  { 
    url: "https://www.roblox.com/*", 
    run: "blurPageAll"
  }
]);
`;

// ---------------------------
// 3. Write File
// ---------------------------
const finalOutput = [
  "// [1] GLOBAL SHARED MODULES",
  globalsCode,
  "\n// [2] GLOBAL CSS VARIABLES",
  cssGlobalsCode,
  "\n// [3] PAGE SPECIFIC FUNCTIONS",
  compiledPages.join("\n\n"),
  "\n// [4] INJECTOR RUNTIME",
  injectorRuntime
].join("\n");

fs.writeFileSync(BUNDLE_FILE, finalOutput);
console.log(`✅ injector.js built at ${BUNDLE_FILE}`);
console.log(`   - ${globalModules.size} shared files hoisted.`);
console.log(`   - ${compiledPages.length} pages compiled.`);
console.log(`   - ${cssGlobals.length} CSS files minified.`);