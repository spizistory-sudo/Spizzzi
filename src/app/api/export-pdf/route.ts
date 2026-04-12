import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  Document,
  Page,
  Text,
  Image,
  View,
  StyleSheet,
  renderToBuffer,
} from '@react-pdf/renderer';
import React from 'react';

// @react-pdf/renderer uses yoga layout — position 'absolute' works
// but we need explicit dimensions on the page container
const styles = StyleSheet.create({
  // Story pages: illustration background with text overlay
  storyPage: {
    position: 'relative',
    width: '100%',
    height: '100%',
  },
  bgImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    objectFit: 'cover',
    objectPosition: 'center',
  },
  // Gradient-like overlay bar at the bottom
  textBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    paddingTop: 24,
    paddingBottom: 24,
    paddingLeft: 36,
    paddingRight: 36,
  },
  storyText: {
    color: '#ffffff',
    fontSize: 14,
    lineHeight: 1.7,
    textAlign: 'center',
  },
  pageNum: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 9,
    textAlign: 'center',
    marginTop: 8,
  },
  // Fallback page (no illustration)
  fallbackPage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f5f0eb',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 60,
  },
  fallbackText: {
    color: '#333333',
    fontSize: 16,
    lineHeight: 1.8,
    textAlign: 'center',
  },
  fallbackPageNum: {
    color: '#999999',
    fontSize: 10,
    marginTop: 20,
  },
  // Cover page
  coverPage: {
    position: 'relative',
    width: '100%',
    height: '100%',
    backgroundColor: '#1a1a2e',
  },
  coverBgImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    objectFit: 'cover',
    opacity: 0.85,
  },
  coverOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    paddingTop: 30,
    paddingBottom: 30,
    paddingLeft: 40,
    paddingRight: 40,
  },
  coverTitle: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  coverSubtitle: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
  },
  // Cover without image
  coverNoImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#1a1a2e',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 60,
  },
  coverNoImageTitle: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  coverNoImageSubtitle: {
    color: '#cccccc',
    fontSize: 14,
    marginTop: 10,
    textAlign: 'center',
  },
  // Branding page
  brandingPage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#1a1a2e',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandingText: {
    color: '#9b87f5',
    fontSize: 18,
  },
  brandingSubtext: {
    color: '#888888',
    fontSize: 12,
    marginTop: 8,
  },
});

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { bookId } = await req.json();

    const { data: book } = await supabase
      .from('books')
      .select('*, pages(*), cover_options(*)')
      .eq('id', bookId)
      .eq('user_id', user.id)
      .single();

    if (!book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }

    const selectedCover = (
      book.cover_options as Array<{ is_selected: boolean; image_url: string }>
    )?.find((c) => c.is_selected);

    const pages = (
      (book.pages || []) as Array<{
        id: string;
        page_number: number;
        text_content: string;
        illustration_url: string | null;
      }>
    ).sort((a, b) => a.page_number - b.page_number);

    const pageSize = { width: 842, height: 595 }; // A4 landscape in points

    const children: React.ReactElement[] = [];

    // 1. Cover page
    if (selectedCover?.image_url) {
      children.push(
        React.createElement(
          Page,
          { key: 'cover', size: 'A4', orientation: 'landscape' },
          React.createElement(
            View,
            { style: styles.coverPage },
            React.createElement(Image, {
              src: selectedCover.image_url,
              style: styles.coverBgImage,
            }),
            React.createElement(
              View,
              { style: styles.coverOverlay },
              React.createElement(Text, { style: styles.coverTitle }, book.title),
              React.createElement(
                Text,
                { style: styles.coverSubtitle },
                `A story for ${book.child_name}`
              )
            )
          )
        )
      );
    } else {
      children.push(
        React.createElement(
          Page,
          { key: 'cover', size: 'A4', orientation: 'landscape' },
          React.createElement(
            View,
            { style: styles.coverNoImage },
            React.createElement(
              Text,
              { style: styles.coverNoImageTitle },
              book.title
            ),
            React.createElement(
              Text,
              { style: styles.coverNoImageSubtitle },
              `A story for ${book.child_name}`
            )
          )
        )
      );
    }

    // 2. Story pages — each is ONE page with illustration bg + text overlay
    for (const page of pages) {
      if (page.illustration_url) {
        // Page with illustration background + text bar at bottom
        children.push(
          React.createElement(
            Page,
            { key: page.id, size: 'A4', orientation: 'landscape' },
            React.createElement(
              View,
              { style: styles.storyPage },
              React.createElement(Image, {
                src: page.illustration_url,
                style: styles.bgImage,
              }),
              React.createElement(
                View,
                { style: styles.textBar },
                React.createElement(
                  Text,
                  { style: styles.storyText },
                  page.text_content
                ),
                React.createElement(
                  Text,
                  { style: styles.pageNum },
                  `${page.page_number}`
                )
              )
            )
          )
        );
      } else {
        // Fallback: text-only page with warm background
        children.push(
          React.createElement(
            Page,
            { key: page.id, size: 'A4', orientation: 'landscape' },
            React.createElement(
              View,
              { style: styles.fallbackPage },
              React.createElement(
                Text,
                { style: styles.fallbackText },
                page.text_content
              ),
              React.createElement(
                Text,
                { style: styles.fallbackPageNum },
                `${page.page_number}`
              )
            )
          )
        );
      }
    }

    // 3. Back page
    children.push(
      React.createElement(
        Page,
        { key: 'back', size: 'A4', orientation: 'landscape' },
        React.createElement(
          View,
          { style: styles.brandingPage },
          React.createElement(
            Text,
            { style: styles.brandingText },
            'Made with StoryMagic'
          ),
          React.createElement(
            Text,
            { style: styles.brandingSubtext },
            'storymagic.app'
          )
        )
      )
    );

    const BookPDF = React.createElement(Document, null, ...children);
    const pdfBuffer = await renderToBuffer(BookPDF);

    const safeTitle = book.title.replace(/[^a-zA-Z0-9 ]/g, '');
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${safeTitle}.pdf"`,
      },
    });
  } catch (err) {
    console.error('[export-pdf] Error:', err);
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}
