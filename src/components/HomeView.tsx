import { Button } from "./ui/button";

type HomeViewProps = {
  onOpenPanel: () => void;
  onOpenPanelCreate: () => void;
};

export function HomeView({ onOpenPanel, onOpenPanelCreate }: HomeViewProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f5f2fa] to-[#eef3ff] px-6 py-10 dark:from-zinc-950 dark:to-zinc-900">
      <div className="mx-auto flex min-h-[80vh] w-full max-w-[720px] flex-col items-center justify-center gap-8 text-center">
        <div className="space-y-3">
          <h1 className="text-4xl font-semibold tracking-tight text-foreground">Welcome to Gesture Control</h1>
          <p className="text-sm text-muted-foreground">配置你的首个鼠标手势流程，快速进入控制中心。</p>
        </div>
        <div className="w-full max-w-sm space-y-3">
          <Button className="h-12 w-full text-base" onClick={onOpenPanel}>
            Get Started with a Demo Gesture
          </Button>
          <Button variant="secondary" className="h-12 w-full text-base" onClick={onOpenPanelCreate}>
            Create a New Gesture
          </Button>
        </div>
      </div>
    </div>
  );
}
