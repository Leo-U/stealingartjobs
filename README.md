# Stealing Art Jobs

A static, ad-free webcomic site prepared for GitHub Pages.

## Adding a comic

1. Put the comic image in `comics/`.
2. Add an entry to `comics.json` in publication order:

```json
{
  "slug": "short-title",
  "title": "Comic title",
  "date": "August 18, 2026",
  "image": "comics/file-name.jpg",
  "alt": "A concise description of the comic for screen-reader users."
}
```

The newest comic automatically appears on the home page. The archive and navigation update automatically.
