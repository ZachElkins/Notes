import { useState, useRef, useLayoutEffect, useCallback } from "react";
import { micromark } from "micromark";

type Section = {
    raw: string;
};

// Split markdown into blocks (handles code blocks and paragraphs/headers)
function splitSections(markdown: string): Section[] {
    const lines = markdown.split("\n");
    const sections: Section[] = [];
    let buffer: string[] = [];
    let inCode = false;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Detect start/end of code block
        if (line.trim().startsWith("```")) {
            buffer.push(line);
            if (inCode) {
                // End code block
                sections.push({ raw: buffer.join("\n") });
                buffer = [];
                inCode = false;
            } else {
                // Start code block
                if (buffer.length > 1) {
                    // Push previous non-code block
                    sections.push({ raw: buffer.slice(0, -1).join("\n") });
                    buffer = [line];
                }
                inCode = true;
            }
        } else if (inCode) {
            buffer.push(line);
        } else if (line.trim() === "") {
            if (buffer.length > 0) {
                sections.push({ raw: buffer.join("\n") });
                buffer = [];
            }
        } else {
            buffer.push(line);
        }
    }
    if (buffer.length > 0) {
        sections.push({ raw: buffer.join("\n") });
    }
    return sections;
}

function joinSections(sections: Section[]): string {
    return sections.map((s) => s.raw).join("\n\n");
}

// Caret helpers
function getCaretOffset(container: HTMLElement) {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return null;
    const range = selection.getRangeAt(0);
    const preCaretRange = range.cloneRange();
    preCaretRange.selectNodeContents(container);
    preCaretRange.setEnd(range.endContainer, range.endOffset);
    return preCaretRange.toString().length;
}

function setCaretOffset(container: HTMLElement, offset: number | null) {
    if (offset == null) return;
    let charIndex = 0;
    const nodeStack: ChildNode[] = [container];
    let node: ChildNode | undefined;
    let found = false;
    let range = document.createRange();

    while (!found && (node = nodeStack.pop())) {
        if (node.nodeType === Node.TEXT_NODE) {
            const textNode = node as Text;
            const nextCharIndex = charIndex + textNode.length;
            if (offset >= charIndex && offset <= nextCharIndex) {
                range.setStart(textNode, offset - charIndex);
                range.collapse(true);
                found = true;
                break;
            }
            charIndex = nextCharIndex;
        } else {
            let i = node.childNodes.length;
            while (i--) nodeStack.push(node.childNodes[i]);
        }
    }
    if (found) {
        const sel = window.getSelection();
        if (sel) {
            sel.removeAllRanges();
            sel.addRange(range);
        }
    }
}

export default function Editor() {
    const initialMarkdown = [
        "# Heading 1",
        "Paragraph text.",
        "```js",
        "console.log('code block');",
        "```",
        "Another paragraph.",
    ].join("\n");

    const [sections, setSections] = useState<Section[]>(splitSections(initialMarkdown));
    const editorRef = useRef<HTMLDivElement>(null);
    const [cursorPos, setCursorPos] = useState<number>(0);
    // const caretOffset = useRef<number | null>(null);

    // When user types, update sections from plain text
    const handleInput = useCallback(() => {
        if (editorRef.current) {
            const caretOffset = getCaretOffset(editorRef.current);
            console.log("We loggin this shit", caretOffset);
            const newMarkdown = editorRef.current.innerText;
            setSections(splitSections(newMarkdown));
            setCursorPos(caretOffset || 0);
        }
    }, [editorRef]);

    // Handle Enter key to insert a newline character
    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (e.key === "Enter") {
            e.preventDefault();
            // Insert a newline at the caret position
            const sel = window.getSelection();
            if (!sel || !sel.rangeCount) return;
            const range = sel.getRangeAt(0);
            range.deleteContents();
            const textNode = document.createTextNode("\n\n");
            range.insertNode(textNode);
            // Move caret after the newline
            range.setStartAfter(textNode);
            range.collapse(true);
            sel.removeAllRanges();
            sel.addRange(range);
            // Trigger input event to update state
            handleInput();
        }
    };

    // Render HTML for all sections, joined by <div style="margin-bottom:1em">
    const html = sections.map((s) => micromark(s.raw)).join('<div style="margin-bottom:1em"></div>');

    useLayoutEffect(() => {
        if (editorRef.current) {
            editorRef.current.innerHTML = html;
            setCaretOffset(editorRef.current, cursorPos);
        }
    }, [html, editorRef]);

    // For debugging: show raw markdown for each section
    return (
        <div style={{ width: "100%", maxWidth: "600px", margin: "0 auto", padding: "1rem" }}>
            <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                onInput={handleInput}
                onKeyDown={handleKeyDown}
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
                <b>Sections (raw):</b>
                <ol>
                    {sections.map((s, i) => (
                        <li key={i}>
                            <pre style={{ whiteSpace: "pre-wrap", background: "#222", padding: "0.5rem" }}>{s.raw}</pre>
                        </li>
                    ))}
                </ol>
            </div>
        </div>
    );
}
