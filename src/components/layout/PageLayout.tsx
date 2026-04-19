import type { ReactNode } from "react";
import { cn } from "../../lib/utils";

const containerVariants = {
  md: "max-w-[960px]",
  lg: "max-w-[1200px]",
  xl: "max-w-[1380px]",
  full: "max-w-none",
} as const;

type PageLayoutProps = {
  header?: ReactNode;
  footer?: ReactNode;
  sidebar?: ReactNode;
  children: ReactNode;
  backgroundClassName?: string;
  shellClassName?: string;
  headerClassName?: string;
  contentClassName?: string;
  footerClassName?: string;
  contentContainerClassName?: string;
  sidebarClassName?: string;
  containerClassName?: string;
  containerSize?: keyof typeof containerVariants;
  stickyHeader?: boolean;
  stickyFooter?: boolean;
  stickySidebar?: boolean;
};

export function PageLayout({
  header,
  footer,
  sidebar,
  children,
  backgroundClassName,
  shellClassName,
  headerClassName,
  contentClassName,
  footerClassName,
  contentContainerClassName,
  sidebarClassName,
  containerClassName,
  containerSize = "xl",
  stickyHeader = false,
  stickyFooter = false,
  stickySidebar = false,
}: PageLayoutProps) {
  const containerClass = cn(
    "mx-auto w-full px-4 sm:px-5",
    containerVariants[containerSize],
    containerClassName,
  );

  return (
    <div
      className={cn(
        "app-page-surface min-h-screen",
        backgroundClassName,
      )}
    >
      <div className={cn("mx-auto flex min-h-screen w-full max-w-[1440px] flex-col", shellClassName)}>
        {header ? (
          <header
            className={cn(
              stickyHeader && "sticky top-0 z-30",
              headerClassName,
            )}
          >
            <div className={containerClass}>{header}</div>
          </header>
        ) : null}
        <main className={cn("min-h-0 flex-1", contentClassName)}>
          {sidebar ? (
            <div className={cn(containerClass, "grid gap-5", contentContainerClassName)}>
              <div className="min-w-0">{children}</div>
              <aside
                className={cn(
                  "space-y-4",
                  stickySidebar && "xl:sticky xl:top-5 xl:self-start",
                  sidebarClassName,
                )}
              >
                {sidebar}
              </aside>
            </div>
          ) : (
            children
          )}
        </main>
        {footer ? (
          <footer
            className={cn(
              stickyFooter && "sticky bottom-0 z-20",
              footerClassName,
            )}
          >
            <div className={containerClass}>{footer}</div>
          </footer>
        ) : null}
      </div>
    </div>
  );
}
