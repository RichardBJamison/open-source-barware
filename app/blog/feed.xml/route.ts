import { NextResponse } from 'next/server';
import { blogPosts } from '@/lib/blog';

export const dynamic = 'force-static';

export async function GET() {
  const baseUrl = "https://opensourcebarware.com";
  const items = blogPosts.map(post => `
    <item>
      <title>${post.title}</title>
      <link>${baseUrl}/blog/${post.slug}</link>
      <description>${post.excerpt}</description>
      <pubDate>${new Date(post.date).toUTCString()}</pubDate>
      <guid>${baseUrl}/blog/${post.slug}</guid>
    </item>
  `).join('');

  const rss = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
<channel>
  <title>Open Source Barware Blog</title>
  <link>${baseUrl}/blog</link>
  <description>Operator notes on free bar inventory systems, variance, POS integration, and running a tight bar without subscriptions.</description>
  <language>en</language>
  ${items}
</channel>
</rss>`;

  return new NextResponse(rss, {
    headers: {
      'Content-Type': 'application/xml',
    },
  });
}
