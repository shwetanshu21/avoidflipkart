# Avoid Flipkart

An independent, evidence-led customer account of delivery delays and support correspondence. This is a buildless static website made with HTML and CSS; the airport and product images are illustrations.

## Run locally

From a checkout of this repository, run `python -m http.server 4173` and open `http://localhost:4173/`. No package installation or build step is needed.

## Deploy and search metadata

The site is published at `https://avoidflipkart.com/`. The canonical URL, Open Graph/Twitter card (`og-image.jpg`, 1200×630), `Article` structured data, `sitemap.xml` and `robots.txt` all use that address; update them together if the domain changes. When content changes, update `dateModified`/`article:modified_time` in `index.html` and `lastmod` in `sitemap.xml`. After deployment, submit the sitemap in Google Search Console and Bing Webmaster Tools. Indexing and ranking are controlled by search engines.

Images are served as WebP. The full-resolution source PNGs are kept outside the repository.

The original correspondence, contact details, full order identifiers, and private case notes are not part of this repository. Font licenses are included alongside the self-hosted fonts in `assets/fonts/`.
