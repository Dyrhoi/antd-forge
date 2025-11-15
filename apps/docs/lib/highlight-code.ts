import { transformerNotationWordHighlight } from "@shikijs/transformers";
import { codeToHtml } from "shiki";

export async function highlightCode(code: string, language: string = "tsx") {
  const html = await codeToHtml(code, {
    lang: language,
    themes: {
      dark: "vesper",
      light: "github-light",
    },
    transformers: [transformerNotationWordHighlight()],
  });

  return html;
}
