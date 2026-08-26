# Stealing Art Jobs

A static, ad-free webcomic site prepared for GitHub Pages.

## Adding a comic

1. Put the comic image in `comics/`.
2. Add an entry to `comics.json` in publication order:

```json
{
  "slug": "short-title",
  "title": "Comic title",
  "date": "Uploaded August 18, 2026",
  "image": "/comics/file-name.png",
  "alt": "A concise description of the comic for screen-reader users.",
  "description": "A short, natural description for search results and link previews.",
  "transcript": ["First line of dialogue.", "Second line of dialogue."]
}
```

3. Run `python3 generate_comic_pages.py`.

The generator creates an individual, crawlable page for every comic and updates `sitemap.xml` and `robots.txt`. The newest comic appears on the home page, while in-site navigation remains instant and does not reload the page.
