# Contributing to Open Source Barware

Thanks for helping make bar inventory less painful. This project is built by and
for hospitality people, and contributions of every size are welcome — code,
docs, spreadsheet templates, bug reports, or just telling us what broke on a
busy Friday night.

## Ways to contribute

- **Report a bug** — open an issue with the Bug Report template.
- **Request a feature** — open an issue with the Feature Request template.
- **Improve docs or spreadsheets** — small PRs are perfect.
- **Write code** — pick up an issue labeled `good first issue` or `help wanted`.

## Ground rules

- Be respectful. See our [Code of Conduct](CODE_OF_CONDUCT.md).
- Open an issue before large changes so we can agree on direction first.
- Keep pull requests focused — one logical change per PR.

## Development setup

```bash
git clone https://github.com/RichardBJamison/open-source-barware.git
cd open-source-barware
npm install
npm run dev
```

Before opening a PR:

```bash
npm run lint
npm run build
```

`npm run build` automatically regenerates the GPL compliance download packages
(`npm run package:compliance`). If you changed anything that ships inside those
downloads, commit the regenerated zips in `public/downloads/`.

## Pull request checklist

- [ ] `npm run lint` passes
- [ ] `npm run build` passes
- [ ] The change is described clearly in the PR body
- [ ] Docs updated if behavior changed
- [ ] You agree to license your contribution under GPL-3.0-or-later

## License and sign-off

Open Source Barware is licensed under **GPL-3.0-or-later**. By submitting a
contribution, you agree that your work is licensed under the same terms.

We use the [Developer Certificate of Origin](https://developercertificate.org/).
Sign your commits with `git commit -s`, which adds a `Signed-off-by` line
certifying you have the right to submit the code.

## Questions

Open a [Discussion](https://github.com/RichardBJamison/open-source-barware/discussions)
or email **richard@opensourcebarware.com**.
