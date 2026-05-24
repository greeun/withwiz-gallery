import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ToggleSwitch } from "../../src/components/ToggleSwitch";

describe("ToggleSwitch", () => {
  it("렌더 후 클릭 시 onChange(!checked) 호출", () => {
    const onChange = vi.fn();
    const { getByRole } = render(<ToggleSwitch checked={false} onChange={onChange} />);
    const sw = getByRole("switch");
    fireEvent.click(sw);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("checked=true 일 때 aria-checked='true' 반영, 클릭 시 false", () => {
    const onChange = vi.fn();
    const { getByRole } = render(<ToggleSwitch checked={true} onChange={onChange} />);
    const sw = getByRole("switch");
    expect(sw.getAttribute("aria-checked")).toBe("true");
    fireEvent.click(sw);
    expect(onChange).toHaveBeenCalledWith(false);
  });

  it("disabled 시 클릭이 onChange 호출하지 않음", () => {
    const onChange = vi.fn();
    const { getByRole } = render(
      <ToggleSwitch checked={false} onChange={onChange} disabled />,
    );
    const sw = getByRole("switch");
    fireEvent.click(sw);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("Space 키로 토글", () => {
    const onChange = vi.fn();
    const { getByRole } = render(<ToggleSwitch checked={false} onChange={onChange} />);
    const sw = getByRole("switch");
    fireEvent.keyDown(sw, { key: " " });
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("Enter 키로 토글", () => {
    const onChange = vi.fn();
    const { getByRole } = render(<ToggleSwitch checked={false} onChange={onChange} />);
    const sw = getByRole("switch");
    fireEvent.keyDown(sw, { key: "Enter" });
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("label 지정 시 aria-label 과 화면 라벨 모두 반영", () => {
    const { getByRole, getByText } = render(
      <ToggleSwitch checked={false} onChange={() => {}} label="Published" />,
    );
    const sw = getByRole("switch");
    expect(sw.getAttribute("aria-label")).toBe("Published");
    expect(getByText("Published")).toBeTruthy();
  });

  it("size prop 이 gallery-toggle--<size> 클래스로 반영", () => {
    const { container } = render(
      <ToggleSwitch checked={false} onChange={() => {}} size="lg" />,
    );
    const root = container.querySelector(".gallery-toggle");
    expect(root?.className).toMatch(/gallery-toggle--lg/);
  });

  it("checked=true 시 트랙에 gallery-toggle--checked modifier", () => {
    const { getByRole } = render(<ToggleSwitch checked={true} onChange={() => {}} />);
    const sw = getByRole("switch");
    expect(sw.className).toMatch(/gallery-toggle--checked/);
  });
});
