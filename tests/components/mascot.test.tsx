import { render, screen } from "@testing-library/react";
import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { Mascot } from "@/components/mascot/Mascot";

describe("Mascot", () => {
  it("renders the selected mascot image and message", () => {
    render(createElement(Mascot, { variant: "diagnose", message: "관상 데이터 보는 중" }));

    expect(screen.getByAltText("AI 관상가 고양이")).toHaveAttribute("src", expect.stringContaining("diagnose"));
    expect(screen.getByText("관상 데이터 보는 중")).toBeInTheDocument();
  });
});
