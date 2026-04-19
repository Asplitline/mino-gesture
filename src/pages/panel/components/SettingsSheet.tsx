import { useState } from "react";
import { IconRefreshCcw } from "../../../components/icons";
import { Button } from "../../../components/ui/button";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "../../../components/ui/sheet";
import { SectionShell } from "./settings-sheet/SectionShell";
import { SETTINGS_SECTIONS } from "./settings-sheet/sections";
import type {
  SettingsSectionContentProps,
  SettingsSectionId,
} from "./settings-sheet/types";
import { useSettingsOverview } from "./settings-sheet/useSettingsOverview";

type SettingsSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onResetRules: () => Promise<void>;
  resettingRules: boolean;
};

export function SettingsSheet({
  open,
  onOpenChange,
  onResetRules,
  resettingRules,
}: SettingsSheetProps) {
  const [activeSection, setActiveSection] =
    useState<SettingsSectionId>("general");
  const settingsState = useSettingsOverview(open);
  const activeSectionDefinition =
    SETTINGS_SECTIONS.find((section) => section.id === activeSection) ??
    SETTINGS_SECTIONS[0];
  const contentProps: SettingsSectionContentProps = {
    ...settingsState,
    onResetRules,
    resettingRules,
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        size="fullscreen"
        className="flex min-h-0 flex-col gap-0 bg-card p-0"
      >
        <SheetHeader className="border-b border-border/70">
          <div className="pr-8">
            <div className="flex items-center gap-1.5">
              <SheetTitle className="mb-0">设置</SheetTitle>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground"
                onClick={() => void settingsState.refreshSettings()}
                disabled={settingsState.loading}
                aria-label="刷新"
              >
                <IconRefreshCcw
                  className={`h-4 w-4 ${settingsState.loading ? "animate-spin" : ""}`}
                />
              </Button>
            </div>
            <SheetDescription className="mt-1.5">
              偏好设置采用左侧菜单和右侧内容区，不再堆叠成长列表。
            </SheetDescription>
          </div>
        </SheetHeader>
        <SheetBody className="px-0 py-0">
          {settingsState.error ? (
            <div className="border-b border-destructive/20 bg-destructive/10 px-6 py-3 text-sm text-destructive">
              {settingsState.error}
            </div>
          ) : null}
          <div className="grid h-full min-h-0 grid-cols-[220px_minmax(0,1fr)]">
            <aside className="min-h-0 border-r border-border/70 bg-muted/25 px-3 py-4">
              <nav className="space-y-1">
                {SETTINGS_SECTIONS.map((section) => {
                  const Icon = section.icon;
                  const active = section.id === activeSection;
                  return (
                    <button
                      key={section.id}
                      type="button"
                      onClick={() => setActiveSection(section.id)}
                      className={[
                        "flex w-full items-start gap-3 rounded-2xl px-3 py-3 text-left transition-colors",
                        active
                          ? "bg-card text-foreground shadow-sm ring-1 ring-border/70"
                          : "text-muted-foreground hover:bg-card/70 hover:text-foreground",
                      ].join(" ")}
                    >
                      <span
                        className={`mt-0.5 rounded-xl p-2 ${active ? "bg-primary/12 text-primary" : "bg-background text-muted-foreground"}`}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold">
                          {section.label}
                        </span>
                        <span className="mt-0.5 block text-xs leading-relaxed opacity-80">
                          {section.description}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </nav>
            </aside>
            <section className="min-h-0 bg-card">
              <SectionShell
                eyebrow={activeSectionDefinition.eyebrow}
                title={activeSectionDefinition.title}
                description={activeSectionDefinition.panelDescription}
              >
                {activeSectionDefinition.render(contentProps)}
              </SectionShell>
            </section>
          </div>
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
