function getHeader(text: string, bump = true): { new_header: string; old_version: string; new_version: string } | null {
  const parts = text.split("// ==/UserScript==");
  if (parts.length !== 2) {
    throw new Error("Invalid source file, total parts: " + parts.length);
  }

  // oxlint-disable-next-line no-useless-escape
  const version_regex = /(^\s*\/\/\s*@version\s+)([\d\.]+)/m;
  const match = parts[0].match(version_regex);
  if (!match) {
    throw new Error("Invalid source file, no version found");
  }

  const prefix = match[1];
  const old_version = match[2];
  const version_part = old_version.split(".");
  const last_part = parseInt(version_part[version_part.length - 1], 10);

  if (isNaN(last_part)) {
    console.error(`  - Invalid version format: ${old_version}`);
    return null;
  }

  if (bump) {
    version_part[version_part.length - 1] = (last_part + 1).toString();
  } else {
    version_part[version_part.length - 1] = last_part.toString();
  }
  const new_version = version_part.join(".");
  const new_header = parts[0].replace(version_regex, `${prefix}${new_version}`) + "// ==/UserScript==\r\n";

  return {
    new_header,
    old_version,
    new_version,
  };
}

async function bundle(file: string): Promise<string> {
  const cmd = new Deno.Command("deno", {
    args: ["bundle", "--platform=browser", file],
    stdout: "piped",
    stderr: "piped",
  });

  const child = cmd.spawn();
  const decoder = new TextDecoder();

  let result = "";

  child.stdout.pipeTo(
    new WritableStream({
      write(chunk) {
        result += decoder.decode(chunk);
      },
    }),
  );
  child.stderr.pipeTo(
    new WritableStream({
      write(chunk) {
        console.error(decoder.decode(chunk));
      },
    }),
  );

  await child.status;
  return result;
}

let source: string | null = null;
let target: string | null = null;
let bump = false;

for (const arg of Deno.args) {
  if (arg.startsWith("--source=")) {
    source = arg.replace("--source=", "");
  } else if (arg.startsWith("--target=")) {
    target = arg.replace("--target=", "");
  } else if (arg.startsWith("--bump")) {
    bump = true;
  }
}

if (!source || !target) {
  console.error("Missing source or target file");
  Deno.exit(1);
}

console.log(`🔍 Bundling ${source} to ${target}...`);

const target_text = Deno.readTextFileSync(target);
const header = getHeader(target_text, bump);

if (!header) {
  console.error("Invalid source file");
  Deno.exit(1);
}

const bundled = await bundle(source);

Deno.writeTextFileSync(target, header.new_header + "\n" + bundled);

console.log(`✅ Bumped version ${header.old_version} -> ${header.new_version}`);
console.log(`✅ Bundled ${source} to ${target}`);
