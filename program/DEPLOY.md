# The Open Source Bar Program — Live Demo

**Production URL:** https://open-source-bar-program.vercel.app

Share this link with anyone who needs to walk through setup (Agave & Rye field demo).

## Redeploy (after code changes)

```bash
cd "/Users/richardjamison/Documents/New project/open-source-barware/program"
vercel deploy --prod --yes
```

## Local dev

```bash
/usr/bin/python3 server.py
open http://localhost:5052/
```

## Notes

- Hosted on Vercel under `ovlp-s-projects/open-source-bar-program`.
- Demo data lives in `/tmp` on Vercel (ephemeral — may reset after idle/cold start).
- Docker + `render.yaml` included for alternate hosting if you move off serverless.