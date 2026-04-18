import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";

type InputEvent = 
  | { type: "key_press"; key: string; code?: number }
  | { type: "key_release"; key: string; code?: number }
  | { type: "mouse_press"; button: string }
  | { type: "mouse_release"; button: string };

interface EventLog {
  id: number;
  timestamp: number;
  event: InputEvent;
}

export function App() {
  const [events, setEvents] = useState<EventLog[]>([]);
  const [currentKeys, setCurrentKeys] = useState<Set<string>>(new Set());
  const [currentButtons, setCurrentButtons] = useState<Set<string>>(new Set());
  const [isListening, setIsListening] = useState(false);
  const [lastEventTime, setLastEventTime] = useState<number | null>(null);

  useEffect(() => {
    console.log("🚀 Setting up event listener...");
    setIsListening(true);
    
    const unlisten = listen<InputEvent>("input-event", (event) => {
      const payload = event.payload;
      const now = Date.now();
      
      // 详细日志
      console.group(`📨 [${new Date(now).toLocaleTimeString()}] Input Event`);
      console.log("Type:", payload.type);
      if (payload.type === "key_press" || payload.type === "key_release") {
        console.log("Key:", payload.key);
      } else if (payload.type === "mouse_press" || payload.type === "mouse_release") {
        console.log("Button:", payload.button);
        console.log("Button type:", typeof payload.button);
        console.log("Is Middle:", payload.button === "中键");
      }
      console.log("Full payload:", JSON.stringify(payload));
      console.groupEnd();
      
      setLastEventTime(now);
      
      // 更新当前按下的键/按钮状态
      if (payload.type === "key_press") {
        console.log("➕ Adding key:", payload.key);
        setCurrentKeys((prev) => new Set(prev).add(payload.key));
      } else if (payload.type === "key_release") {
        console.log("➖ Removing key:", payload.key);
        setCurrentKeys((prev) => {
          const next = new Set(prev);
          next.delete(payload.key);
          return next;
        });
      } else if (payload.type === "mouse_press") {
        console.log("🖱️ ➕ Adding button:", payload.button);
        setCurrentButtons((prev) => {
          const next = new Set(prev).add(payload.button);
          console.log("Current buttons after add:", Array.from(next));
          return next;
        });
      } else if (payload.type === "mouse_release") {
        console.log("🖱️ ➖ Removing button:", payload.button);
        setCurrentButtons((prev) => {
          const next = new Set(prev);
          next.delete(payload.button);
          console.log("Current buttons after remove:", Array.from(next));
          return next;
        });
      }

      // 添加到事件日志
      setEvents((prev) => {
        const newEvent: EventLog = {
          id: Date.now() + Math.random(),
          timestamp: Date.now(),
          event: payload,
        };
        return [newEvent, ...prev].slice(0, 50); // 保持最新50条
      });
    });

    return () => {
      console.log("Cleaning up event listener...");
      setIsListening(false);
      unlisten.then((fn) => fn());
    };
  }, []);

  const formatLastEventTime = () => {
    if (!lastEventTime) return "从未收到事件";
    const seconds = Math.floor((Date.now() - lastEventTime) / 1000);
    if (seconds < 1) return "刚刚";
    if (seconds < 60) return `${seconds}秒前`;
    return `${Math.floor(seconds / 60)}分钟前`;
  };

  const getEventDisplay = (event: InputEvent): { icon: string; text: string; color: string } => {
    switch (event.type) {
      case "key_press":
        return { icon: "⌨️", text: event.key, color: "text-blue-600 dark:text-blue-400" };
      case "key_release":
        return { icon: "⌨️", text: `${event.key} ↑`, color: "text-blue-400 dark:text-blue-500" };
      case "mouse_press":
        return { icon: "🖱️", text: event.button, color: "text-green-600 dark:text-green-400" };
      case "mouse_release":
        return { icon: "🖱️", text: `${event.button} ↑`, color: "text-green-400 dark:text-green-500" };
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("zh-CN", { 
      hour12: false, 
      hour: "2-digit", 
      minute: "2-digit", 
      second: "2-digit",
      fractionalSecondDigits: 3
    });
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      {/* Header */}
      <header className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold">Mino Gesture</h1>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                实时监听键盘和鼠标事件
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isListening ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`}></div>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {isListening ? '监听中' : '未连接'}
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="p-6 space-y-6">
        {/* 当前按下的键/按钮 */}
        <section className="space-y-3">
          <h2 className="text-lg font-medium">当前按下</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 键盘 */}
            <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">⌨️</span>
                <h3 className="font-medium">键盘</h3>
              </div>
              <div className="min-h-[60px] flex flex-wrap gap-2">
                {currentKeys.size === 0 ? (
                  <span className="text-sm text-gray-500 dark:text-gray-500">未按下任何键</span>
                ) : (
                  Array.from(currentKeys).map((key) => (
                    <span
                      key={key}
                      className="inline-flex items-center px-3 py-1.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-mono text-sm border border-blue-200 dark:border-blue-800"
                    >
                      {key}
                    </span>
                  ))
                )}
              </div>
            </div>

            {/* 鼠标 */}
            <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">🖱️</span>
                <h3 className="font-medium">鼠标</h3>
              </div>
              <div className="min-h-[60px] flex flex-wrap gap-2">
                {currentButtons.size === 0 ? (
                  <span className="text-sm text-gray-500 dark:text-gray-500">未按下任何键</span>
                ) : (
                  Array.from(currentButtons).map((button) => (
                    <span
                      key={button}
                      className="inline-flex items-center px-3 py-1.5 rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 font-medium text-sm border border-green-200 dark:border-green-800"
                    >
                      {button}
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>
        </section>

        {/* 事件日志 */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">事件日志</h2>
            {events.length > 0 && (
              <button
                onClick={() => setEvents([])}
                className="text-sm px-3 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400"
              >
                清空
              </button>
            )}
          </div>

          <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
            {events.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-500">
                等待事件...按下键盘或鼠标
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-800 max-h-[500px] overflow-y-auto">
                {events.map((log) => {
                  const display = getEventDisplay(log.event);
                  return (
                    <div
                      key={log.id}
                      className="p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{display.icon}</span>
                        <span className={`font-mono text-sm font-medium ${display.color}`}>
                          {display.text}
                        </span>
                        <span className="ml-auto text-xs text-gray-500 dark:text-gray-500 font-mono">
                          {formatTime(log.timestamp)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* 调试信息 */}
        <section className="rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-4">
          <div className="flex gap-3">
            <span className="text-yellow-600 dark:text-yellow-500">🔧</span>
            <div className="flex-1 space-y-2 text-sm">
              <p className="font-medium text-yellow-800 dark:text-yellow-300">调试信息</p>
              <div className="grid grid-cols-2 gap-2 text-yellow-700 dark:text-yellow-400">
                <div>
                  <span className="text-yellow-600 dark:text-yellow-500">监听状态:</span>{" "}
                  <span className="font-mono">{isListening ? "✓ 已连接" : "✗ 未连接"}</span>
                </div>
                <div>
                  <span className="text-yellow-600 dark:text-yellow-500">最后事件:</span>{" "}
                  <span className="font-mono">{formatLastEventTime()}</span>
                </div>
                <div>
                  <span className="text-yellow-600 dark:text-yellow-500">事件总数:</span>{" "}
                  <span className="font-mono">{events.length}</span>
                </div>
                <div>
                  <span className="text-yellow-600 dark:text-yellow-500">按下中:</span>{" "}
                  <span className="font-mono">{currentKeys.size + currentButtons.size} 个</span>
                </div>
              </div>
              <p className="mt-2 text-xs text-yellow-600 dark:text-yellow-500 border-t border-yellow-200 dark:border-yellow-800 pt-2">
                💡 提示: 按 Cmd+Option+I 打开开发者工具查看详细日志
              </p>
            </div>
          </div>
        </section>

        {/* 提示信息 */}
        <section className="rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-4">
          <div className="flex gap-3">
            <span className="text-blue-500">ℹ️</span>
            <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
              <p>• 按下任意键盘按键或鼠标按钮即可看到实时回显</p>
              <p>• 支持组合键显示(如同时按下多个键)</p>
              <p>• 事件日志保留最近50条记录</p>
              <p>• <strong>测试中键:</strong> 点击鼠标滚轮查看是否显示"中键"</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}