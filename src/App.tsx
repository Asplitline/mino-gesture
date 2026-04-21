import { useCallback, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { Button } from "./components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./components/ui/dialog";
import { markOnboardingCompleted, readRouteState } from "./lib/appRoute";
import { HomePage } from "./pages/home/HomePage";
import { PanelPage } from "./pages/panel/PanelPage";

export function App() {
  const [routeState, setRouteState] = useState(readRouteState);
  const [closeToTrayHintOpen, setCloseToTrayHintOpen] = useState(false);
  const [closeToTrayHintBusy, setCloseToTrayHintBusy] = useState(false);
  const route = routeState.route;

  const handleIntentHandled = useCallback(() => {
    markOnboardingCompleted();
    window.history.replaceState({}, "", "/panel");
    setRouteState(readRouteState());
  }, []);

  useEffect(() => {
    const onPopState = () => setRouteState(readRouteState());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    if (routeState.route !== "panel") return;
    markOnboardingCompleted();
    if (window.location.pathname !== "/panel") {
      window.history.replaceState({}, "", `/panel${window.location.search}`);
      setRouteState(readRouteState());
    }
  }, [routeState.route, routeState.search]);

  useEffect(() => {
    const unlisten = listen("close-to-tray-hint-requested", () => {
      setCloseToTrayHintOpen(true);
    });

    return () => {
      void unlisten.then((dispose) => dispose());
    };
  }, []);

  const chooseCloseBehavior = useCallback(async (minimizeToTrayOnClose: boolean) => {
    setCloseToTrayHintBusy(true);
    try {
      await invoke("remember_close_behavior_choice", {
        minimizeToTrayOnClose,
      });
      setCloseToTrayHintOpen(false);
      const window = getCurrentWebviewWindow();
      if (minimizeToTrayOnClose) {
        await invoke("hide_main_window_to_tray");
      } else {
        await window.close();
      }
    } finally {
      setCloseToTrayHintBusy(false);
    }
  }, []);

  const closeBehaviorDialog = (
    <Dialog open={closeToTrayHintOpen} onOpenChange={setCloseToTrayHintOpen}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>关闭窗口时怎么处理？</DialogTitle>
          <DialogDescription className="leading-relaxed">
            你可以选择直接关闭应用，或者最小化到托盘继续后台运行。我们会记住你这次的选择，之后也可以在设置里修改。
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => void chooseCloseBehavior(false)}
            disabled={closeToTrayHintBusy}
          >
            {closeToTrayHintBusy ? "处理中…" : "直接关闭"}
          </Button>
          <Button
            onClick={() => void chooseCloseBehavior(true)}
            disabled={closeToTrayHintBusy}
          >
            {closeToTrayHintBusy ? "处理中…" : "最小化到托盘"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  if (route === "home") {
    return (
      <>
        <HomePage
          onOpenPanel={() => {
            markOnboardingCompleted();
            window.history.pushState({}, "", "/panel");
            setRouteState(readRouteState());
          }}
          onOpenPanelCreate={() => {
            markOnboardingCompleted();
            window.history.pushState({}, "", "/panel?intent=create");
            setRouteState(readRouteState());
          }}
        />
        {closeBehaviorDialog}
      </>
    );
  }

  return (
    <>
      <PanelPage
        routeSearch={routeState.search}
        onIntentHandled={handleIntentHandled}
        onBackHome={() => {
          window.history.pushState({}, "", "/home");
          setRouteState(readRouteState());
        }}
      />
      {closeBehaviorDialog}
    </>
  );
}
