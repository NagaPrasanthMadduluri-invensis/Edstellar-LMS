"use client";

import { cn } from "@/lib/utils";

/**
 * Turns the URLs inside a plain-text string into clickable links, leaving the
 * rest of the text (and its newlines) untouched. Safe by construction: it never
 * uses dangerouslySetInnerHTML, so the body is rendered as React text nodes and
 * only genuine URLs become anchors.
 *
 * Put it INSIDE the element that carries `whitespace-pre-wrap` so line breaks in
 * the message are preserved; it returns text slices and <a> elements, not a
 * block of its own.
 *
 *   <Text as="span" className="whitespace-pre-wrap break-words">
 *     <Linkify>{message.body}</Linkify>
 *   </Text>
 *
 * `className` is added to each link. With no colour in it the link inherits the
 * surrounding text colour (right for a coloured chat bubble); pass
 * `text-accent-blue` where the surface is light.
 */
// http(s):// or a bare www. URL; stops before trailing punctuation so a link at
// the end of a sentence does not swallow the full stop or a closing bracket.
const URL_RE = /((?:https?:\/\/|www\.)[^\s<]+[^\s<.,:;!?)\]}'"])/gi;

export function Linkify({ children, className }) {
  const text = typeof children === "string" ? children : "";
  if (!text) return children ?? null;

  const parts = [];
  let last = 0;
  let match;
  URL_RE.lastIndex = 0;

  while ((match = URL_RE.exec(text)) !== null) {
    const url = match[0];
    const start = match.index;
    if (start > last) parts.push(text.slice(last, start));
    const href = url.startsWith("http") ? url : `https://${url}`;
    parts.push(
      <a
        key={start}
        href={href}
        target="_blank"
        rel="noopener noreferrer nofollow"
        className={cn(
          "break-all underline underline-offset-2 hover:opacity-80",
          className,
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {url}
      </a>,
    );
    last = start + url.length;
  }

  if (last < text.length) parts.push(text.slice(last));
  return parts;
}
