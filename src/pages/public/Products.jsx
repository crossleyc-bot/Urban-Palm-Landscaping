import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { apiGet } from '../../api';
import './Products.css';

const categoryIcons = {
  'Plants & Greenery': '\uD83C\uDF3F',
  'Hardscape Materials': '\uD83E\uDDF1',
  'Soils & Amendments': '\uD83C\uDF31',
  'Irrigation & Water Management': '\uD83D\uDCA7',
  'Outdoor Lighting': '\uD83D\uDCA1',
  'Turf & Sod': '\uD83C\uDFD4\uFE0F',
  'Maintenance Supplies': '\uD83D\uDD27',
  'Outdoor Living': '\u2600\uFE0F',
};

const placeholderIcon = (category) => categoryIcons[category] || '\uD83D\uDCE6';

export default function Products() {
  const [products, setProducts] = useState([]);
  const [taxonomyRoots, setTaxonomyRoots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');

  useEffect(() => {
    Promise.all([apiGet('/products'), apiGet('/taxonomy/roots')])
      .then(([prods, roots]) => { setProducts(prods); setTaxonomyRoots(roots); })
      .finally(() => setLoading(false));
  }, []);

  // Build a lookup: for each taxonomy root, the set of names that match (root name + all descendants)
  const categoryMatchMap = useMemo(() => {
    const map = {};
    for (const root of taxonomyRoots) {
      const names = new Set([root.name, ...root.descendant_names].map(n => n.toLowerCase()));
      map[root.name] = names;
    }
    return map;
  }, [taxonomyRoots]);

  // Map each product to its taxonomy root name
  const productTaxonomy = useMemo(() => {
    const lookup = {};
    for (const p of products) {
      // Prefer taxonomy_name from category_id mapping; fall back to free-text category match
      const cat = (p.taxonomy_name || p.category || '').toLowerCase();
      if (!cat) continue;
      for (const [rootName, names] of Object.entries(categoryMatchMap)) {
        if (names.has(cat)) {
          lookup[p.item_name] = rootName;
          break;
        }
      }
    }
    return lookup;
  }, [products, categoryMatchMap]);

  // Filter chip categories from taxonomy roots (only those with matching products)
  const filterCategories = useMemo(() => {
    const matched = new Set(Object.values(productTaxonomy));
    const cats = taxonomyRoots
      .filter(r => matched.has(r.name))
      .map(r => r.name);
    return ['All', ...cats];
  }, [taxonomyRoots, productTaxonomy]);

  // Filter products by taxonomy root match
  const filtered = useMemo(() => {
    if (activeCategory === 'All') return products;
    return products.filter(p => productTaxonomy[p.item_name] === activeCategory);
  }, [products, activeCategory, productTaxonomy]);

  const handleCategoryClick = (name) => {
    setActiveCategory(prev => prev === name ? 'All' : name);
  };

  return (
    <div className="products-page">
      <section className="page-hero">
        <div className="container">
          <span className="hero-badge">Quality Materials &bull; Central Florida</span>
          <h1>Our Products</h1>
          <p>Premium landscaping materials sourced from trusted local suppliers.</p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          {loading ? (
            <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '3rem 0' }}>Loading products...</p>
          ) : products.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem 0' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>&#128230;</div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>No Products Available</h2>
              <p style={{ color: 'var(--color-text-muted)', maxWidth: 480, margin: '0 auto 1.5rem' }}>Our product catalog is being updated. Check back soon for premium landscaping materials from our trusted suppliers.</p>
              <Link to="/contact" className="btn btn-primary">Contact Us for Materials</Link>
            </div>
          ) : (
            <>
              {/* Taxonomy Category Cards */}
              {taxonomyRoots.length > 0 && (
                <div>
                  <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <h2 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>Product Categories</h2>
                    <p style={{ color: 'var(--color-text-muted)', maxWidth: 520, margin: '0 auto' }}>Browse our selection of landscaping materials by category.</p>
                  </div>
                  <div className="product-categories-grid">
                    {taxonomyRoots.map(cat => (
                      <div
                        key={cat.id}
                        className={`product-category-card${activeCategory === cat.name ? ' product-category-card-active' : ''}`}
                        onClick={() => handleCategoryClick(cat.name)}
                      >
                        <div className="product-category-icon">
                          {placeholderIcon(cat.name)}
                        </div>
                        <div className="product-category-info">
                          <h3>{cat.name}</h3>
                          {cat.description && <p>{cat.description}</p>}
                          <span className="product-category-count">{cat.descendant_names.length} sub-categories</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Category filter chips */}
              <div className="products-filter">
                {filterCategories.map(cat => (
                  <button
                    key={cat}
                    className={`filter-chip ${activeCategory === cat ? 'filter-chip-active' : ''}`}
                    onClick={() => setActiveCategory(cat)}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {filtered.length === 0 ? (
                <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '3rem 0' }}>No products available in this category.</p>
              ) : (
                <div className="products-grid">
                  {filtered.map((p, i) => {
                    const rootName = productTaxonomy[p.item_name];
                    return (
                    <div key={i} className="product-card">
                      <div className="product-image">
                        {p.image ? (
                          <img src={p.image} alt={p.item_name} />
                        ) : (
                          <div className="product-placeholder">{placeholderIcon(rootName || p.category)}</div>
                        )}
                        {rootName && <span className="product-category-badge">{rootName}</span>}
                      </div>
                      <div className="product-body">
                        <h3>{p.taxonomy_name || p.item_name}</h3>
                        <div className="product-meta">
                          {p.unit && <span className="product-unit">{p.unit}</span>}
                          {p.supplier_name && <span className="product-supplier">by {p.supplier_name}</span>}
                        </div>
                        {(p.retail_cost != null || p.unit_cost != null) && (
                          <div className="product-price">${Number(p.retail_cost ?? p.unit_cost).toFixed(2)}{p.unit ? ` / ${p.unit}` : ''}</div>
                        )}
                      </div>
                    </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="section" style={{ background: 'var(--color-bg-secondary)' }}>
        <div className="container" style={{ textAlign: 'center' }}>
          <h2 style={{ marginBottom: '0.75rem' }}>Need Materials for Your Project?</h2>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem', maxWidth: 520, margin: '0 auto 1.5rem' }}>
            We deliver and install everything you see here. Request a quote and let us handle the heavy lifting.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/contact" className="btn btn-primary">Get a Quote</Link>
            <Link to="/services" className="btn btn-outline">View Services</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
