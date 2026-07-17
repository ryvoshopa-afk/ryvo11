import { Product, Language } from '../types';
import { TRANSLATIONS } from '../constants/translations';

export function updateSEO({
  product,
  category,
  language,
  pageName
}: {
  product?: Product;
  category?: string;
  language: Language;
  pageName?: string;
}) {
  const t = TRANSLATIONS[language];
  
  // Set accurate titles
  let title = t.store_name;
  if (product) {
    const pName = language === 'ar' ? product.name_ar : language === 'fr' ? product.name_fr : product.name_en;
    title = `${pName} | ${t.store_name}`;
  } else if (pageName) {
    title = `${pageName} | ${t.store_name}`;
  } else if (category && category !== 'all') {
    title = `${t[category] || category} | ${t.store_name}`;
  }

  document.title = title;

  // Update meta tags dynamically
  updateMeta('description', product ? (language === 'ar' ? product.description_ar : language === 'fr' ? product.description_fr : product.description_en) : t.meta_desc);
  updateMeta('keywords', t.meta_keywords);
  
  // OpenGraph tags
  updateMeta('og:title', title, 'property');
  updateMeta('og:description', product ? (language === 'ar' ? product.description_ar : language === 'fr' ? product.description_fr : product.description_en) : t.meta_desc, 'property');
  updateMeta('og:image', product ? product.image : 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=800&q=80', 'property');
  updateMeta('og:type', product ? 'product' : 'website', 'property');
  updateMeta('og:url', window.location.href, 'property');

  // Inject Structured Data for Google Rich Snippets
  const canonicalUrl = "https://ryvo.shop";
  const currentUrl = window.location.href;

  const websiteSchema = {
    '@type': 'WebSite',
    '@id': `${canonicalUrl}/#website`,
    'url': canonicalUrl,
    'name': t.store_name,
    'description': t.meta_desc,
    'publisher': {
      '@id': `${canonicalUrl}/#organization`
    },
    'potentialAction': {
      '@type': 'SearchAction',
      'target': `${canonicalUrl}/?search={search_term_string}`,
      'query-input': 'required name=search_term_string'
    }
  };

  const organizationSchema = {
    '@type': ['OnlineStore', 'Organization'],
    '@id': `${canonicalUrl}/#organization`,
    'name': t.store_name,
    'url': canonicalUrl,
    'logo': 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=800&q=80',
    'image': 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=800&q=80',
    'telephone': '+966555555555',
    'priceRange': '$$',
    'address': {
      '@type': 'PostalAddress',
      'streetAddress': 'Olaya King Fahd Rd',
      'addressLocality': 'Riyadh',
      'addressCountry': 'SA'
    },
    'sameAs': [
      'https://ryvo.shop',
      'https://instagram.com/ryvo.shop',
      'https://twitter.com/ryvo_shop'
    ]
  };

  const graphList: any[] = [websiteSchema, organizationSchema];

  if (product) {
    const pName = language === 'ar' ? product.name_ar : language === 'fr' ? product.name_fr : product.name_en;
    const pDesc = language === 'ar' ? product.description_ar : language === 'fr' ? product.description_fr : product.description_en;
    
    // Support image arrays
    const productImages = [
      product.image,
      ...(product.additional_images || [])
    ].filter(Boolean);

    const productSchema = {
      '@type': 'Product',
      '@id': `${canonicalUrl}/product/${product.id}/#product`,
      'name': pName,
      'image': productImages,
      'description': pDesc || pName,
      'sku': product.id,
      'mpn': product.id,
      'brand': {
        '@type': 'Brand',
        'name': 'RYVO'
      },
      'offers': {
        '@type': 'Offer',
        'url': currentUrl,
        'priceCurrency': 'SAR',
        'price': product.price,
        'priceValidUntil': '2027-12-31',
        'itemCondition': 'https://schema.org/NewCondition',
        'availability': product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
        'seller': {
          '@id': `${canonicalUrl}/#organization`
        }
      },
      'aggregateRating': {
        '@type': 'AggregateRating',
        'ratingValue': product.rating_count > 0 ? (product.rating_sum / product.rating_count).toFixed(1) : '5.0',
        'reviewCount': product.rating_count > 0 ? product.rating_count : '1'
      }
    };
    graphList.push(productSchema);
  } else if (pageName === 'blog') {
    // Inject dynamic Blog & Articles Schema
    const blogSchema = {
      '@type': 'Blog',
      '@id': `${canonicalUrl}/blog/#blog`,
      'name': language === 'ar' ? 'مدونة رايفو الرسمية للدراجات النارية' : 'Ryvo Official Motorcycle Blog',
      'description': language === 'ar' 
        ? 'مقالات وأخبار حصرية وتغطية رياضية لأحدث الدراجات النارية والهوائية وصيانة المحركات.' 
        : 'Exclusive articles, news coverage and tips for motorcycles, bicycles, and engine maintenance.',
      'url': currentUrl,
      'publisher': {
        '@id': `${canonicalUrl}/#organization`
      },
      'blogPost': [
        {
          '@type': 'BlogPosting',
          'headline': language === 'ar' ? 'دليل القيادة الآمنة وصيانة سلاسل الدراجات النارية' : 'Safe Riding Guide & Motorcycle Chain Maintenance',
          'datePublished': '2026-06-20',
          'author': {
            '@type': 'Person',
            'name': 'Ryvo Expert Team'
          }
        },
        {
          '@type': 'BlogPosting',
          'headline': language === 'ar' ? 'مقارنة بين الدراجات الرياضية الكربونية والدراجات الجبلية' : 'Carbon Fiber Sport Bikes vs Mountain Cruisers Duel',
          'datePublished': '2026-06-25',
          'author': {
            '@type': 'Person',
            'name': 'Ryvo Creative Team'
          }
        }
      ]
    };
    graphList.push(blogSchema);
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': graphList
  };

  // Inject into index.html
  let scriptElement = document.getElementById('ryvo-structured-seo') as HTMLScriptElement;
  if (!scriptElement) {
    scriptElement = document.createElement('script');
    scriptElement.id = 'ryvo-structured-seo';
    scriptElement.type = 'application/ld+json';
    document.head.appendChild(scriptElement);
  }
  scriptElement.text = JSON.stringify(jsonLd);
}

function updateMeta(name: string, content: string, type: 'name' | 'property' = 'name') {
  let element = document.querySelector(`meta[${type}="${name}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(type, name);
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
}

// Generate an XML sitemap of the applet dynamically as a string for users to save or bots to inspect
export function generateSitemapXML(products: Product[]): string {
  const baseUrl = "https://ryvo.shop"; // Align with the canonical domain
  const currentDate = new Date().toISOString().split('T')[0];

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

  // 2. Product categories
  const categories = ["bikes", "cars", "electronics", "accessories"];
  categories.forEach(cat => {
    xml += `  <url>\n    <loc>${baseUrl}/?category=${cat}</loc>\n    <lastmod>${currentDate}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;
  });

  // 3. Individual Product Pages
  products.forEach(p => {
    xml += `  <url>\n    <loc>${baseUrl}/product/${p.id}</loc>\n    <lastmod>${currentDate}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;
  });

  xml += `</urlset>`;
  return xml;
}

// Generate robots.txt
export function generateRobotsTXT(): string {
  const baseUrl = "https://ryvo.shop";
  return `User-agent: *
Allow: /
Sitemap: ${baseUrl}/sitemap.xml
`;
}
