# Modrinth Project Feedback

A focused feedback page for public Modrinth projects by
[Yannis_](https://modrinth.com/user/Yannis_). Visitors can
report a problem, propose a feature, or suggest an improvement through one shared
Formspree-powered contact form.

## Live project catalog

The browser loads public projects from
`https://api.modrinth.com/v2/user/8Fjco3gC/projects`. The stable user ID belongs
to Yannis_. The catalog groups projects by type and sorts each group by name.
Titles and icons come from the API, including newly published projects.
No API token, scraping, Worker, or Pages Function is required.

The catalog refreshes on page load and every five minutes while the page is
visible. Requests time out after 12 seconds. A public-data-only browser cache
(up to 24 hours old) and the HTML snapshot keep project selection usable when
Modrinth is unavailable. Failed icon requests use the local brand icon.
Form contents are never written to browser storage.

The Pages Content Security Policy permits API connections to
`api.modrinth.com` and images from `cdn.modrinth.com`.

## Project links

New links use stable Modrinth IDs: `?project=zHbMgWKx#feedback`.
Current Modrinth slugs and the original feedback links are also supported:

- `?project=fence-jump-plus`
- `?project=freecam`
- `?project=mini-spear`
- `?project=pvp-essentials`
- `?project=screenshot-to-clipboard`
- `?project=smaller-tools`

The site is plain HTML, CSS, and JavaScript with no build step. Open `index.html`
locally or serve the repository with any static file server.

For browser testing, check the live catalog, an unavailable API, a new project,
a renamed project, old links, image failures, and mobile layout. Mock Formspree
responses when testing submission to avoid sending test feedback.

The browser regression checks can be run against an already opened preview:

```sh
playwright-cli run-code --filename tests/feedback.browser.js
```

These checks intercept Modrinth and Formspree requests, so no feedback is sent.

## Cloudflare Pages

The repository is ready for Cloudflare Pages:

- Build command: leave empty
- Build output directory: `.`
- Root directory: `/`

`_headers` adds security headers, allows the Formspree connection through the
Content Security Policy, and caches the project images at Cloudflare's edge.
