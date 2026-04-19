import { useMemo } from "react";
import changelogSource from "../../../../../CHANGELOG.md?raw";
import { APP_VERSION } from "../../../../appMeta";
import {
  parseChangelogMarkdown,
  stripSimpleMarkdownEmphasis,
} from "../../../../lib/parseChangelogMarkdown";

export function ChangelogSection() {
  const releases = useMemo(() => parseChangelogMarkdown(changelogSource), []);

  const versionMismatch = useMemo(() => {
    const top = releases[0]?.version;
    if (!top || top === APP_VERSION) return null;
    return { md: top, pkg: APP_VERSION };
  }, [releases]);

  if (releases.length === 0) {
    return (
      <p className="text-[13px] leading-snug text-muted-foreground">
        未解析到版本节：请检查仓库根目录{" "}
        <span className="font-mono text-foreground/90">CHANGELOG.md</span>{" "}
        是否包含{" "}
        <span className="font-mono text-foreground/90">## [x.y.z]</span>{" "}
        格式的标题。
      </p>
    );
  }

  return (
    <div className="space-y-3 text-[13px] leading-[1.45] text-muted-foreground">
      {versionMismatch ? (
        <p className="rounded-md border border-amber-500/35 bg-amber-500/10 px-2.5 py-1.5 text-[12px] leading-snug text-amber-950 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-100">
          文档最新版本为 v{versionMismatch.md}，与当前应用{" "}
          <span className="font-mono">package.json</span> 的 v
          {versionMismatch.pkg} 不一致，请核对后更新其一。
        </p>
      ) : null}

      {releases.map((release) => (
        <section key={release.version} className="space-y-1.5">
          <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0 border-b border-border/55 pb-1">
            <span className="text-sm font-semibold tabular-nums text-foreground">
              v{release.version}
            </span>
            {release.date ? (
              <>
                <span className="text-muted-foreground/70" aria-hidden>
                  ·
                </span>
                <time
                  className="text-[12px] tabular-nums text-muted-foreground"
                  dateTime={release.date}
                >
                  {release.date}
                </time>
              </>
            ) : null}
          </div>

          <dl className="m-0 space-y-1.5">
            {release.items.map((item) => (
              <div
                key={`${release.version}-${item.title}`}
                className="grid grid-cols-[3rem_minmax(0,1fr)] items-start gap-x-2 gap-y-0"
              >
                <dt className="shrink-0 pt-px text-left text-[12px] font-semibold text-foreground">
                  {item.title}
                </dt>
                <dd className="min-w-0">
                  {item.bullets.length > 0 ? (
                    <ul className="m-0 list-outside space-y-0.5 pl-[1.1em] marker:text-muted-foreground/60 [list-style-type:disc]">
                      {item.bullets.map((b, i) => (
                        <li key={i} className="pl-0.5">
                          {stripSimpleMarkdownEmphasis(b)}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <span className="text-muted-foreground/70">—</span>
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  );
}
