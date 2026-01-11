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
    // We store the function code as text to include in the final bundle.
    compiledPages.push(
      `async function ${funcName}() {\n// Page Source: ${name}\n${pageBody}\n}\nwindow.${funcName} = ${funcName};`
    );
  }
} else {
  console.warn(`Warning: ${PAGES_DIR} does not exist.`);
}

// ---------------------------
// NEW: Load pageFeatures from src/injector.js (or src/inejctor.js fallback)
// ---------------------------
function loadPageFeaturesFromFile() {
  const candidates = [
    path.resolve("src/injector.js"),
    path.resolve("src/inejctor.js"), // handle common typo from your note
    path.resolve("src/Injecter.js")
  ];

  for (const p of candidates) {
    if (!fs.existsSync(p)) continue;
    try {
      const content = fs.readFileSync(p, "utf8");
      const ast = parse(content, { sourceType: "module", plugins: ["topLevelAwait"] });
      let found = null;
      traverse(ast, {
        VariableDeclarator(path) {
          if (t.isIdentifier(path.node.id, { name: "pageFeatures" })) {
            found = path.node.init;
            path.stop();
          }
        },
        AssignmentExpression(path) {
          // handle `exports.pageFeatures = ...` or `module.exports = { pageFeatures: [...] }` rarely
        }
      });
      if (found) {
        // generate the array code as text
        const code = generate(found).code; // e.g. "[ { url: '...', scripts: [...] }, ... ]"
        // evaluate the array in a safe-ish way (this is build-time on your machine)
        const arr = Function(`"use strict"; return (${code});`)();
        if (Array.isArray(arr)) {
          console.log(`[build-pages] pageFeatures loaded from ${p}`);
          return arr;
        }
      }
    } catch (err) {
      console.warn(`[build-pages] Failed to parse ${p}:`, err.message);
    }
  }
  console.warn("[build-pages] No pageFeatures array found in src/injector.js or src/inejctor.js.");
  return [];
}

// Helper: derives function name (blurPageX) from a script path like "src/pages/home.js"
function functionNameFromScript(scriptPath) {
  const base = path.basename(scriptPath, ".js");
  const suffix = base.charAt(0).toUpperCase() + base.slice(1);
  return `blurPage${suffix}`;
}

// Helper: derives css var name (blurCssX) from a style path like "src/pages/css/home.css"
function cssVarFromStyle(stylePath) {
  const base = path.basename(stylePath, ".css");
  const suffix = base.charAt(0).toUpperCase() + base.slice(1);
  return `blurCss${suffix}`;
}

// Helper: normalize url pattern so runtime matches window.location.href.
// If user provided a protocol-less pattern like "roblox.com/*" -> convert to "https://www.roblox.com/*"
function normalizePattern(pat) {
  if (!pat) return pat;
  if (/^https?:\/\//i.test(pat)) return pat;
  if (pat.includes("roblox.com")) {
    // ensure it starts with https://www.
    return pat.replace(/^[\/]*/, "").replace(/^/, "https://www.");
  }
  // otherwise return as-is (caller can provide fully-qualified)
  return pat;
}

// Build runtime pages array string (we create JS source text, not JSON, because we want typeof checks on CSS vars)
function generateRuntimePagesArrayCode(pageFeatures) {
  const items = pageFeatures.map(feat => {
    const url = normalizePattern(feat.url || feat.pattern || feat.match || "");
    // map scripts -> run (single func or array)
    const funcs = (feat.scripts || feat.scripts === undefined && feat.run) ? (feat.scripts || feat.run || []) : [];
    const runFuncs = (Array.isArray(funcs) ? funcs : [funcs])
      .filter(Boolean)
      .map(s => functionNameFromScript(s));
    const runPart = runFuncs.length === 1 ? `"${runFuncs[0]}"` : `[${runFuncs.map(f => `"${f}"`).join(", ")}]`;

    // map styles -> css variable expression that references the generated blurCssX var if defined
    let cssPart = "null";
    if (feat.styles && feat.styles.length > 0) {
      // if multiple styles, pick first for var naming (you can extend this to combine)
      const cssVar = cssVarFromStyle(feat.styles[0]);
      cssPart = `typeof ${cssVar} !== 'undefined' ? ${cssVar} : null`;
    }

    return `{
      url: "${url}",
      run: ${runPart},
      css: ${cssPart}
    }`;
  });

  return `[
    ${items.join(",\n")}
  ]`;
}

// ---------------------------
// 2. Build the Output Runtime
// ---------------------------
const globalsCode = Array.from(globalModules.values()).join("\n\n");
const cssGlobalsCode = cssGlobals.join("\n");

// (your regrex variable was a bit malformed — I'm leaving it as you had it so this change is minimally invasive)
const regrex = '/[.+?^${}()|[\\]\\\\]/g, "\\\\$&").replace(/\\*/g, ".*"';

// injectorRuntime text (kept as in your original script)
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
          try {
            await window[fnName]();
          } catch (e) {
            console.error("Error in", fnName, e);
          }
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
`;

// ---------------------------
// NEW: compose the runtime pages from pageFeatures file
// ---------------------------
const pageFeatures = loadPageFeaturesFromFile();
const runtimePagesCode = generateRuntimePagesArrayCode(pageFeatures);

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
  injectorRuntime,
  `\n// [5] RUNTIME PAGE CONFIG (generated from pageFeatures)\nsimplePageInjector(${runtimePagesCode});\n`
].join("\n");

fs.writeFileSync(BUNDLE_FILE, finalOutput);
console.log(`✅ injector.js built at ${BUNDLE_FILE}`);
console.log(` - ${globalModules.size} shared files hoisted.`);
console.log(` - ${compiledPages.length} pages compiled.`);
console.log(` - ${cssGlobals.length} CSS files minified.`);