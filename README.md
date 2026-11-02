# Avoid Flipkart

An independent, evidence-led customer account of delivery delays, support correspondence, and a pricing question. This is a buildless static website made with HTML and CSS; the airport and product images are illustrations.

## Run locally

From a checkout of this repository, run `python -m http.server 4173` and open `http://localhost:4173/`. No package installation or build step is needed.

## Deploy and search metadata

Upload the repository's website files to a static web server when a domain has been chosen. The page already includes a descriptive title, description, Open Graph text, structured data, and a robots policy. Before going live, add the final absolute canonical URL, Open Graph URL and image URL in `index.html`; create a `sitemap.xml` with the final absolute page URL and add its location to `robots.txt`. Submit the sitemap to the relevant search engine tools after deployment. Indexing and ranking are controlled by search engines.

The original correspondence, contact details, full order identifiers, and private case notes are not part of this repository. Font licenses are included alongside the self-hosted fonts in `assets/fonts/`.

