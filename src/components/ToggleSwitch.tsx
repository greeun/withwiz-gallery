import { type JSX, type KeyboardEvent } from "react";
import { cn } from "../utils/cn";

export interface ToggleSwitchProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  /** aria-label 및 시각적 라벨로 모두 사용 (지정 시 옆에 텍스트 노출). */
  label?: string;
  /** size 클래스 — gallery.css 의 `.gallery-toggle--sm/--md/--lg`. 기본 "md". */
  size?: "sm" | "md" | "lg";
  className?: string;
}

/** 접근성 - 키보드 정책:
 *  - role="switch" + aria-checked
 *  - Space / Enter 키로 toggle
 *  - disabled 시 모든 인터랙션 차단 + aria-disabled
 *
 *  CSS:
 *  - `.gallery-toggle` 기본 컨테이너
 *  - `.gallery-toggle--checked` / `--disabled` modifier
 *  - `.gallery-toggle--sm/--md/--lg` size modifier
 *  - `.gallery-toggle__track` / `__thumb` element classes
 *  - `.gallery-toggle__label` element class (label 텍스트)
 */
export function ToggleSwitch(props: ToggleSwitchProps): JSX.Element {
  const { checked, onChange, disabled = false, label, size = "md", className } = props;

  const handleToggle = () => {
    if (disabled) return;
    onChange(!checked);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      onChange(!checked);
    }
  };

  return (
    <span className={cn("gallery-toggle", `gallery-toggle--${size}`, className)}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-disabled={disabled || undefined}
        aria-label={label}
        disabled={disabled}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        className={cn(
          "gallery-toggle__track",
          checked && "gallery-toggle--checked",
          disabled && "gallery-toggle--disabled",
        )}
      >
        <span className="gallery-toggle__thumb" aria-hidden="true" />
      </button>
      {label ? <span className="gallery-toggle__label">{label}</span> : null}
    </span>
  );
}
