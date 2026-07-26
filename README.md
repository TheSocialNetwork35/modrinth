# Modrinth Project Feedback

A focused feedback page for six Modrinth projects by
[TheSocialNetwork35](https://modrinth.com/user/TheSocialNetwork35). Visitors can
report a problem, propose a feature, or suggest an improvement through one shared
Formspree-powered contact form.

## Projects and direct links

- `?project=fence-jump-plus`
- `?project=freecam`
- `?project=mini-spear`
- `?project=pvp-essentials`
- `?project=screenshot-to-clipboard`
- `?project=smaller-tools`

The site is plain HTML, CSS, and JavaScript with no build step. Open `index.html`
locally or serve the repository with any static file server.

## Cloudflare Pages

The repository is ready for Cloudflare Pages:

- Build command: leave empty
- Build output directory: `.`
- Root directory: `/`

`_headers` adds security headers, allows the Formspree connection through the
Content Security Policy, and caches the project images at Cloudflare's edge.
