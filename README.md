# Open Source Barware

Open Source Barware is a free, open-source bar inventory project for hospitality teams. It includes the public Next.js site, browser-based inventory sandbox, downloadable spreadsheet/prompt assets, and the in-progress local Chrome-side program under `program/`.

## What is included

- `app/` and `components/` - the public Next.js App Router site.
- `lib/` - shared site and inventory-state helpers.
- `public/downloads/` - user-facing spreadsheet/prompt downloads plus GPL compliance files.
- `program/` - local Flask/Chrome program scaffold for the customer-side inventory app.
- `bar-app/` - legacy local inventory implementation.

## Development

```bash
npm install
npm run dev
```

Build and lint:

```bash
npm run lint
npm run build
```

## Download Compliance

Website downloads are distributed under the GNU General Public License version 3 or later. The downloadable package must include:

- `LICENSE.txt` - the GPLv3 license text.
- `README.md` - package contents and modification notice.
- `NOTICE.md` - copyright and warranty notice.
- `SOURCE-OFFER.md` - where to get the corresponding source.

Regenerate the public download package and source archive with:

```bash
npm run package:compliance
```

`npm run build` runs that packaging step automatically before the static export.

That command creates:

- `public/downloads/open-source-barware-download-package.zip`
- `public/downloads/open-source-barware-source.zip`

The source archive is built from tracked and non-ignored working-tree files and excludes generated archives, local environment files, runtime state, build output, `node_modules`, and private configuration.

## License

Copyright (C) 2026 Open Source Barware contributors.

Open Source Barware is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or any later version.

Open Source Barware is distributed without warranty. See `LICENSE` for the full license text.
