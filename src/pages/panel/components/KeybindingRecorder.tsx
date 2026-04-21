import { useCallback, useEffect, useRef, useState } from "react";
import type { ActionHotkeySnapshot } from "../../../types/app";
import {
  buildHotkeySnapshot,
  keyboardEventToHotkeySnapshot,
  keyboardEventToMainKeyCode,
} from "../../../lib/macKeyboard";
import { cn } from "../../../lib/utils";
import { IconClear } from "../../../components/icons";
import { HotkeyKeycapSequence } from "./HotkeyKeycaps";

type KeybindingRecorderProps = {
  value: ActionHotkeySnapshot | null;
  onChange: (v: ActionHotkeySnapshot | null) => void;
  disabled?: boolean;
};

type ModState = Pick<ActionHotkeySnapshot, "control" | "option" | "shift" | "command">;

const emptyMods: ModState = {
  command: false,
  option: false,
  shift: false,
  control: false,
};

function captureFieldClass(active: boolean, disabled?: boolean) {
  return cn(
    "flex min-h-[34px] flex-1 items-center rounded-l-lg border border-r-0 px-2 py-1 text-xs outline-none transition-[border-color,box-shadow,background-color]",
    active
      ? "border-primary/55 bg-primary/[0.06] ring-2 ring-primary/30 ring-offset-0 dark:bg-primary/[0.08] dark:ring-primary/35"
      : "border-border/80 bg-muted/25 dark:border-border/60 dark:bg-muted/20",
    disabled && "cursor-not-allowed opacity-50",
    !disabled && "cursor-text",
  );
}

export function KeybindingRecorder({ value, onChange, disabled }: KeybindingRecorderProps) {
  const [recordingCombo, setRecordingCombo] = useState(false);
  const [recordingMain, setRecordingMain] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [mods, setMods] = useState<ModState>({ ...emptyMods });
  const [mainKeyCode, setMainKeyCode] = useState<number | null>(null);

  const comboCaptureRef = useRef<HTMLDivElement>(null);
  const mainKeyCaptureRef = useRef<HTMLDivElement>(null);

  const [comboFocused, setComboFocused] = useState(false);
  const [mainKeyFocused, setMainKeyFocused] = useState(false);

  useEffect(() => {
    if (value) {
      setMods({
        command: value.command,
        option: value.option,
        shift: value.shift,
        control: value.control,
      });
      setMainKeyCode(value.keyCode);
    } else {
      setMods({ ...emptyMods });
      setMainKeyCode(null);
    }
  }, [value]);

  useEffect(() => {
    if (!recordingCombo || disabled) return;

    const listenerOpts: AddEventListenerOptions = { capture: true, passive: false };

    const onKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      if (e.repeat) return;

      if (e.key === "Escape") {
        setRecordingCombo(false);
        comboCaptureRef.current?.blur();
        return;
      }

      const snap = keyboardEventToHotkeySnapshot(e);
      if (snap) {
        onChange(snap);
        setRecordingCombo(false);
      }
    };

    window.addEventListener("keydown", onKeyDown, listenerOpts);
    return () => window.removeEventListener("keydown", onKeyDown, listenerOpts);
  }, [recordingCombo, disabled, onChange]);

  useEffect(() => {
    if (!recordingMain || disabled || !manualOpen) return;

    const listenerOpts: AddEventListenerOptions = { capture: true, passive: false };

    const onKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      if (e.repeat) return;

      if (e.key === "Escape") {
        setRecordingMain(false);
        mainKeyCaptureRef.current?.blur();
        return;
      }

      const keyCode = keyboardEventToMainKeyCode(e);
      if (keyCode === null) return;

      const snap = buildHotkeySnapshot(keyCode, mods);
      onChange(snap);
      setMainKeyCode(keyCode);
      setRecordingMain(false);
    };

    window.addEventListener("keydown", onKeyDown, listenerOpts);
    return () => window.removeEventListener("keydown", onKeyDown, listenerOpts);
  }, [recordingMain, disabled, onChange, mods, manualOpen]);

  const toggleMod = useCallback(
    (key: keyof ModState) => {
      setMods((prev) => {
        const next = { ...prev, [key]: !prev[key] };
        if (mainKeyCode !== null) {
          onChange(buildHotkeySnapshot(mainKeyCode, next));
        }
        return next;
      });
    },
    [mainKeyCode, onChange],
  );

  const modifierButtonClass = (pressed: boolean) =>
    cn(
      "min-w-[2.35rem] rounded-md border px-1.5 py-1 text-center text-xs font-medium leading-tight transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
      pressed
        ? "border-primary/60 bg-primary/15 text-foreground shadow-sm dark:border-primary/50 dark:bg-primary/20"
        : "border-border/80 bg-background text-muted-foreground hover:border-border hover:bg-muted/40 hover:text-foreground dark:border-border/60 dark:bg-background/80",
    );

  const clearAll = useCallback(() => {
    onChange(null);
    setRecordingCombo(false);
    setRecordingMain(false);
    queueMicrotask(() => {
      if (comboCaptureRef.current && document.activeElement === comboCaptureRef.current) {
        setRecordingCombo(true);
      }
      if (mainKeyCaptureRef.current && document.activeElement === mainKeyCaptureRef.current) {
        setRecordingMain(true);
      }
    });
  }, [onChange]);

  const onComboFocus = useCallback(() => {
    if (disabled) return;
    setComboFocused(true);
    setRecordingCombo(true);
  }, [disabled]);

  const onComboBlur = useCallback((e: React.FocusEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
      setComboFocused(false);
      setRecordingCombo(false);
    }
  }, []);

  const onMainKeyFocus = useCallback(() => {
    if (disabled) return;
    setMainKeyFocused(true);
    setRecordingMain(true);
  }, [disabled]);

  const onMainKeyBlur = useCallback((e: React.FocusEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
      setMainKeyFocused(false);
      setRecordingMain(false);
    }
  }, []);

  const preview =
    mainKeyCode !== null ? buildHotkeySnapshot(mainKeyCode, mods) : null;

  const comboActive = comboFocused || recordingCombo;
  const mainKeyActive = mainKeyFocused || recordingMain;
  const comboStatus = value
    ? "已录制快捷键"
    : recordingCombo
      ? "正在录制，按下完整组合键"
      : "聚焦录制区域后按下快捷键";

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-medium text-muted-foreground">快速录制</p>
          <p className="text-xs text-muted-foreground" aria-live="polite">
            {comboStatus}
          </p>
        </div>
        <div
          className={cn(
            "flex overflow-hidden rounded-lg border transition-[border-color,box-shadow]",
            comboActive ? "border-primary/45 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.04)] dark:border-primary/40" : "border-border/80 dark:border-border/60",
            disabled && "opacity-50",
          )}
        >
          <div
            ref={comboCaptureRef}
            tabIndex={disabled ? -1 : 0}
            role="group"
            aria-label="录制组合键，聚焦后按键"
            className={captureFieldClass(comboActive, disabled)}
            onFocus={onComboFocus}
            onBlur={onComboBlur}
          >
            {value ? (
              <HotkeyKeycapSequence snapshot={value} size="input" />
            ) : recordingCombo ? (
              <span className="text-muted-foreground">按下完整组合键…</span>
            ) : (
              <span className="text-muted-foreground">聚焦后录制</span>
            )}
          </div>
          {value && (
            <button
              type="button"
              disabled={disabled}
              aria-label="清除快捷键"
              className={cn(
                "flex shrink-0 items-center justify-center rounded-r-lg border border-l-0 px-2 transition-colors",
                comboActive
                  ? "border-primary/45 bg-primary/[0.06] dark:bg-primary/[0.08]"
                  : "border-border/80 bg-muted/25 dark:border-border/60 dark:bg-muted/20",
                !disabled && "text-muted-foreground hover:bg-destructive/10 hover:text-destructive",
                disabled && "cursor-not-allowed opacity-50",
              )}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => clearAll()}
            >
              <IconClear className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <div className="flex items-center justify-between gap-3 text-xs leading-snug">
          <p className="text-muted-foreground">推荐直接录制一次完整组合键；Esc 取消当前录制。</p>
          <button
            type="button"
            className="shrink-0 font-medium text-primary transition-colors hover:text-primary/80"
            onClick={() => setManualOpen((prev) => !prev)}
          >
            {manualOpen ? "收起手动录入" : "改用手动录入"}
          </button>
        </div>
      </div>

      {manualOpen && (
        <div className="space-y-3 rounded-lg border border-border/70 bg-muted/15 p-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-medium text-muted-foreground">手动录入</p>
            <p className="text-xs text-muted-foreground">适合部分组合键无法直接录制时使用</p>
          </div>
          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">修饰键（点选填入，再点可取消）</p>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="修饰键">
              <button
                type="button"
                disabled={disabled}
                aria-pressed={mods.command}
                className={modifierButtonClass(mods.command)}
                onClick={() => toggleMod("command")}
              >
                <span className="font-mono text-sm leading-none">⌘</span>
                <span className="mt-px block text-[9px] font-normal leading-none opacity-80">Cmd</span>
              </button>
              <button
                type="button"
                disabled={disabled}
                aria-pressed={mods.option}
                className={modifierButtonClass(mods.option)}
                onClick={() => toggleMod("option")}
              >
                <span className="font-mono text-sm leading-none">⌥</span>
                <span className="mt-px block text-[9px] font-normal leading-none opacity-80">Opt</span>
              </button>
              <button
                type="button"
                disabled={disabled}
                aria-pressed={mods.control}
                className={modifierButtonClass(mods.control)}
                onClick={() => toggleMod("control")}
              >
                <span className="font-mono text-sm leading-none">⌃</span>
                <span className="mt-px block text-[9px] font-normal leading-none opacity-80">Ctrl</span>
              </button>
              <button
                type="button"
                disabled={disabled}
                aria-pressed={mods.shift}
                className={modifierButtonClass(mods.shift)}
                onClick={() => toggleMod("shift")}
              >
                <span className="font-mono text-sm leading-none">⇧</span>
                <span className="mt-px block text-[9px] font-normal leading-none opacity-80">Shift</span>
              </button>
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">主键</p>
            <div
              className={cn(
                "flex overflow-hidden rounded-lg border transition-[border-color,box-shadow]",
                mainKeyActive ? "border-primary/45 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.04)] dark:border-primary/40" : "border-border/80 dark:border-border/60",
                disabled && "opacity-50",
              )}
            >
              <div
                ref={mainKeyCaptureRef}
                tabIndex={disabled ? -1 : 0}
                role="group"
                aria-label="录制主键，聚焦后按键"
                className={captureFieldClass(mainKeyActive, disabled)}
                onFocus={onMainKeyFocus}
                onBlur={onMainKeyBlur}
              >
                {preview ? (
                  <HotkeyKeycapSequence snapshot={preview} size="input" />
                ) : recordingMain ? (
                  <span className="text-muted-foreground">按下一个主键…</span>
                ) : (
                  <span className="text-muted-foreground">聚焦后录制</span>
                )}
              </div>
              {preview && (
                <button
                  type="button"
                  disabled={disabled}
                  aria-label="清除主键与快捷键"
                  className={cn(
                    "flex shrink-0 items-center justify-center rounded-r-lg border border-l-0 px-2 transition-colors",
                    mainKeyActive
                      ? "border-primary/45 bg-primary/[0.06] dark:bg-primary/[0.08]"
                      : "border-border/80 bg-muted/25 dark:border-border/60 dark:bg-muted/20",
                    !disabled && "text-muted-foreground hover:bg-destructive/10 hover:text-destructive",
                    disabled && "cursor-not-allowed opacity-50",
                  )}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => clearAll()}
                >
                  <IconClear className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          <p className="text-xs leading-snug text-muted-foreground">
            先点选需要的修饰键，再聚焦主键区域按下一个普通键完成；仅支持已映射键位；Esc 取消主键录制并失焦。
          </p>
        </div>
      )}
    </div>
  );
}
