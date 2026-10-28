import { cp, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const androidRoot = path.join(root, "android");
const sourceJava = path.join(root, "native-android", "src", "main", "java");
const appJava = path.join(androidRoot, "app", "src", "main", "java");
const androidManifest = path.join(androidRoot, "app", "src", "main", "AndroidManifest.xml");
const gradlePath = path.join(androidRoot, "app", "build.gradle");
const activityName = "MainActivity.java";

async function walk(directory) {
  const found = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) found.push(...await walk(full));
    else found.push(full);
  }
  return found;
}

const mainFiles = (await walk(appJava)).filter((file) => path.basename(file) === activityName);
if (mainFiles.length !== 1) {
  throw new Error(`Expected one generated MainActivity.java; found ${mainFiles.length}.`);
}
await cp(path.join(sourceJava, "com", "sevenxcinema", "app"), path.join(appJava, "com", "sevenxcinema", "app"), { recursive: true });

const mainPath = mainFiles[0];
let main = await readFile(mainPath, "utf8");
if (!main.includes("Media3PlayerPlugin.class")) {
  const packageMatch = main.match(/^package\s+([\w.]+);/m);
  if (!packageMatch) throw new Error("Generated MainActivity.java has no Java package declaration.");
  if (!main.includes("import android.os.Bundle;")) {
    main = main.replace(packageMatch[0], packageMatch[0] + "\n\nimport android.os.Bundle;");
  }
  const importLine = `import ${packageMatch[1]}.Media3PlayerPlugin;`;
  if (!main.includes(importLine)) {
    main = main.replace(/import\s+com\.getcapacitor\.BridgeActivity;/, (line) => line + "\n" + importLine);
  }
  const emptyClass = /public\s+class\s+MainActivity\s+extends\s+BridgeActivity\s*\{\s*\}/;
  const expandedClass = `public class MainActivity extends BridgeActivity {\n    @Override\n    public void onCreate(Bundle savedInstanceState) {\n        registerPlugin(Media3PlayerPlugin.class);\n        super.onCreate(savedInstanceState);\n    }\n}`;
  if (emptyClass.test(main)) {
    main = main.replace(emptyClass, expandedClass);
  } else if (/public\s+class\s+MainActivity\s+extends\s+BridgeActivity\s*\{/.test(main)) {
    main = main.replace(/public\s+class\s+MainActivity\s+extends\s+BridgeActivity\s*\{/, (match) => match + "\n    @Override\n    public void onCreate(Bundle savedInstanceState) {\n        registerPlugin(Media3PlayerPlugin.class);\n        super.onCreate(savedInstanceState);\n    }");
  } else {
    throw new Error("Could not safely register Media3PlayerPlugin in generated MainActivity.java.");
  }
  await writeFile(mainPath, main);
}

let gradle = await readFile(gradlePath, "utf8");
if (!gradle.includes("androidx.media3:media3-exoplayer:1.11.1")) {
  if (!/dependencies\s*\{/.test(gradle)) throw new Error("Generated app Gradle file has no dependencies block.");
  gradle = gradle.replace(/dependencies\s*\{/, (match) => match + '\n    implementation "androidx.media3:media3-exoplayer:1.11.1"\n    implementation "androidx.media3:media3-ui:1.11.1"');
  await writeFile(gradlePath, gradle);
}

let manifest = await readFile(androidManifest, "utf8");
if (!manifest.includes('android:name=".NativePlayerActivity"')) {
  const activity = `    <activity\n            android:name=".NativePlayerActivity"\n            android:configChanges="orientation|screenSize|smallestScreenSize|keyboardHidden"\n            android:exported="false"\n            android:screenOrientation="unspecified"\n            android:theme="@android:style/Theme.Material.NoActionBar" />\n`;
  if (!manifest.includes("</application>")) throw new Error("Generated Android manifest has no application closing tag.");
  manifest = manifest.replace("</application>", activity + "</application>");
  await writeFile(androidManifest, manifest);
}

console.log("Integrated the local Media3 native player into generated Capacitor Android project.");
