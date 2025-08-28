import { Editor } from "@toast-ui/react-editor";
import { createRef, memo, useEffect, useState } from "react";

type DocumentEditorProps = {
  inputValue: string;
  onChange: (update: string) => void;
};

const DocumentEditor = ({ inputValue, onChange }: DocumentEditorProps) => {
  const editorRef = createRef<Editor | null>();

  function useSystemTheme() {
    const [isDark, setIsDark] = useState(
      () => window.matchMedia("(prefers-color-scheme: dark)").matches
    );

    useEffect(() => {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handleChange = (e: MediaQueryListEvent) => setIsDark(e.matches);

      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }, []);

    return isDark;
  }

  const isDarkTheme = useSystemTheme();

  return (
    <Editor
      theme={isDarkTheme ? "dark" : "light"}
      initialValue={inputValue}
      previewStyle="vertical"
      height="55vh"
      initialEditType="wysiwyg"
      useCommandShortcut={true}
      ref={editorRef}
      onChange={() => {
        const content = editorRef.current?.getInstance().getMarkdown() || "";
        onChange(content);
      }}
    />
  );
};

export default memo(DocumentEditor);
