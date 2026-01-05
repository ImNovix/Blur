import fs from "fs";
import path from "path";
import { parse } from "@babel/parser";
import traverseModule from "@babel/traverse";
import generateModule from "@babel/generator";

const traverse = traverseModule.default;
const generate = generateModule.default;

const SRC_DIR = "src";
const BACKGROUND_FILE = path.join(SRC_DIR, "background.js");
const HELPERS_DIR = path.join(SRC_DIR, "helpers");

// ----------------------------
// Step 1: Read background.js
// ----------------------------
if (!fs.existsSync(BACKGROUND_FILE)) {
  throw new Error("❌ background.js not found in src/");
}

let bgCode = fs.readFileSync(BACKGROUND_FILE, "utf8");
const ast = parse(bgCode, { sourceType: "module", plugins: ["topLevelAwait"] });

// ----------------------------
// Step 2: Inline imports from helpers
// ----------------------------
const inlinedFiles = new Set();
let inlinedCode = "";

traverse(ast, {
  ImportDeclaration(pathNode) {
    const importPath = pathNode.node.source.value;

    if (importPath.startsWith("./helpers/")) {
      let importFile = importPath;
      if (!importFile.endsWith(".js")) importFile += ".js";
      const fullPath = path.join(SRC_DIR, importFile);

      if (!fs.existsSync(fullPath)) {
        throw new Error(`❌ Imported file not found: ${fullPath}`);
      }

      if (!inlinedFiles.has(fullPath)) {
        let code = fs.readFileSync(fullPath, "utf8");
        code = code.replace(
          /\bexport\s+(const|let|var|function|async function|class)\b/g,
          "$1"
        );
        inlinedCode += code + "\n";
        inlinedFiles.add(fullPath);
      }

      pathNode.remove();
    }
  }
});


// ----------------------------
// Step 3: Combine inlined code + background.js body
// ----------------------------
const bgBodyCode = ast.program.body.map(n => generateModule.default(n).code).join("\n");
const finalCode = inlinedCode + "\n" + bgBodyCode;

// ----------------------------
// Step 4: Write final background.js
// ----------------------------
const DIST_CHROME_BG = path.join("dist", "chrome", "background.js");
const DIST_FIREFOX_BG = path.join("dist", "firefox", "background.js");

// Ensure folders exist
fs.mkdirSync(path.dirname(DIST_CHROME_BG), { recursive: true });
fs.mkdirSync(path.dirname(DIST_FIREFOX_BG), { recursive: true });

fs.writeFileSync(DIST_CHROME_BG, finalCode);
fs.writeFileSync(DIST_FIREFOX_BG, finalCode);

console.log("✅ background.js now inlined and copied to Chrome & Firefox!");
