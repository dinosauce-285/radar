import { useEffect, useState } from "react";

type Choice = "light" | "dark" | "system";
const KEY = "radar.theme";

function read(): Choice {
  try {
    const v = localStorage.getItem(KEY);
    return v === "light" || v === "dark" ? v : "system";
  } catch {
    return "system";
  }
}

/**
 * Three states, not two. "System" is a real choice and the default: without it the
 * app can never follow the OS again once the reader has touched the toggle.
 */
export function ThemeToggle() {
  const [choice, setChoice] = useState<Choice>(read);

  useEffect(() => {
    const root = document.documentElement;
    if (choice === "system") delete root.dataset.theme;
    else root.dataset.theme = choice;
    try {
      choice === "system"
        ? localStorage.removeItem(KEY)
        : localStorage.setItem(KEY, choice);
    } catch {
      /* private browsing — the theme still applies for this session */
    }
  }, [choice]);

  const next: Record<Choice, Choice> = { system: "light", light: "dark", dark: "system" };
  const label: Record<Choice, string> = {
    system: "Theo hệ thống",
    light: "Nền sáng",
    dark: "Nền tối",
  };
  const icon: Record<Choice, string> = { system: "◐", light: "☀", dark: "☾" };

  return (
    <button
      onClick={() => setChoice(next[choice])}
      title={`${label[choice]} — bấm để đổi`}
      aria-label={`Giao diện: ${label[choice]}. Bấm để đổi.`}
      className="rounded-[6px] border border-[var(--color-line)] bg-[var(--color-surface)] px-2.5 py-1.5 text-[13px] leading-none text-[var(--color-muted)] transition-colors duration-150 hover:border-[var(--color-faint)] hover:text-[var(--color-title)]"
    >
      <span aria-hidden className="text-[14px]">{icon[choice]}</span>
    </button>
  );
}
