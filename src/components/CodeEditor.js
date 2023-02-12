import { useState, useRef } from "react";
import "./CodeEditor.css";

function CodeEditor({ code, setCode }) {
  const [numberOfLines, setNumberOfLines] = useState(code.split("\n").length);
  const editorNumbers = useRef();
  const editorTextArea = useRef();

  const sync = () => {
    editorNumbers.current.scrollTop = editorTextArea.current.scrollTop;
  };

  return (
    <div className="editor">
      <textarea
        className="editor-numbers"
        ref={editorNumbers}
        cols="5"
        readOnly
        value={[...Array(numberOfLines).keys()]
          .map((number) => number + 1)
          .join("\n")}
        onScroll={sync}
      ></textarea>
      <textarea
        className="editor-textarea"
        ref={editorTextArea}
        cols="50"
        rows="20"
        value={code}
        onInput={(e) => {
          setCode(e.target.value);
          setNumberOfLines(e.target.value.split("\n").length);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && e.target.value.split("\n").length === 999) {
            e.preventDefault();
          } else if (e.key === "Tab") {
            setCode(
              code.substring(0, editorTextArea.current.selectionStart) +
                "\t" +
                code.substring(editorTextArea.current.selectionEnd)
            );
            e.preventDefault();
          }
        }}
        onScroll={sync}
      ></textarea>
    </div>
  );
}

export default CodeEditor;
