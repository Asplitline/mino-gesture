import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";

type AppStatus = {
  enabled: boolean;
  inputRunning: boolean;
  recognizerReady: boolean;
  hotkeyReady: boolean;
  configPath: string;
};

export function App() {
  const [status, setStatus] = useState<AppStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setError(null);
    const nextStatus = await invoke<AppStatus>("get_status");
    setStatus(nextStatus);
  };

  const setEnabled = async (enabled: boolean) => {
    try {
      setLoading(true);
      await invoke("set_enabled", { enabled });
      await refresh();
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh().catch((e) => setError(String(e)));
  }, []);

  return (
    <main className="mx-auto grid min-h-screen w-full max-w-3xl gap-4 bg-slate-950 px-6 py-6 text-slate-100">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">mino-gesture</h1>
        <p className="mt-1 text-sm text-slate-400">
          Milestone 1 Foundation Console
        </p>
      </header>

      <section className="rounded-xl border border-slate-700 bg-slate-900 p-4">
        <h2 className="text-lg font-medium">Permissions</h2>
        <p className="mt-2 text-slate-300">
          Please enable Accessibility and Input Monitoring for this app in
          macOS Settings - Privacy & Security.
        </p>
      </section>

      <section className="rounded-xl border border-slate-700 bg-slate-900 p-4">
        <h2 className="text-lg font-medium">Runtime</h2>
        {status ? (
          <ul className="mt-2 grid list-disc gap-1 pl-5 text-sm text-slate-300">
            <li>Enabled: {String(status.enabled)}</li>
            <li>Input module: {String(status.inputRunning)}</li>
            <li>Gesture recognizer: {String(status.recognizerReady)}</li>
            <li>Hotkey action: {String(status.hotkeyReady)}</li>
            <li>Config: {status.configPath}</li>
          </ul>
        ) : (
          <p className="mt-2 text-slate-300">Loading...</p>
        )}
        <div className="mt-3 flex gap-2">
          <button
            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => setEnabled(true)}
            disabled={loading}
          >
            Enable
          </button>
          <button
            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => setEnabled(false)}
            disabled={loading}
          >
            Disable
          </button>
          <button
            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => refresh()}
            disabled={loading}
          >
            Refresh
          </button>
        </div>
      </section>
      {error && <p className="text-sm text-rose-300">{error}</p>}
    </main>
  );
}
