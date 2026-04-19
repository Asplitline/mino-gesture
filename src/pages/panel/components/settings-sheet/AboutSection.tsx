import { IconExternalLink } from "../../../../components/icons";
import { Button } from "../../../../components/ui/button";
import type { SettingsSectionContentProps } from "./types";

export function AboutSection({
  settings,
  openExternal,
}: SettingsSectionContentProps) {
  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-border/70 bg-muted/20">
        <div className="grid gap-0 divide-y divide-border/70">
          <div className="grid gap-1 px-4 py-3 sm:grid-cols-[88px_minmax(0,1fr)] sm:items-baseline">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              App
            </p>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">
                {settings?.appName ?? "Mino Gesture"}
              </p>
              <p className="mt-0.5 break-all text-[13px] leading-5 text-muted-foreground">
                {settings?.bundleIdentifier ?? "com.mino.gesture"}
              </p>
            </div>
          </div>
          <div className="grid gap-1 px-4 py-3 sm:grid-cols-[88px_minmax(0,1fr)] sm:items-baseline">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Author
            </p>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">
                {settings?.about.author ?? "-"}
              </p>
              {settings?.about.githubUrl ? (
                <button
                  type="button"
                  className="mt-0.5 break-all text-left text-[13px] leading-5 text-primary underline decoration-primary/40 underline-offset-2 transition-colors hover:text-primary/80"
                  onClick={() => void openExternal(settings.about.githubUrl)}
                >
                  {settings.about.githubUrl}
                </button>
              ) : (
                <p className="mt-0.5 break-all text-[13px] leading-5 text-muted-foreground">
                  -
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="app-panel-surface rounded-2xl p-4">
        <p className="text-sm font-semibold text-foreground">项目仓库</p>
        <p className="mt-1 text-[13px] leading-5 text-muted-foreground">
          可在 GitHub 查看源码、版本发布以及后续更新。
        </p>
        <div className="mt-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void openExternal(settings?.about.githubUrl ?? "")}
            disabled={!settings?.about.githubUrl}
          >
            <IconExternalLink className="h-4 w-4" />
            打开 GitHub
          </Button>
        </div>
      </div>
    </div>
  );
}
