# Kouba Book Store — Project Guide

Simple map of your project. You never need to edit files yourself:
just tell Qoder what you want to change and it will do it for you.

## Where everything lives

The website is inside the `web/` folder. Only this folder is published online.

The backend (order saving, admin login, dashboard data) is in the `functions/` folder,
and `dev/` holds local test helpers. You never need to touch either one.

### Store pages (public website)

| File | What it is |
| --- | --- |
| `web/index.html` | Home page (book of the month, categories, bundles, new arrivals) |
| `web/category.html` | All books page with filters (categories, price, sorting) |
| `web/book.html` | Single book page (photos, description, reviews, add to cart) |
| `web/bundles.html` | All bundles page |
| `web/bundle.html` | Single bundle page |
| `web/new-releases.html` | New arrivals page |
| `web/search.html` | Search results page |
| `web/cart.html` | Shopping cart page |
| `web/checkout.html` | Order form (name, phone, wilaya, address, payment) |
| `web/success.html` | Thank-you page after ordering |
| `web/shipping.html` | Delivery prices for all 58 wilayas + payment methods |

### Dashboard pages (`web/admin/`)

| File | What it is |
| --- | --- |
| `web/admin/login.html` | Admin login page |
| `web/admin/index.html` | Dashboard overview (stats, sales chart, recent orders) |
| `web/admin/books.html` | Manage books (add, edit, delete) |
| `web/admin/categories.html` | Manage categories |
| `web/admin/orders.html` | Manage orders |
| `web/admin/bundles.html` | Manage bundles |
| `web/admin/settings.html` | Store settings |

### The two most important files

| File | What it controls |
| --- | --- |
| `web/assets/js/data.js` | ALL the content: book titles, prices, descriptions, categories, bundles, orders, delivery prices, phone number, store info. Most changes happen here. |
| `web/assets/css/styles.css` | ALL the design: colors, fonts, sizes, spacing. |

### Images

All pictures are in `web/assets/img/` — book covers, logo, bundle images.

## Common changes and where they go

- Change a book price or title → `data.js`
- Add a new book → `data.js`
- Change phone number or store info → `data.js`
- Change colors or fonts → `styles.css`
- Change text on a specific page → that page's `.html` file
- Replace a cover image → `web/assets/img/`

## Live address

https://kouba-book-store-1smj44s7r3b.qoder.website

## How to make changes

Open this project in Qoder and just describe the change in normal words,
for example: "change the price of the book of the month to 2000" or
"make the buttons red". Qoder edits the files and republishes the site.

## Notes

- `shots/` and `shot.sh` are test screenshots/helpers — not part of the website.
- Orders placed on the site are saved for real and appear in the dashboard.
  Book stock goes down automatically after each order.
- The dashboard (`/admin/login.html`) is protected by a real password —
  keep it private.
- The site is public: anyone with the link can browse and order.

## Self-hosting (optional)

The whole store can also run on your own server with your own domain —
`server/` is the standalone server, `db/import-dump.mjs` loads the data
export, and **`SELF-HOSTING.md` is the full step-by-step guide**.
