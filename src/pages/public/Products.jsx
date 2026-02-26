import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { apiGet } from '../../api';
import './Products.css';

const placeholderImg = (category) => {
  const icons = {
    Plants: '\uD83C\uDF3F', Trees: '\uD83C\uDF34', Sod: '\uD83C\uDFD4\uFE0F', Mulch: '\uD83E\uDEB5',
    Stone: '\uD83E\uDEA8', Pavers: '\uD83E\uDDF1', Irrigation: '\uD83D\uDCA7', Lighting: '\uD83D\uDCA1',
    Soil: '\uD83C\uDF3B', Fertilizer: '\uD83C\uDF31', Tools: '\uD83D\uDD27',
  };
  return icons[category] || '\uD83D\uDCE6';
};

export default function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');

  useEffect(() => {
    apiGet('/products').then(setProducts).finally(() => setLoading(false));
  }, []);

  const categories = useMemo(() => {
    const cats = [...new Set(products.map(p => p.category).filter(Boolean))].sort();
    return ['All', ...cats];
  }, [products]);

  const filtered = activeCategory === 'All'
    ? products
    : products.filter(p => p.category === activeCategory);

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
          {/* Category filter */}
          <div className="products-filter">
            {categories.map(cat => (
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
                      <div className="product-placeholder">{placeholderImg(p.category)}</div>
                    )}
                    {p.category && <span className="product-category-badge">{p.category}</span>}
                  </div>
                  <div className="product-body">
                    <h3>{p.item_name}</h3>
                    <div className="product-meta">
                      {p.unit && <span className="product-unit">{p.unit}</span>}
                      {p.supplier_name && <span className="product-supplier">by {p.supplier_name}</span>}
                    </div>
                    {p.unit_cost != null && (
                      <div className="product-price">${Number(p.unit_cost).toFixed(2)}{p.unit ? ` / ${p.unit}` : ''}</div>
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
