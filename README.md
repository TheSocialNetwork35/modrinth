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

The catalog refreshes on page load and every 30 seconds while the page is
visible. Requests time out after 12 seconds. A public-data-only browser cache
(up to 24 hours old) and the HTML snapshot keep project selection usable when
Modrinth is unavailable. Failed icon requests use the local brand icon.
Form contents are never written to browser storage.

Each project shows its reported download count. The total is the sum of the
same API response and animates only when that reported total changes. Modrinth
does not document a public per-download event stream: polling is not a promise
of second-by-second source updates. The timestamp is the time of the last
successful fetch, not the time of the latest download. Cached or failed updates
are labeled accordingly, and rate-limit responses delay the next request.

The supplied React Bits TechText and Counter components live in `ui/`.
They are bundled locally with React and Motion. Reduced-motion users get a
static title and counter. The component license is included in the source and
published assets.

The Pages Content Security Policy permits API connections to
`api.modrinth.com` and images from `cdn.modrinth.com`.

## Project links

New links use stable Modrinth IDs: `/project/zHbMgWKx#feedback`.
Project paths also accept slugs, for example `/project/freecam`. New public
projects automatically get a working path and a matching form without a build.
These are paths on the existing domain, not separately provisioned subdomains.
Current Modrinth slugs and the original feedback links are also supported:

- `?project=fence-jump-plus`
- `?project=freecam`
- `?project=mini-spear`
- `?project=pvp-essentials`
- `?project=screenshot-to-clipboard`
- `?project=smaller-tools`

The form and catalog use plain HTML, CSS, and JavaScript; two React islands
enhance the title and total. Build and preview the deployable files with:

```sh
npm ci
npm run build
npm run preview
```

The preview runs at `http://127.0.0.1:8765` and applies the production CSP.
Set `PORT` to use a different port. Only `dist/` is published.

For browser testing, check the live catalog, an unavailable API, a new project,
a renamed project, old links, image failures, and mobile layout. Mock Formspree
responses when testing submission to avoid sending test feedback.

The browser regression checks can be run against an already opened preview:

```sh
playwright-cli run-code --filename tests/feedback.browser.js
playwright-cli run-code --filename tests/downloads.browser.js
```

These checks intercept Modrinth and Formspree requests, so no feedback is sent.

## Cloudflare Pages

The repository is ready for Cloudflare Pages:

- Build command: `npm run build`
- Build output directory: `dist`
- Root directory: `/`

`_headers` adds security headers, allows the Formspree connection through the
Content Security Policy, and caches the project images at Cloudflare's edge.
