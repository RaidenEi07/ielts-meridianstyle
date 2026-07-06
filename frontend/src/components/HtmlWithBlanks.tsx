"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface Slot {
  node: HTMLElement;
  key: string;
  index: number;
}

/**
 * Render rich-text HTML (from RichTextEditor) that contains inline blank
 * markers (e.g. CLOZE's `{1}`, note-completion's `___`), replacing each
 * marker with an interactive control via a portal — so formatting (bold,
 * lists, headings…) survives around the blanks instead of showing raw tags.
 *
 * The container's contents are set imperatively (not via
 * `dangerouslySetInnerHTML`) so React never re-applies/resets them on
 * unrelated re-renders — that reset would silently orphan the portaled
 * blank controls, since it doesn't change `html` and so wouldn't re-trigger
 * this effect.
 */
export function HtmlWithBlanks({
  html,
  markerPattern,
  renderBlank,
  className,
}: {
  html: string;
  markerPattern: RegExp;
  renderBlank: (key: string, index: number) => React.ReactNode;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [slots, setSlots] = useState<Slot[]>([]);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let index = 0;
    const pattern = new RegExp(
      markerPattern.source,
      markerPattern.flags.includes("g") ? markerPattern.flags : `${markerPattern.flags}g`,
    );
    const processedHtml = html.replace(pattern, (_match, capture) => {
      const key = capture ?? String(index);
      const span = `<span data-blank-slot="${index}" data-blank-key="${key}"></span>`;
      index += 1;
      return span;
    });

    const temp = document.createElement("div");
    temp.innerHTML = processedHtml;
    container.replaceChildren(...Array.from(temp.childNodes));

    const nodes = Array.from(container.querySelectorAll<HTMLElement>("[data-blank-slot]"));
    setSlots(
      nodes.map((node) => ({
        node,
        key: node.dataset.blankKey ?? "",
        index: Number(node.dataset.blankSlot),
      })),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [html]);

  return (
    <>
      <div ref={containerRef} className={className} />
      {slots.map((s) => createPortal(renderBlank(s.key, s.index), s.node, String(s.index)))}
    </>
  );
}
