# Self-Hosting Guide — Kouba Book Store

This guide moves your store from Qoder hosting to **your own server**, which
gives you a custom domain (like `www.koubabookstore.com`) and full ownership
of everything. No coding needed — every step is a command to copy and paste.

**What you'll end up with:** a virtual private server (VPS) running the store
and its database, with a domain name and a free automatic security
certificate (HTTPS). Expected cost: about **$5–6/month for the server** plus
**$10–15/year for the domain**.

**Good to know before you start:**
- Your store keeps working on Qoder the whole time. You only "move" when the
  new server is fully tested. Nothing breaks in the middle.
- Your orders and books travel with you (the export is already done — it's in
  the `db-dump/` folder on this computer).
- The admin password on the new server is the **same** as the one you use today.

---

## Optional — try it on this PC first (no server needed)

You don't have to buy anything to see the self-hosted store, including the
extra **cover upload** button. Open PowerShell in this project's folder and
run:

```powershell
npm run local-preview
```

Then open **http://localhost:8080** in your browser (dashboard:
`http://localhost:8080/admin/login.html` — same password as today). This
preview only exists on this computer, and orders/edits are forgotten when
you stop it with `Ctrl+C` — everything else behaves exactly like the real
server will.

---

## Step 0 — What to buy

1. **A server (VPS).** Any of these entry plans is plenty for a bookstore:
   - Hostinger KVM 1, OVH Starter, Contabo, Hetzner CX11, or DigitalOcean
     Basic — all around $4–6/month.
   - **Choose Ubuntu 24.04** as the operating system when ordering.
   - You'll receive an **IP address** (four numbers like `203.0.113.10`) and a
     root password by email.
2. **A domain name** (optional but usually the point of moving). Buy it from
   the same company or any registrar (Namecheap, GoDaddy, OVH…), roughly
   $10–15/year. `.com` is easiest; `.dz` requires a local registrar.

---

## Step 1 — Connect to your server (from your Windows PC)

Open **PowerShell** (right-click Start → Terminal) and type:

```powershell
ssh root@YOUR-SERVER-IP
```

Type `yes` when asked, then enter the root password from the email. You are
now "inside" your server — every following command runs there (in the black
SSH window), until the guide says otherwise.

---

## Step 2 — Install the software

One long block — copy, paste, wait (~3 minutes):

```bash
apt update && apt upgrade -y
apt install -y curl git postgresql
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs
```

Check that it worked:

```bash
node -v     # should print v22.x.x
psql --version
```

## Step 3 — Create the database

Pick a strong database password and remember it — you'll need it 3 times
below. Then run (replace `PICK-A-STRONG-PASSWORD` both times):

```bash
sudo -u postgres psql -c "CREATE USER kbs WITH PASSWORD 'PICK-A-STRONG-PASSWORD';"
sudo -u postgres psql -c "CREATE DATABASE kouba_books OWNER kbs;"
```

## Step 4 — Put the store code on the server

```bash
git clone https://github.com/Taharouabhi/kooba-book-stoe-.git
cd kooba-book-stoe-
npm install
```

The `db-dump/` folder (your orders) is **not** on GitHub — it stays on your PC
on purpose (it contains customer details). Upload it from Windows PowerShell
in a **second window** (keep the SSH window open):

```powershell
scp -r "C:\Users\User\Documents\Qoder\2026-09-25\adfbd1e6\db-dump" root@YOUR-SERVER-IP:/root/kooba-book-stoe-/db-dump
```

Then back in the SSH window, load the data:

```bash
cd ~/kooba-book-stoe-
DATABASE_URL="postgres://kbs:PICK-A-STRONG-PASSWORD@127.0.0.1:5432/kouba_books" node db/import-dump.mjs
```

Expected result: `books: 23/23 rows imported`, the other tables listed, then
`Import finished.` (If you skip this step, the store still works — it just
starts with an empty catalog and no old orders.)

## Step 5 — Start the store and keep it running

```bash
cd ~/kooba-book-stoe-
npm install -g pm2
DATABASE_URL="postgres://kbs:PICK-A-STRONG-PASSWORD@127.0.0.1:5432/kouba_books" PORT=8080 pm2 start server/server.mjs --name kouba-store
pm2 save
```

`pm2` keeps the store running 24/7 and restarts it if it ever crashes.

**Quick test:** in your browser open `http://YOUR-SERVER-IP:8080` — you
should see your bookstore, live from your own server.

## Step 6 — Point your domain at the server

1. Log into the website where you bought the domain → find **DNS records**.
2. Add an **A record**: name `www`, value `YOUR-SERVER-IP`, TTL automatic.
   (Also add one for `@` with the same IP if you want `koubabookstore.com`
   without `www` to work.)
3. Wait 5 minutes to a few hours for it to spread.

## Step 7 — HTTPS (the padlock) with Caddy

Caddy gives you the `https://` padlock automatically, for free:

```bash
apt install -y caddy
nano /etc/caddy/Caddyfile
```

Delete whatever is inside and write these two lines (your real domain):

```
www.koubabookstore.com

reverse_proxy 127.0.0.1:8080
```

Save: `Ctrl+O`, Enter, `Ctrl+X`. Then:

```bash
systemctl reload caddy
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

Open `https://www.koubabookstore.com` — padlock, your store, your server.

## Step 8 — Final checks (important)

1. Open the site, place a **test order**, and note its number.
2. Open `https://www.yourdomain.com/admin/login.html`, log in with your usual
   admin email and password.
3. The test order must appear in **Orders**. Change its status to "done".
4. Check a book's stock went down after the order (Books page).
5. Change the admin password from the dashboard settings page (recommended on
   any fresh server).

If all five pass, migration is complete. Keep the Qoder site as a free backup
— no need to touch it. If you ever want it taken offline or made private,
just ask.

---

## Updating the store later

Every future change works like this:

```bash
cd ~/kooba-book-stoe-
git pull          # download the latest code
pm2 restart kouba-store
```

## Adding new book covers (on your server)

On your own server the dashboard has an extra the Qoder version doesn't: a
real **"رفع غلاف من جهازك" (upload cover from your computer)** button inside
the book editor, and the cover dropdown lists **every** image on the server
automatically — no manual file copying.

- Accepted formats: **PNG, JPG, WebP**, up to 5 MB. The image is compressed
  automatically before upload, so big phone photos are fine.
- Uploaded covers are saved on the server's disk in `web/assets/img/` with
  names like `up-...png`, and appear in the dropdown immediately.
- **Back them up:** uploaded images are *not* in git, so `git pull` on the
  server won't bring them back if the server is ever rebuilt. Copy them to
  your PC from time to time (PowerShell on your computer):
  ```powershell
  scp -r root@YOUR-SERVER-IP:/root/kooba-book-stoe-/web/assets/img "C:\Users\User\Documents\kbs-images-backup"
  ```
  Keep the original files on your PC as the master copy.

## If something goes wrong

| Symptom | Fix |
| --- | --- |
| Site won't start, "DATABASE_URL is not set" | The pm2 command in Step 5 must include the DATABASE_URL=... part; re-run it, then `pm2 save` |
| "Import failed: connect ECONNREFUSED" | PostgreSQL isn't running: `service postgresql start` |
| "password authentication failed for user kbs" | Wrong password in DATABASE_URL — must match Step 3 exactly |
| Domain shows nothing | DNS not spread yet, or A record points to the wrong IP — check with `nslookup www.yourdomain.com` in PowerShell |
| No padlock / certificate error | Caddy can't reach your domain yet — DNS must work before Step 7; re-run `systemctl reload caddy` after |
| Locked out of the firewall | Your host's web control panel has an emergency console — use it to run `ufw disable` |

## A note on the easier alternative

If maintaining a server sounds like too much, a middle path exists: keep the
database on a managed Postgres service (free tiers exist) and run the backend
on a Node host like Render or Railway — no system administration, still your
own domain. The code in `server/` works there too. Ask if you'd rather go
that way.
