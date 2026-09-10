# Veterinary Society — NLCS Jeju

The society's page: **https://mompel226.github.io/veterinary-society/**
It is also a door in the [Biology Hub](https://mompel226.github.io/biology-hub/#societies), under Societies.

## Changing the page

Everything is in **one file, `index.html`**. Open it on GitHub, press the pencil, change the
words, and press *Commit changes*. The site updates itself within a minute or two.

The file is in the same order as the page. Look for the comments that begin `<!-- EDIT`:

| You want to… | Do this |
|---|---|
| Change the description, or who the chair is | The `<header class="head">` block near the top. |
| Add something the society does | Copy one whole `<li class="card">…</li>` inside the *What we do* list, paste it at the end of the list, and change the words. Write to the person reading: *"Here you…"*. |
| Move an idea into *What we do* | Cut its `<li>` from the *Ideas* list, paste it into the first list, and delete the `<span class="tag">idea</span>`. |
| Add issue 2 of the magazine | Put the PDF in `assets/`, make a cover picture (below), then copy the whole `<section class="mag">…</section>` and change the words, the names and the file names. |
| Change the join address | The `<div class="join">` block near the bottom. |

**A cover picture** from a PDF, if you have a Mac: open the PDF in Preview, *File ▸ Export…*,
choose JPEG, and save it as `assets/cover-600.jpg`. Any picture 600 px wide will do; the page
sizes it. (The existing covers also have a `.webp` twin and a 1200 px version, which are nice
to have and not needed.)

**To see your change before it is live**, download `index.html` and the `assets` folder and
open the file in a browser.

## The mark

The horse-and-stethoscope mark is drawn by the page itself, not a picture: it is the `<svg>`
inside `<div class="banner">`, and it draws itself when the page opens. Its numbers were made
by `tools/mark.py`; leave the `<svg>` alone unless you are changing the mark on purpose.
`?still=1` on the address shows it finished, without the drawing.

## Credits

*Island Immunity*, issue 1: written by Jieun Kim, Minjae Kang, Chunghyun (Sola) Lee and
Hyun Seo (Rachel) Noh; edited by Jieun Kim and Minjae Kang. The society's board for the issue:
Jieun Kim (chair), Minjae Kang (publicity officer), Henry Yuan (secretary). The writers hold the
rights to their work.

The page and the mark were made by Dr Daniel Mompel Riera, Biology, NLCS Jeju, for the society.
