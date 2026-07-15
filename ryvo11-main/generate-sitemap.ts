import fs from "fs";
import path from "path";
import { INITIAL_PRODUCTS } from "./src/constants/initialProducts.ts";

const baseUrl = "https://ryvo.shop";
const currentDate = new Date().toISOString().split("T")[0];

// Load products from initial lists or fallback synced product lists
let products = INITIAL_PRODUCTS;
const productsFilePath = path.join(process.cwd(), "products.json");
if (fs.existsSync(productsFilePath)) {
  try {
    const content = fs.readFileSync(productsFilePath, "utf8");
    products = JSON.parse(content);
  } catch (e) {
    console.error("Error reading synced products for static sitemap generation:", e);
  }
}

// Generate sitemap.xml content
let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

// 1. Main Content Pages & Routes
const mainPages = [
  { loc: "", priority: "1.0", changefreq: "daily" },
  { loc: "/products", priority: "0.9", changefreq: "daily" },
  { loc: "/motorcycles", priority: "0.9", changefreq: "weekly" },
  { loc: "/accessories", priority: "0.9", changefreq: "weekly" },
  { loc: "/offers", priority: "0.8", changefreq: "daily" },
  { loc: "/about", priority: "0.7", changefreq: "monthly" },
  { loc: "/contact", priority: "0.7", changefreq: "monthly" }
];

mainPages.forEach(p => {
  xml += `  <url>\n    <loc>${baseUrl}${p.loc}</loc>\n    <lastmod>${currentDate}</lastmod>\n    <changefreq>${p.changefreq}</changefreq>\n    <priority>${p.priority}</priority>\n  </url>\n`;
});

// 2. Categories
const categories = ["bikes", "cars", "electronics", "accessories"];
categories.forEach(cat => {
  xml += `  <url>\n    <loc>${baseUrl}/?category=${cat}</loc>\n    <lastmod>${currentDate}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;
});

// 3. Products (supporting clean path formats and fallback parameter query structures)
products.forEach((p: any) => {
  xml += `  <url>\n    <loc>${baseUrl}/product/${p.id}</loc>\n    <lastmod>${currentDate}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.9</priority>\n  </url>\n`;
  xml += `  <url>\n    <loc>${baseUrl}/?product=${p.id}</loc>\n    <lastmod>${currentDate}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.9</priority>\n  </url>\n`;
});

xml += `</urlset>`;

// Generate robots.txt content with explicit Sitemap locator link
const robotsTxt = `User-agent: *
Allow: /
Sitemap: ${baseUrl}/sitemap.xml
`;

// Ensure public directory exists and write files
const publicDir = path.join(process.cwd(), "public");
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

fs.writeFileSync(path.join(publicDir, "sitemap.xml"), xml, "utf8");
fs.writeFileSync(path.join(publicDir, "robots.txt"), robotsTxt, "utf8");
console.log("🚀 Static sitemap.xml and robots.txt successfully generated in /public directory.");

// Ensure dist directory exists and write files directly there too as double insurance
const distDir = path.join(process.cwd(), "dist");
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

fs.writeFileSync(path.join(distDir, "sitemap.xml"), xml, "utf8");
fs.writeFileSync(path.join(distDir, "robots.txt"), robotsTxt, "utf8");
console.log("🚀 Static sitemap.xml and robots.txt successfully generated in /dist directory.");
