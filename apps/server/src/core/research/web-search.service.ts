import { Injectable } from '@nestjs/common';

export type WebSearchResult = {
  title: string;
  url: string;
  snippet?: string;
};

const SEARCH_ENDPOINT = 'https://duckduckgo.com/html/';
const READ_ENDPOINT = 'https://r.jina.ai/http://';

@Injectable()
export class WebSearchService {
  async search(query: string, limit = 5): Promise<WebSearchResult[]> {
    const response = await fetch(
      `${SEARCH_ENDPOINT}?q=${encodeURIComponent(query)}`,
      {
        headers: {
          'User-Agent': 'raven-docs',
        },
      },
    );
    if (!response.ok) {
      throw new Error(`Search failed: ${response.status}`);
    }
    const html = await response.text();
    const results: WebSearchResult[] = [];
    const regex =
      /class="result__a" href="([^"]+)"[^>]*>([^<]+)<\/a>[\s\S]*?class="result__snippet"[^>]*>([^<]+)?/g;
    let match: RegExpExecArray | null = regex.exec(html);
    while (match && results.length < limit) {
      const url = match[1];
      const title = match[2]?.replace(/&amp;/g, '&') || url;
      const snippet = match[3]?.replace(/&amp;/g, '&');
      results.push({ title, url, snippet });
      match = regex.exec(html);
    }
    return results;
  }

  async fetchReadable(url: string, maxChars = 6000): Promise<string> {
    const response = await fetch(`${READ_ENDPOINT}${url}`, {
      headers: {
        'User-Agent': 'raven-docs',
      },
    });
    if (!response.ok) {
      throw new Error(`Fetch failed: ${response.status}`);
    }
    const text = await response.text();
    return text.length > maxChars ? text.slice(0, maxChars) : text;
  }
}
