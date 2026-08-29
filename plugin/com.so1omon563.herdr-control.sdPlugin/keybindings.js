const { existsSync, readFileSync, statSync } = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { parse: parseToml } = require("./vendor/smol-toml.cjs");

const CUSTOM_KEYBINDING_ERROR = "HERDR_CUSTOM_KEYBINDING";
const DEFAULT_PREFIX = "ctrl+b";
const CONFIG_BINDINGS = {
  "settings": "settings",
  "workspace-picker": "workspace_picker",
  "sidebar": "toggle_sidebar",
  "rename-workspace": "rename_workspace",
  "rename-tab": "rename_tab",
  "rename-pane": "rename_pane",
  "close-workspace": "close_workspace",
  "close-tab": "close_tab",
  "close-pane": "close_pane"
};
const DEFAULT_BINDINGS = {
  "settings": "prefix+s",
  "workspace-picker": "prefix+w",
  "sidebar": "prefix+b",
  "rename-workspace": "prefix+shift+w",
  "rename-tab": "prefix+shift+t",
  "rename-pane": "prefix+shift+p",
  "close-workspace": "prefix+shift+d",
  "close-tab": "prefix+shift+x",
  "close-pane": "prefix+x"
};

const KEY_CODES = {
  a: 0, b: 11, c: 8, d: 2, e: 14, f: 3, g: 5, h: 4, i: 34, j: 38, k: 40, l: 37, m: 46,
  n: 45, o: 31, p: 35, q: 12, r: 15, s: 1, t: 17, u: 32, v: 9, w: 13, x: 7, y: 16, z: 6,
  0: 29, 1: 18, 2: 19, 3: 20, 4: 21, 5: 23, 6: 22, 7: 26, 8: 28, 9: 25,
  "-": 27, "=": 24, "[": 33, "]": 30, "\\": 42, ";": 41, "'": 39,
  ",": 43, ".": 47, "/": 44, "`": 50, " ": 49
};
const SHIFTED_KEYS = {
  "!": "1", "@": "2", "#": "3", "$": "4", "%": "5", "^": "6", "&": "7", "*": "8",
  "(": "9", ")": "0", "_": "-", "+": "=", "{": "[", "}": "]", "|": "\\", ":": ";",
  "\"": "'", "<": ",", ">": ".", "?": "/", "~": "`"
};
const NAMED_CHARACTERS = {
  space: " ", minus: "-", comma: ",", period: ".", slash: "/", backslash: "\\", quote: "'",
  double_quote: "\"", "double-quote": "\"", semicolon: ";", colon: ":", percent: "%",
  ampersand: "&", backtick: "`", plus: "+"
};
const SPECIAL_KEY_CODES = {
  enter: 36, return: 36, esc: 53, escape: 53, tab: 48, backspace: 51, bs: 51,
  left: 123, right: 124, down: 125, up: 126
};
const FUNCTION_KEY_CODES = {
  f1: 122, f2: 120, f3: 99, f4: 118, f5: 96, f6: 97, f7: 98, f8: 100,
  f9: 101, f10: 109, f11: 103, f12: 111, f13: 105, f14: 107, f15: 113, f16: 106,
  f17: 64, f18: 79, f19: 80, f20: 90, f21: 91, f22: 92, f23: 93, f24: 94
};
const MODIFIER_ALIASES = {
  ctrl: "control", control: "control", shift: "shift",
  alt: "option", option: "option", meta: "option",
  cmd: "command", command: "command", super: "command"
};
const MODIFIER_ORDER = ["control", "option", "shift", "command"];
const APPLESCRIPT_MODIFIERS = {
  control: "control down", option: "option down", shift: "shift down", command: "command down"
};
const CONFIG_FIELDS = new Set(["prefix", ...Object.values(CONFIG_BINDINGS)]);
let keyConfigCache;

function herdrConfigPath() {
  return process.env.HERDR_CONFIG_PATH?.trim()
    || path.join(os.homedir(), ".config", "herdr", "config.toml");
}

function keyForToken(token) {
  const lower = token.toLowerCase();
  if (Object.hasOwn(SPECIAL_KEY_CODES, lower)) {
    return { keyCode: SPECIAL_KEY_CODES[lower], printable: false, shift: false };
  }
  if (Object.hasOwn(FUNCTION_KEY_CODES, lower)) {
    return { keyCode: FUNCTION_KEY_CODES[lower], printable: false, shift: false };
  }
  const named = NAMED_CHARACTERS[lower];
  const character = named ?? (Array.from(token).length === 1 ? token : null);
  if (!character || !character.codePointAt(0) || character.codePointAt(0) > 127) return null;
  const shiftedBase = SHIFTED_KEYS[character];
  const base = shiftedBase ?? character.toLowerCase();
  if (!Object.hasOwn(KEY_CODES, base)) return null;
  return {
    keyCode: KEY_CODES[base],
    printable: true,
    shift: Boolean(shiftedBase) || /^[A-Z]$/.test(character)
  };
}

function parseKeyChord(value) {
  if (typeof value !== "string") return null;
  const parts = value.split("+").map(part => part.trim());
  if (!parts.length || parts.some(part => !part)) return null;
  const modifiers = new Set();
  let keyToken;
  for (const part of parts) {
    const modifier = MODIFIER_ALIASES[part.toLowerCase()];
    if (modifier) {
      modifiers.add(modifier);
    } else if (keyToken === undefined) {
      keyToken = part;
    } else {
      return null;
    }
  }
  const key = keyToken === undefined ? null : keyForToken(keyToken);
  if (!key) return null;
  if (key.shift) modifiers.add("shift");
  return {
    keyCode: key.keyCode,
    modifiers: MODIFIER_ORDER.filter(modifier => modifiers.has(modifier)),
    printable: key.printable
  };
}

function parseKeyBinding(value, prefix = DEFAULT_PREFIX) {
  if (typeof value !== "string") return null;
  const binding = value.trim();
  if (!binding) return null;
  if (binding.startsWith("prefix+")) {
    const prefixChord = parseKeyChord(prefix);
    const actionChord = parseKeyChord(binding.slice("prefix+".length));
    if (!prefixChord || !actionChord) return null;
    return [prefixChord, actionChord].map(({ keyCode, modifiers }) => ({ keyCode, modifiers }));
  }
  const chord = parseKeyChord(binding);
  if (!chord || chord.printable && !chord.modifiers.length) return null;
  return [{ keyCode: chord.keyCode, modifiers: chord.modifiers }];
}

function configuredValues(value, fallback) {
  if (value === undefined) return [fallback];
  if (typeof value === "string") return [value];
  if (Array.isArray(value) && value.every(item => typeof item === "string")) return value;
  return [];
}

function resolveKeySequence(command, keys = {}) {
  const field = CONFIG_BINDINGS[command];
  if (!field || !keys || typeof keys !== "object" || Array.isArray(keys)) return null;
  const prefix = keys.prefix === undefined ? DEFAULT_PREFIX : typeof keys.prefix === "string" ? keys.prefix : null;
  const values = configuredValues(keys[field], DEFAULT_BINDINGS[command]);
  for (const value of values) {
    const sequence = parseKeyBinding(value, prefix);
    if (sequence) return sequence;
  }
  return null;
}

function parseKeyConfig(source) {
  const parsed = parseToml(source);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Invalid TOML root");
  if (parsed.keys === undefined) return {};
  if (!parsed.keys || typeof parsed.keys !== "object" || Array.isArray(parsed.keys)) {
    throw new Error("Invalid keys table");
  }
  return Object.fromEntries(
    Object.entries(parsed.keys).filter(([field]) => CONFIG_FIELDS.has(field))
  );
}

function configSignature(configPath) {
  const stats = statSync(configPath);
  return `${stats.dev}:${stats.ino}:${stats.size}:${stats.mtimeMs}:${stats.ctimeMs}`;
}

function readKeyConfig(configPath = herdrConfigPath()) {
  if (!existsSync(configPath)) {
    keyConfigCache = { path: configPath, signature: "missing", result: { keys: {} } };
    return keyConfigCache.result;
  }
  let signature;
  try {
    signature = configSignature(configPath);
  } catch (error) {
    return { error };
  }
  if (keyConfigCache?.path === configPath && keyConfigCache.signature === signature) {
    return keyConfigCache.result;
  }
  let result;
  try {
    result = { keys: parseKeyConfig(readFileSync(configPath, "utf8")) };
  } catch (error) {
    result = { error };
  }
  keyConfigCache = { path: configPath, signature, result };
  return result;
}

function customKeybindingError(message, cause) {
  const error = new Error(message, cause ? { cause } : undefined);
  error.code = CUSTOM_KEYBINDING_ERROR;
  return error;
}

function commandKeySequence(command, configPath = herdrConfigPath()) {
  const field = CONFIG_BINDINGS[command];
  if (!field) return null;
  const config = readKeyConfig(configPath);
  if (config.error) {
    throw customKeybindingError("HERDR keybinding config could not be read or parsed safely", config.error);
  }
  const sequence = resolveKeySequence(command, config.keys);
  if (!sequence) throw customKeybindingError(`HERDR keybinding ${field} has no supported value`);
  return sequence;
}

function appleScriptKeyLine({ keyCode, modifiers = [] }) {
  if (!Number.isInteger(keyCode) || keyCode < 0) throw new Error("Invalid key code");
  const using = modifiers.map(modifier => APPLESCRIPT_MODIFIERS[modifier]);
  if (using.some(modifier => !modifier)) throw new Error("Invalid key modifier");
  if (!using.length) return `key code ${keyCode}`;
  if (using.length === 1) return `key code ${keyCode} using ${using[0]}`;
  return `key code ${keyCode} using {${using.join(", ")}}`;
}

function resetKeyConfigCache() {
  keyConfigCache = undefined;
}

module.exports = {
  CONFIG_BINDINGS,
  CUSTOM_KEYBINDING_ERROR,
  DEFAULT_BINDINGS,
  DEFAULT_PREFIX,
  appleScriptKeyLine,
  commandKeySequence,
  herdrConfigPath,
  parseKeyBinding,
  parseKeyChord,
  parseKeyConfig,
  readKeyConfig,
  resetKeyConfigCache,
  resolveKeySequence
};
