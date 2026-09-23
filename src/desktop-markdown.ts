import MarkdownIt from "markdown-it";
import { escapeHtml } from "./html";
const markdown = new MarkdownIt({ html: false, linkify: true });
markdown.renderer.rules.image = (tokens, index) => '<span>[图片：' + escapeHtml(tokens[index].content) + ']</span>';
export const renderMarkdown = (body: string) => markdown.render(body);
