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

  // Derive filter chip categories from product data
  const filterCategories = useMemo(() => {
    const cats = [...new Set(products.map(p => p.category).filter(Boolean))].sort();
    return ['All', ...cats];
  }, [products]);

  // Filter products: when a taxonomy root is selected, match any product whose
  // category text matches the root name or any of its descendant names
  const filtered = useMemo(() => {
    if (activeCategory === 'All') return products;
    const matchNames = categoryMatchMap[activeCategory];
    if (matchNames) {
      return products.filter(p => p.category && matchNames.has(p.category.toLowerCase()));
    }
    // Fallback: exact match on the inventory category text
    return products.filter(p => p.category === activeCategory);
  }, [products, activeCategory, categoryMatchMap]);

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

      {/* Taxonomy Category Cards */}
      {taxonomyRoots.length > 0 && (
        <section className="section">
          <div className="container">
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
        </section>
      )}

      <section className="section" style={taxonomyRoots.length > 0 ? { paddingTop: 0 } : {}}>
        <div className="container">
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

          {loading ? (
            <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '3rem 0' }}>Loading products...</p>
          ) : filtered.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '3rem 0' }}>No products available in this category.</p>
          ) : (
            <div className="products-grid">
              {filtered.map((p, i) => (
                <div key={i} className="product-card">
                  <div className="product-image">
                    {p.image ? (
                      <img src={p.image} alt={p.item_name} />
                    ) : (
                      <div className="product-placeholder">{placeholderIcon(p.category)}</div>
                    )}
                    {p.category && <span className="product-category-badge">{p.category}</span>}
                  </div>
                  <div className="product-body">
                    <h3>{p.item_name}</h3>
                    <div className="product-meta">
                      {p.unit && <span className="product-unit">{p.unit}</span>}
                      {p.supplier_name && <span className="product-supplier">by {p.supplier_name}</span>}
                    </div>
                    {(p.retail_cost != null || p.unit_cost != null) && (
                      <div className="product-price">${Number(p.retail_cost ?? p.unit_cost).toFixed(2)}{p.unit ? ` / ${p.unit}` : ''}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
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
