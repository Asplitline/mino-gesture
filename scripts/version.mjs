#!/usr/bin/env node
/**
 * 统一维护三处版本号：package.json、src-tauri/tauri.conf.json、src-tauri/Cargo.toml
 *
 * 发版（推荐）：自增版本 → git commit → 打 v* tag → 终端提示推送命令
 *   pnpm run release:patch | release:minor | release:major
 *
 * 仅改号（不提交、不打 tag）：
 *   pnpm run version:patch | version:minor | version:major
 *   pnpm run version:set -- 0.2.0
 *   pnpm run version:sync
 *   pnpm run version:tag
 *
 * 与 `pnpm version patch|minor|major` 配合：package.json 的 `version` 钩子仍会 sync 并 git add 两处 src-tauri 文件。
 */

import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const paths = {
  packageJson: join(root, "package.json"),
  tauriConf: join(root, "src-tauri", "tauri.conf.json"),
  cargoToml: join(root, "src-tauri", "Cargo.toml"),
};

const versionRelPaths = ["package.json", "src-tauri/tauri.conf.json", "src-tauri/Cargo.toml"];

function restoreVersionFilesFromHead() {
  runGit(["restore", "--staged", ...versionRelPaths], { inheritIo: false });
  runGit(["restore", ...versionRelPaths], { inheritIo: false });
}

/** 允许 SemVer 核心 + 常见预发布后缀，如 0.2.0-beta.1 */
const SEMVER_RE =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;

function normalizeVersion(input) {
  const trimmed = String(input).trim();
  const noV = trimmed.startsWith("v") ? trimmed.slice(1) : trimmed;
  if (!SEMVER_RE.test(noV)) {
    throw new Error(
      `非法版本号: "${input}"，请使用 SemVer，例如 0.2.0 或 0.2.0-beta.1`,
    );
  }
  return noV;
}

function readPackageVersion() {
  const pkg = JSON.parse(readFileSync(paths.packageJson, "utf8"));
  if (!pkg.version || typeof pkg.version !== "string") {
    throw new Error("package.json 缺少有效的 version 字段");
  }
  return normalizeVersion(pkg.version);
}

function writePackageJson(version) {
  const raw = readFileSync(paths.packageJson, "utf8");
  const pkg = JSON.parse(raw);
  pkg.version = version;
  writeFileSync(paths.packageJson, `${JSON.stringify(pkg, null, 2)}\n`, "utf8");
}

function writeTauriConf(version) {
  const raw = readFileSync(paths.tauriConf, "utf8");
  const conf = JSON.parse(raw);
  conf.version = version;
  writeFileSync(paths.tauriConf, `${JSON.stringify(conf, null, 2)}\n`, "utf8");
}

function writeCargoToml(version) {
  const raw = readFileSync(paths.cargoToml, "utf8");
  const lines = raw.split(/\r?\n/);
  let inPackage = false;
  let replaced = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === "[package]") {
      inPackage = true;
      continue;
    }
    if (inPackage && /^\[/.test(line.trim()) && line.trim() !== "[package]") {
      inPackage = false;
      continue;
    }
    if (inPackage && /^version\s*=\s*"/.test(line)) {
      lines[i] = `version = "${version}"`;
      replaced = true;
      break;
    }
  }
  if (!replaced) {
    throw new Error(
      "未能在 src-tauri/Cargo.toml 的 [package] 段内找到 version 行，请检查文件格式",
    );
  }
  writeFileSync(paths.cargoToml, lines.join("\n"), "utf8");
}

function setAll(version) {
  const v = normalizeVersion(version);
  writePackageJson(v);
  writeTauriConf(v);
  writeCargoToml(v);
  console.log(`已写入版本 ${v}：package.json、src-tauri/tauri.conf.json、src-tauri/Cargo.toml`);
}

function syncFromPackage() {
  const v = readPackageVersion();
  writeTauriConf(v);
  writeCargoToml(v);
  console.log(`已从 package.json 同步版本 ${v} 到 tauri.conf.json 与 Cargo.toml`);
}

/** 从完整 SemVer 取出 X.Y.Z（忽略预发布与 build） */
function parseCoreTriplet(normalized) {
  const core = normalized.split("-")[0].split("+")[0];
  const parts = core.split(".");
  if (parts.length !== 3) {
    throw new Error(`无法解析主版本号段: "${normalized}"`);
  }
  const nums = parts.map((p) => {
    const n = parseInt(p, 10);
    if (!/^\d+$/.test(p) || Number.isNaN(n) || n < 0) {
      throw new Error(`非法的 X.Y.Z 段: "${core}"`);
    }
    return n;
  });
  return { major: nums[0], minor: nums[1], patch: nums[2] };
}

function bumpTriplet(t, kind) {
  if (kind === "patch") {
    return { major: t.major, minor: t.minor, patch: t.patch + 1 };
  }
  if (kind === "minor") {
    return { major: t.major, minor: t.minor + 1, patch: 0 };
  }
  if (kind === "major") {
    return { major: t.major + 1, minor: 0, patch: 0 };
  }
  throw new Error(`未知的 bump 类型: ${kind}`);
}

function formatTriplet(t) {
  return `${t.major}.${t.minor}.${t.patch}`;
}

/** 是否含预发布后缀（忽略仅 build metadata 的 `+`） */
function hasPrerelease(normalized) {
  const noBuild = normalized.split("+")[0];
  return noBuild.includes("-");
}

/**
 * 自增版本，结果均为正式 X.Y.Z（不写预发布后缀）。
 * - 当前为正式版：patch/minor/major 按 SemVer 递增。
 * - 当前为预发布：与常见 npm 行为一致——patch 先“转正”为核心号；minor/major 在核心号上再递增中/大版本。
 */
function bumpFromPackage(kind) {
  const current = readPackageVersion();
  const core = parseCoreTriplet(current);
  const pre = hasPrerelease(current);

  let nextTriplet;
  if (pre) {
    if (kind === "patch") {
      nextTriplet = core;
    } else if (kind === "minor") {
      nextTriplet = bumpTriplet(core, "minor");
    } else {
      nextTriplet = bumpTriplet(core, "major");
    }
  } else {
    nextTriplet = bumpTriplet(core, kind);
  }

  const nextStr = formatTriplet(nextTriplet);
  setAll(nextStr);
  if (pre) {
    console.log(
      `说明: 原预发布版本 ${current}，核心号为 ${formatTriplet(core)}，本次得到正式版 ${nextStr}`,
    );
  }
}

function runGit(args, { inheritIo = true } = {}) {
  const r = spawnSync("git", args, {
    cwd: root,
    encoding: "utf8",
    stdio: inheritIo ? "inherit" : ["pipe", "pipe", "pipe"],
  });
  return r;
}

function assertGitRepo() {
  const gitDir = runGit(["rev-parse", "--git-dir"], { inheritIo: false });
  if (gitDir.status !== 0) {
    throw new Error("当前目录不是 git 仓库");
  }
}

function getPushRef() {
  const r = runGit(["branch", "--show-current"], { inheritIo: false });
  if (r.status !== 0) return "HEAD";
  const b = (r.stdout || "").trim();
  return b || "HEAD";
}

function assertLocalTagAbsent(tag) {
  const exists = runGit(["rev-parse", "-q", "--verify", `refs/tags/${tag}`], { inheritIo: false });
  if (exists.status === 0) {
    throw new Error(`本地已存在 tag ${tag}。若需重打请先执行: git tag -d ${tag}`);
  }
}

function createAnnotatedTag(tag) {
  const t = runGit(["tag", "-a", tag, "-m", `Release ${tag}`]);
  if (t.status !== 0) {
    throw new Error(`创建 tag ${tag} 失败`);
  }
}

function printPushInstructions(tag) {
  const ref = getPushRef();
  console.log("\n请推送（触发 CI 发版）：");
  console.log(`  git push origin ${ref} && git push origin ${tag}`);
}

/** 在当前 HEAD 上创建 v<version>（需三处版本文件已与 HEAD 一致） */
function createReleaseTag() {
  assertGitRepo();

  const dirty = runGit(["diff", "--quiet", "HEAD", "--", ...versionRelPaths], { inheritIo: false });
  if (dirty.status !== 0) {
    throw new Error(
      "版本相关文件相对 HEAD 仍有未提交变更。请先提交三处版本文件，或使用: pnpm run release:patch | release:minor | release:major",
    );
  }

  const ver = readPackageVersion();
  const tag = `v${ver}`;
  assertLocalTagAbsent(tag);
  createAnnotatedTag(tag);

  console.log(`已创建 tag ${tag}（指向当前 HEAD）`);
  printPushInstructions(tag);
}

/** 自增版本 → 仅提交三处版本文件 → 打 tag；CHANGELOG 等请在本命令前后单独提交 */
function releaseWithBump(kind) {
  assertGitRepo();

  bumpFromPackage(kind);
  const ver = readPackageVersion();
  const tag = `v${ver}`;

  const add = runGit(["add", ...versionRelPaths]);
  if (add.status !== 0) {
    throw new Error("git add 失败");
  }

  const commit = runGit(["commit", "-m", `chore(release): ${tag}`]);
  if (commit.status !== 0) {
    restoreVersionFilesFromHead();
    throw new Error(
      "git commit 失败（已把三处版本文件还原到当前 HEAD）。请配置 git user.name / user.email，并检查 pre-commit 等钩子后再执行 release。",
    );
  }

  assertLocalTagAbsent(tag);
  createAnnotatedTag(tag);

  console.log(`\n已完成：${tag}（版本已提交并已打 tag）`);
  printPushInstructions(tag);
}

const argv = process.argv.slice(2).filter((a) => a !== "--");
const [cmd, arg] = argv;

try {
  if (cmd === "set") {
    if (!arg) {
      console.error("用法: pnpm run version:set -- <版本>\n示例: pnpm run version:set -- 0.2.0");
      process.exit(1);
    }
    setAll(arg);
  } else if (cmd === "bump") {
    const kind = arg;
    if (kind !== "patch" && kind !== "minor" && kind !== "major") {
      console.error("用法: pnpm run version:patch | version:minor | version:major");
      console.error("或: node ./scripts/version.mjs bump <patch|minor|major>");
      process.exit(1);
    }
    bumpFromPackage(kind);
  } else if (cmd === "release") {
    const kind = arg;
    if (kind !== "patch" && kind !== "minor" && kind !== "major") {
      console.error("用法: pnpm run release:patch | release:minor | release:major");
      process.exit(1);
    }
    releaseWithBump(kind);
  } else if (cmd === "tag") {
    createReleaseTag();
  } else if (cmd === "sync" || cmd === undefined) {
    if (cmd === undefined && argv.length > 0) {
      console.error("未知子命令。使用: pnpm run version:set -- <版本>  或  pnpm run version:sync");
      process.exit(1);
    }
    syncFromPackage();
  } else {
    console.error("未知子命令:", cmd);
    console.error("可用: release <patch|minor|major> | bump <patch|minor|major> | set <版本> | sync | tag");
    process.exit(1);
  }
} catch (e) {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
}
