import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { apiGet } from '../../api';
import SEO from '../../components/SEO';
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
  const [leaves, setLeaves] = useState([]);
  const [taxonomyRoots, setTaxonomyRoots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');

  useEffect(() => {
    Promise.all([apiGet('/products'), apiGet('/taxonomy/roots')])
      .then(([lvs, roots]) => { setLeaves(lvs); setTaxonomyRoots(roots); })
      .finally(() => setLoading(false));
  }, []);

  // Map each leaf to its taxonomy root name
  const leafToRoot = useMemo(() => {
    const allDescendants = {};
    for (const root of taxonomyRoots) {
      for (const name of [root.name, ...root.descendant_names]) {
        allDescendants[name.toLowerCase()] = root.name;
      }
    }
    const map = {};
    for (const leaf of leaves) {
      const key = (leaf.parent_name || leaf.name || '').toLowerCase();
      // Try parent name first, then leaf name itself
      map[leaf.id] = allDescendants[key] || allDescendants[leaf.name.toLowerCase()] || null;
    }
    return map;
  }, [leaves, taxonomyRoots]);

  // Filter chip categories from taxonomy roots (only those with matching leaves)
  const filterCategories = useMemo(() => {
    const matched = new Set(Object.values(leafToRoot).filter(Boolean));
    const cats = taxonomyRoots
      .filter(r => matched.has(r.name))
      .map(r => r.name);
    return ['All', ...cats];
  }, [taxonomyRoots, leafToRoot]);

  // Filter leaves by taxonomy root match
  const filtered = useMemo(() => {
    if (activeCategory === 'All') return leaves;
    return leaves.filter(l => leafToRoot[l.id] === activeCategory);
  }, [leaves, activeCategory, leafToRoot]);

  const handleCategoryClick = (name) => {
    setActiveCategory(prev => prev === name ? 'All' : name);
  };

  return (
    <div className="products-page">
      <SEO title="Quality Landscaping Materials & Products" description="Browse our selection of premium landscaping materials from trusted local suppliers. Plants, hardscapes, irrigation, lighting, and more." path="/products" />
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
          ) : leaves.length === 0 ? (
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
                  {filtered.map(leaf => {
                    const rootName = leafToRoot[leaf.id];
                    return (
                      <div key={leaf.id} className="product-card">
                        <div className="product-image">
                          {leaf.image ? (
                            <img src={leaf.image} alt={leaf.name} />
                          ) : (
                            <div className="product-placeholder">{placeholderIcon(rootName || leaf.parent_name)}</div>
                          )}
                          {rootName && <span className="product-category-badge">{rootName}</span>}
                          {leaf.has_sale ? <span className="product-sale-badge">Sale</span> : null}
                        </div>
                        <div className="product-body">
                          <h3>{leaf.name}</h3>
                          {leaf.description && (
                            <p className="product-description">{leaf.description}</p>
                          )}
                          <div className="product-meta">
                            <span className="product-unit">{leaf.product_count} product{leaf.product_count !== 1 ? 's' : ''} available</span>
                          </div>
                          {leaf.max_price != null && (
                            <div className="product-price">
                              {leaf.has_sale && leaf.min_sale_price != null ? (
                                <>
                                  <span style={{ textDecoration: 'line-through', color: 'var(--color-text-muted)', fontSize: '0.85rem', marginRight: '0.4rem' }}>
                                    ${Number(leaf.max_price).toFixed(2)}
                                  </span>
                                  <span style={{ color: '#dc2626' }}>${Number(leaf.min_sale_price).toFixed(2)}</span>
                                </>
                              ) : (
                                `$${Number(leaf.max_price).toFixed(2)}`
                              )}
                            </div>
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
            <Link to="/portal/quote" className="btn btn-primary">Get a Quote</Link>
            <Link to="/services" className="btn btn-outline">View Services</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
