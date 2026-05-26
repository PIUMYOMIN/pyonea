# TODO

## CategoryBrowser i18n key alignment
- [x] Check `CategoryBrowser.jsx` uses: `categories.fetch_error`, `try_again`, `browse_categories`, `discover_products`, `search_placeholder`, `showing_categories`, `no_categories_found`, `no_matching_categories`, `no_categories_available`, `clear_search`, plus SEO: `categories.title`, `categories.subtitle`.
- [x] Verify `src/locales/my.json` currently has only `seo.categories.title/description` (no `categories.*` keys besides maybe title/description), so UI keys are missing.
- [x] Update `CategoryBrowser.jsx` search/header/SEO usage to reference existing keys where possible.

## Remaining (required for full language translation)
- [ ] Add missing `categories.*` keys into `src/locales/my.json` with proper Burmese strings so the UI updates when language switches to `my`.
- [ ] (Optional) Ensure `src/locales/en.json` has same `categories.*` structure for consistent i18n.

