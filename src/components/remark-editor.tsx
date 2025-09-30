import {useCallback, useEffect, useLayoutEffect, useRef, useState} from "react";
import remarkParse from 'remark-parse'
import { unified } from 'unified'
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";
import rehypeParse from 'rehype-parse';
import rehypeRemark from 'rehype-remark';
import remarkStringify from 'remark-stringify';
import {Node, Parent, Literal, Root, Heading, Link} from "mdast";

function getTextPosition(container: HTMLElement) {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return null;
    const range = selection.getRangeAt(0);
    const preCaretRange = range.cloneRange();
    preCaretRange.selectNodeContents(container);
    preCaretRange.setEnd(range.endContainer, range.endOffset);
    return preCaretRange.toString().length;
}

// const traverseTheBetterWay = (node: Node | Parent) => {
//     const stack: Array<Node | Parent> = [node]
//     const visited: Array<Node | Parent> = [];
//     while (stack) {
//         const current = stack.pop()
//         if (!current) continue
//         for (const child of current?.data?.hChildren) {
//             if (visited.includes(child)) continue
//             visited.push(child)
//             stack.push(child)
//         }
//     }
// }


const RemarkEditor = () => {
    const htmlToMarkdownProcessor = unified()
        .use(remarkParse)
        .use(remarkRehype, {allowDangerousHtml: true})
        .use(rehypeStringify)

    const markdownToHtmlProcessor = unified()
        .use(rehypeParse)
        .use(rehypeRemark)
        .use(remarkStringify)

    const [cursorPos, setCursorPos] = useState<number>(0)
    const [content, setContent] = useState<string>('')

    const convertContent = useCallback(() => {
        return content
    }, [content])

    const editorRef = useRef<HTMLDivElement>(null)

    const getCursorPosition = useCallback((tree: Root): number => {
        const current = editorRef?.current
        const textPosition = getTextPosition(current!)
        if (!current || textPosition !== null) return 0
        let mdPosition = 0

        const traverse = (node: Node | Parent | Literal) => {
            // Before children
            let startOffset = 0;
            if (node.type !== 'text') {
                const nodeNode = node as Node
                switch (nodeNode.type) {
                    case 'heading':
                        startOffset += (nodeNode as Heading).depth + 1
                        break;
                    case 'strong':
                    case 'strikethrough':
                        startOffset += 2
                        break;
                    case 'em':
                        startOffset += 1
                        break;
                    case 'url':
                        startOffset += (nodeNode as Link).url.length + 4;
                        break;
                    case 'thematicBreak':
                        startOffset += 3
                        break;
                }
            }

            // # asd **ds|a** _pee_
            // [text](url)
            // before = 1
            // first = 4
            // between = 2
            // second = 3
            // after = 1

            mdPosition += startOffset
            let midOffset = 0

            // First children
            if ((node as Literal).value) {
                midOffset = (node as Literal).value.length
            } else if ((node as Parent).children) {
                midOffset = (node as Parent).children.map(traverse).reduce((a, b) => a + b, 0)
            }
            // Between

            // Second children

            // After children


            if (mdPosition > textPosition) {
                setContent()
                return 0
            }

            return startOffset + midOffset;
        }

        tree.children.map(traverse)
    }, [editorRef])

    const findNodeAtPosition = (tree: Root, position: number): Node | null => {
        if (tree) {
            return
        }
    }

    useLayoutEffect(() => {
        htmlToMarkdownProcessor.process(content).then(result => {
            const current = editorRef?.current
            if (current) {
                current.innerHTML = String(result)
            }
        })
    }, [content, htmlToMarkdownProcessor])

    const handleInput = useCallback(() => {
        if (!editorRef.current) return
        const parseTree = markdownToHtmlProcessor.parse(editorRef.current.innerHTML);
        const tree = markdownToHtmlProcessor.runSync(parseTree);
        console.log("Tree: ", tree)
        const node = findNodeAtPosition(tree, getCursorPosition(tree))

    }, [markdownToHtmlProcessor]);

    useEffect(() => {
        console.log("Show me your balls: ", content)
    }, [content]);

    return (
        <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            style={{backgroundColor: '#555', height: '100%', color: '#fff'}}
            onInput={handleInput}
        >
        </div>
    )
}

export default RemarkEditor