<div align="center">

<img src="assets/mark.svg" alt="The Veterinary Society mark: a horse’s head drawn in one line, with a pig, a hen and a cow beside the name" width="100%">

<br>

# Veterinary Society

**NLCS Jeju · a society run by students who want to know what a vet knows.**

[![Open the site](https://img.shields.io/badge/▶_Open_the_site-F5A623?style=for-the-badge&logoColor=1B1206&color=F5A623)](https://mompel226.github.io/veterinary-society/)

![Clinical cases](https://img.shields.io/badge/clinical-cases-2A8C7A?style=flat-square)
![Suturing](https://img.shields.io/badge/hands--on-suturing_·_taking_blood-D0554B?style=flat-square)
![Behaviour](https://img.shields.io/badge/animal-behaviour-5FA5FF?style=flat-square)
![Ideas](https://img.shields.io/badge/ideas-vote_for_this_year's-F5A623?style=flat-square)
![Island Immunity](https://img.shields.io/badge/Island_Immunity-issue_1-7CC46B?style=flat-square)
![Chair](https://img.shields.io/badge/chair-Henry_Yuan-9DB7AE?style=flat-square)

</div>

![The society’s page: the mark beside the name, what we do, ideas to vote on, and the magazine](docs/screen.jpg)

---

Clinical cases worked the way a vet would work them. Suturing on a practice pad. Taking blood
from a silicone mould with a vein in it. How animals behave, and how a dog learns. Then writing
it up: **[Island Immunity](https://mompel226.github.io/veterinary-society/assets/Island-Immunity-1.pdf)**,
issue 1, four Jeju farm animals and the diseases that threaten them, written and edited by
the society.

On the page, a student signs in with the school Google account, puts their name down, and votes
for the ideas they want the society to take on this year. The page also shows **when the next
meeting is**, what it will be, and **who came to the ones before** — first names and year groups
only. Addresses and full names stay in the society's own sheet, with the chair.

**Want to join, or write for issue 2?** Email the chair, Henry Yuan: scyuan29@pupils.nlcsjeju.kr

<details>
<summary><b>How the meetings, the register and the Classroom post work</b> — for the chair</summary>

<br>

Everything the page shows about members and meetings lives in one Google Sheet, the society's
own. It has nothing to do with the school's marks. The chair keeps the sheet; the website reads
it. Nothing is typed into the website itself.

**The sheet has four tabs.** The one that matters is **Register**:

| A | B | C | D | E | F | G | H | I, J, K … |
|---|---|---|---|---|---|---|---|---|
| Korean name | English name | Surname | **Preferred name** | Email | Year | Joined | Would like to do | **one column per meeting** |

Row 1 of a meeting column holds **the date of that meeting** (with a time if there is one).
Row 2 holds **what the meeting is**: *Suturing on practice pads · B12*. Members start on row 3.

**To add a meeting:** menu **Veterinary Society ▸ Add the next meeting**, type the date and
what you will do. A new column appears with a tick box on every member's row. Within a minute
the website says *Next meeting — Thursday 17 September, 15:40*, and what it is.

**After the meeting:** tick the box for everyone who came. The website shows the ticks.

**To tell the class:** in the **Settings** tab, tick **Post the next meeting to Google
Classroom**. An announcement is posted, and the box unticks itself, ready for next time.
(Menu ▸ *Preview the Classroom announcement* shows you what it will say, first.)

**To start the register from a list you already have** — a CCA sign-up sheet, last year's
members, a list the school gave you. Put it in these columns, in this order, and paste it into
the *Register* tab from row 3 down:

| A | B | C | D | E | F | G | H |
|---|---|---|---|---|---|---|---|
| Korean name | English name | Surname | **Preferred name** | **Email** | Year | Joined | Would like to do |
| Gildong | John | Hong | John | ghong31 | Y9 | | |

Two things make this easy. The **Email** column takes *just the first part* —
`ghong31` — because the school's addresses are that plus `@pupils.nlcsjeju.kr`; write the whole
address if you prefer, both work, and a student signing in is matched either way. The
**Preferred name** is the only name the website ever shows, so it is the one to get right: put
what you would call out in a room. Leave *Joined* and *Would like to do* empty — a student
signing in fills their own in.

The **Year** column is a dropdown, Y7 to Y13 — pick, don't type, and nothing arrives as
`year 7 ` with a stray space.

**Bringing a list in from a file.** Save your list as a CSV with those eight columns in that
order and **no heading row**, then, on the *Register* tab:

> **File ▸ Import ▸ Upload**, choose the file, and set **Import location** to
> **Append to current sheet**. Leave *Convert text to numbers and dates* **off**, so `Y7` and an
> address are left exactly as you wrote them.

Appending drops the rows in under the two heading rows, where members belong. Then run menu ▸
**Tidy the sheet up**: an import brings its own fonts and colours with it, and that puts the
society's look back without touching a single thing you wrote.

(If you would rather import *before* running **setup**, keep the heading row in the file and
choose **Replace current sheet** instead. `setup` leaves rows it finds alone.)

Extra columns of your own may sit to the right of the meetings; the script ignores them.

🔒 **What the website is shown, and what it is never shown.** The page is sent **preferred
names, year groups and ticks** — nothing else. Email addresses, surnames and Korean names stay
in the sheet: they are school information and they never leave it. That rule is checked by a
test (`node tools/gastest.js`) every time the script is changed.

</details>

<details>
<summary><b>Switching it on</b> — one afternoon, once, by the teacher</summary>

<br>

**1 · Make the sheet.** A new Google Sheet named *Veterinary Society*, made by the **teacher**,
not a student — a student's account is closed when they leave and the sheet goes with it. Share
it with the chair as an **Editor**.

**2 · Paste the script.** In the sheet: **Extensions ▸ Apps Script**. Delete what is there and
paste the whole of [`apps-script/Code.gs`](apps-script/Code.gs). Save.

**3 · Add the Classroom service.** In the script editor, beside **Services**, press **+**,
choose **Google Classroom API**, Add. (The manifest this project expects is
[`apps-script/appsscript.json`](apps-script/appsscript.json), if you would rather paste it:
Project Settings ▸ *Show appsscript.json*.)

**4 · Run ▸ setup**, once, and allow the permissions it asks for. Four tabs appear — *Register*,
*Votes*, *Settings*, *Log* — built and dressed: dark headings in the society's own colours, the
four name columns frozen so they stay in view while you tick, a **Y7–Y13 dropdown** in the Year
column, dates that read as dates, room for a year of meetings, and a rule that turns a ticked
box green so a row of green is a row of people who came. Menu ▸ **Tidy the sheet up** puts that
look back any time — after a paste, say. It never changes what is written.

**5 · Fill in Settings.**

| | |
|---|---|
| **Google Client ID** | the one the Biology labs use — Dr Mompel has it. The site's address is already an authorised origin, so sign-in works here as it does there. |
| **Classroom course ID** | menu ▸ *Find my Classroom course ID* lists your classes and their IDs. It is **not** the number in the Classroom web address. |

**6 · Deploy ▸ New deployment ▸ Web app.** Execute as **Me**, who has access **Anyone**.
Deploy, and copy the address that ends in `/exec`.

**7 · Paste that address** into [`config.js`](config.js) after `scriptUrl`, and commit. Within
a minute or two the page shows the sign-in button, the register and the votes.

**8 · Install the triggers.** Menu ▸ *Install the triggers*. Do this **in the teacher's own
account**: an installed trigger runs as whoever installed it, and only a teacher of the class
may post an announcement. That is what lets the chair tick one box in the sheet and have the
announcement go out properly.

**If the sheet ever has to move** to another account: open a copy there and do steps 2 to 8
again, then paste the new `/exec` address into `config.js`. Nothing else changes.

</details>

<details>
<summary><b>What is in this repository</b></summary>

<br>

| | |
|---|---|
| `index.html` | the page, all of it |
| `config.js` | the two addresses the page needs: the Google Client ID and the script’s `/exec` address |
| `apps-script/Code.gs` | the script that keeps the register, the meetings and the votes, and posts to Classroom |
| `apps-script/appsscript.json` | the services and permissions that script needs |
| `tools/gastest.js` | proves the script keeps its rules — `node tools/gastest.js` |
| `assets/` | the magazine, its cover, the pictures behind the cards, and the mark |
| `tools/mark.py` | the numbers the mark is drawn from |

The mark is a horse’s head drawn in one line, from the poll round the muzzle and up the cheek to
the eye, with a forelock and mane. The pig, the hen and the cow are the magazine’s other animals.

</details>

<br>

<sub>Made by Dr Daniel Mompel Riera, Biology, NLCS Jeju, for the society. The page is the society’s to change. *Island Immunity* is the work of its writers, who hold the rights to it. The pictures behind the cards are public domain or Creative Commons and are credited on the page itself.</sub>
