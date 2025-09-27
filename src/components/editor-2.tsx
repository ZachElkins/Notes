import { useState, useRef, useLayoutEffect } from "react";
import { micromark } from "micromark";

function saveSelection(container: HTMLElement) {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;

  const range = sel.getRangeAt(0);
  const preCaretRange = range.cloneRange();
  preCaretRange.selectNodeContents(container);
  preCaretRange.setEnd(range.endContainer, range.endOffset);
  const end = preCaretRange.toString().length;

  const preStartRange = range.cloneRange();
  preStartRange.selectNodeContents(container);
  preStartRange.setEnd(range.startContainer, range.startOffset);
  const start = preStartRange.toString().length;

  return { start, end };
}

function restoreSelection(container: HTMLElement, saved: { start: number; end: number } | null) {
  if (!saved) return;
  const range = document.createRange();
  const sel = window.getSelection();
  if (!sel) return;

  let charIndex = 0;
  const nodeStack: ChildNode[] = [container];
  let node: ChildNode | undefined;

  let foundStart = false;
  let stop = false;

  while (!stop && (node = nodeStack.pop())) {
    if (node.nodeType === Node.TEXT_NODE) {
      const textNode = node as Text;
      const nextCharIndex = charIndex + textNode.length;

      if (!foundStart && saved.start >= charIndex && saved.start <= nextCharIndex) {
        range.setStart(textNode, saved.start - charIndex);
        foundStart = true;
      }
      if (foundStart && saved.end >= charIndex && saved.end <= nextCharIndex) {
        range.setEnd(textNode, saved.end - charIndex);
        stop = true;
      }
      charIndex = nextCharIndex;
    } else {
      let i = node.childNodes.length;
      while (i--) nodeStack.push(node.childNodes[i]);
    }
  }

  sel.removeAllRanges();
  sel.addRange(range);
}

export default function Editor() {
  const [markdown, setMarkdown] = useState("Hello **world**\n# Heading 1\n`inline code`");
  const editorRef = useRef<HTMLDivElement>(null);
  const savedSelection = useRef<{ start: number; end: number } | null>(null);

  const handleInput = () => {
    if (editorRef.current) {
      savedSelection.current = saveSelection(editorRef.current);
      setMarkdown(editorRef.current.innerText);
    }
  };

  useLayoutEffect(() => {
    if (editorRef.current) {
      editorRef.current.innerHTML = micromark(markdown);
      restoreSelection(editorRef.current, savedSelection.current);
    }
  }, [markdown]);

  return (
    <div style={{ width: "100%", maxWidth: "600px", margin: "0 auto", padding: "1rem" }}>
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        style={{
          border: "1px solid #444",
          borderRadius: "8px",
          padding: "8px",
          fontFamily: "monospace",
          whiteSpace: "pre-wrap",
          background: "#111",
          color: "#eee",
          minHeight: "200px",
        }}
      />
      <div style={{ marginTop: "1rem", fontSize: "0.9rem", color: "#888" }}>
        Raw Markdown:
        <pre style={{ whiteSpace: "pre-wrap", background: "#222", padding: "0.5rem" }}>{markdown}</pre>
      </div>
    </div>
  );
}
