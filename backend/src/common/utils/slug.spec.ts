import { htmlToText, readingMinutes, slugify, truncateWords } from './slug';

describe('slug utils', () => {
  it('builds clean slugs', () => {
    expect(slugify('Dil ki Sehat: 5 Aadatein!')).toBe('dil-ki-sehat-5-aadatein');
    expect(slugify('  Café — Résumé  ')).toBe('cafe-resume');
    expect(slugify("Don't Ignore Chest Pain")).toBe('dont-ignore-chest-pain');
    expect(slugify('ذیابیطس کیا ہے؟')).toBe('ذیابیطس-کیا-ہے');
    expect(slugify('!!!')).toBe('post');
  });
  it('extracts text and reading time', () => {
    expect(htmlToText('<h2>Hi</h2><p>A &amp; B<script>x()</script></p>')).toBe('Hi A & B');
    expect(readingMinutes('word '.repeat(450))).toBe(2);
    expect(truncateWords('one two three four five', 12)).toBe('one two…');
  });
});
