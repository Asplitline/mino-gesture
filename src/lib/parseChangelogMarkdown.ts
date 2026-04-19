export type ChangelogMdItem = {
  title: string;
  bullets: string[];
};

export type ChangelogMdRelease = {
  version: string;
  date?: string;
  items: ChangelogMdItem[];
};

/** 去掉 `**强调**`，避免在纯文本 UI 里露出星号 */
export function stripSimpleMarkdownEmphasis(text: string): string {
  return text.replace(/\*\*([^*]+)\*\*/g, "$1").replace(/\*([^*]+)\*/g, "$1");
}

/**
 * 解析根目录 `CHANGELOG.md` 中「版本」区块。
 * 约定见同仓库 `docs/CHANGELOG_GENERATION.md`。
 *
 * 注意：不得使用 `(?=…|$)` 且同时开启 `/m` 来截断正文——在 JS 里 `$` 会匹配**每一行**结尾，
 * 导致惰性 `[\s\S]*?` 在第一行就结束，界面看起来像「日志没显示」。
 */
export function parseChangelogMarkdown(source: string): ChangelogMdRelease[] {
  let normalized = source.replace(/\r\n/g, "\n");

  normalized = normalized.replace(/<!--[\s\S]*?-->/g, "").trim();

  normalized = normalized.replace(/\n(?:\[[^\]]+\]: [^\n]+\n*)+$/g, "");

  const headerRe = /^## \[([^\]]+)\]\s*(?:-\s*([^\n]+))?\s*\n/gm;

  const markers: {
    version: string;
    date?: string;
    headerStart: number;
    bodyStart: number;
  }[] = [];

  let hm: RegExpExecArray | null;
  while ((hm = headerRe.exec(normalized)) !== null) {
    markers.push({
      version: hm[1].trim(),
      date: hm[2]?.trim(),
      headerStart: hm.index,
      bodyStart: hm.index + hm[0].length,
    });
  }

  const releases: ChangelogMdRelease[] = [];
  for (let i = 0; i < markers.length; i++) {
    const bodyEnd =
      i + 1 < markers.length ? markers[i + 1].headerStart : normalized.length;
    const body = normalized.slice(markers[i].bodyStart, bodyEnd).trim();
    releases.push({
      version: markers[i].version,
      date: markers[i].date,
      items: parseReleaseItems(body),
    });
  }

  return releases;
}

function parseReleaseItems(body: string): ChangelogMdItem[] {
  const rawChunks = body.split(/^### /m).filter((c) => c.trim().length > 0);
  const items: ChangelogMdItem[] = [];

  for (const raw of rawChunks) {
    const nl = raw.indexOf("\n");
    const title = (nl === -1 ? raw : raw.slice(0, nl)).trim();
    const rest = (nl === -1 ? "" : raw.slice(nl + 1)).trim();
    const bullets = rest
      .split("\n")
      .map((l) => l.trimEnd())
      .map((l) => l.trim())
      .filter((l) => l.startsWith("- "))
      .map((l) => l.slice(2).trim())
      .filter((l) => l.length > 0);

    if (title.length > 0) {
      items.push({ title, bullets });
    }
  }

  return items;
}
