export interface LegalArticle {
  id: string;
  heading: string;
  content: string;
}

export interface ParsedLegalDoc {
  subtitle: string;
  articles: LegalArticle[];
  footer: string;
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&rdquo;/g, '"')
    .replace(/&ldquo;/g, '"');
}

/**
 * Strips HTML tags and preserves readable paragraph structure with newlines.
 */
export function stripHtmlToText(html: string): string {
  if (!html) return "";
  let text = html
    .replace(/<br\s*[\/]?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/h[1-6]>/gi, "\n\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<\/li>/gi, "\n");

  text = text.replace(/<[^>]+>/g, "");
  text = decodeHtmlEntities(text);

  // Normalize excessive newlines
  return text
    .split("\n")
    .map((l) => l.trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Parses raw HTML or text of a legal document into structured articles, subtitle and footer.
 */
export function parseHtmlToArticles(html: string): ParsedLegalDoc {
  if (!html || !html.trim()) {
    return {
      subtitle: "",
      articles: [
        {
          id: "art-1",
          heading: "Article 1 – Parties",
          content: "",
        },
      ],
      footer: "",
    };
  }

  // If this is plain text without any HTML tags
  if (!/<[a-z][\s\S]*>/i.test(html)) {
    return parsePlainText(html);
  }

  try {
    let subtitle = "";
    let footer = "";
    const articles: LegalArticle[] = [];

    // Extract subtitle from header
    const headerMatch = html.match(/<div[^>]*class="[^"]*text-center[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
    if (headerMatch) {
      const headerContent = headerMatch[1];
      const pMatch = headerContent.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
      if (pMatch) {
        subtitle = stripHtmlToText(pMatch[1]);
      }
    }

    // Extract footer if present
    const footerMatch = html.match(/<section[^>]*border-t[^>]*>([\s\S]*?)<\/section>/i);
    if (footerMatch) {
      footer = stripHtmlToText(footerMatch[1]);
    }

    // Look for <section> blocks
    const sectionRegex = /<section\b[^>]*>([\s\S]*?)<\/section>/gi;
    let match;
    let count = 1;

    while ((match = sectionRegex.exec(html)) !== null) {
      const sectionHtml = match[1];

      // Skip the footer section if it was matched
      if (match[0].includes("border-t") && footer) {
        continue;
      }

      // Check for heading (h2, h3, h4)
      const headingMatch = sectionHtml.match(/<h[2-4][^>]*>([\s\S]*?)<\/h[2-4]>/i);
      let heading = "";
      let bodyHtml = sectionHtml;

      if (headingMatch) {
        heading = stripHtmlToText(headingMatch[1]);
        bodyHtml = sectionHtml.replace(headingMatch[0], "");
      } else {
        heading = `Article ${count}`;
      }

      const content = stripHtmlToText(bodyHtml);
      if (heading || content) {
        articles.push({
          id: `art-${count}`,
          heading: heading.trim(),
          content: content.trim(),
        });
        count++;
      }
    }

    // If no <section> elements matched, fallback to <h3> split
    if (articles.length === 0) {
      const parts = html.split(/<h[2-4][^>]*>/i);
      if (parts.length > 1) {
        for (let i = 1; i < parts.length; i++) {
          const subparts = parts[i].split(/<\/h[2-4]>/i);
          const heading = stripHtmlToText(subparts[0] || `Article ${i}`);
          const content = stripHtmlToText(subparts[1] || "");
          articles.push({
            id: `art-${i}`,
            heading,
            content,
          });
        }
      }
    }

    // Fallback if still empty
    if (articles.length === 0) {
      articles.push({
        id: "art-1",
        heading: "Document Content",
        content: stripHtmlToText(html),
      });
    }

    return { subtitle, articles, footer };
  } catch (err) {
    console.error("Error parsing legal HTML:", err);
    return {
      subtitle: "",
      articles: [{ id: "art-1", heading: "Document Content", content: stripHtmlToText(html) }],
      footer: "",
    };
  }
}

/**
 * Fallback parser for plain text contracts.
 */
function parsePlainText(text: string): ParsedLegalDoc {
  const lines = text.split("\n");
  const articles: LegalArticle[] = [];
  let currentHeading = "Article 1";
  let currentContentLines: string[] = [];
  let count = 1;

  const isHeadingLine = (l: string) =>
    /^(madde\s*\d+|article\s*\d+|bölüm\s*\d+|section\s*\d+)/i.test(l.trim());

  for (const line of lines) {
    if (isHeadingLine(line)) {
      if (currentContentLines.length > 0 || count > 1) {
        articles.push({
          id: `art-${count}`,
          heading: currentHeading,
          content: currentContentLines.join("\n").trim(),
        });
        count++;
        currentContentLines = [];
      }
      currentHeading = line.trim();
    } else {
      currentContentLines.push(line);
    }
  }

  if (currentHeading || currentContentLines.length > 0) {
    articles.push({
      id: `art-${count}`,
      heading: currentHeading,
      content: currentContentLines.join("\n").trim(),
    });
  }

  return {
    subtitle: "",
    articles: articles.length > 0 ? articles : [{ id: "art-1", heading: "Article 1", content: text.trim() }],
    footer: "",
  };
}

/**
 * Compiles visual articles, subtitle, and footer into clean, responsive HTML.
 */
export function compileArticlesToHtml({
  title,
  subtitle,
  articles,
  footer,
}: {
  title: string;
  subtitle?: string;
  articles: LegalArticle[];
  footer?: string;
}): string {
  const sanitizedTitle = (title || "").trim();
  const sanitizedSubtitle = (subtitle || "").trim();
  const sanitizedFooter = (footer || "").trim();

  const sectionsHtml = articles
    .map((a) => {
      const heading = (a.heading || "").trim();
      const content = (a.content || "").trim();

      // Split paragraphs by double newline or newline
      const paragraphs = content
        .split(/\n\s*\n/)
        .map((p) => p.trim())
        .filter(Boolean);

      const paragraphsHtml = paragraphs
        .map((p) => `    <p>${p.replace(/\n/g, "<br/>")}</p>`)
        .join("\n");

      return `  <section class="space-y-2">
    <h3 class="text-base font-semibold text-gray-900 dark:text-white">${heading}</h3>
${paragraphsHtml || "    <p></p>"}
  </section>`;
    })
    .join("\n\n");

  const headerHtml = `  <div class="text-center pb-4 border-b border-gray-200 dark:border-slate-700">
    <h2 class="text-xl font-bold uppercase tracking-wide">${sanitizedTitle}</h2>
    ${
      sanitizedSubtitle
        ? `<p class="text-xs text-gray-500 dark:text-slate-400 mt-1">${sanitizedSubtitle}</p>`
        : ""
    }
  </div>`;

  const footerHtml = sanitizedFooter
    ? `\n\n  <section class="pt-4 border-t border-gray-200 dark:border-slate-700">
    <p class="text-xs text-gray-500 dark:text-slate-400">${sanitizedFooter.replace(/\n/g, "<br/>")}</p>
  </section>`
    : "";

  return `<div class="space-y-6 text-sm text-gray-800 dark:text-slate-200">
${headerHtml}

${sectionsHtml}${footerHtml}
</div>`;
}
