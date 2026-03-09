import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { apiGet } from '../../api';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../components/ui/Toast';
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
  const [expandedLeaf, setExpandedLeaf] = useState(null);
  const [leafItems, setLeafItems] = useState({});
  const [loadingItems, setLoadingItems] = useState(null);
  const { addItem, updateQuantity, removeItem, items: cartItems } = useCart();
  const { addToast } = useToast();

  useEffect(() => {
    Promise.all([apiGet('/products'), apiGet('/taxonomy/roots')])
      .then(([lvs, roots]) => { setLeaves(lvs); setTaxonomyRoots(roots); })
      .finally(() => setLoading(false));
  }, []);

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
      map[leaf.id] = allDescendants[key] || allDescendants[leaf.name.toLowerCase()] || null;
    }
    return map;
  }, [leaves, taxonomyRoots]);

  const filterCategories = useMemo(() => {
    const matched = new Set(Object.values(leafToRoot).filter(Boolean));
    const cats = taxonomyRoots
      .filter(r => matched.has(r.name))
      .map(r => r.name);
    return ['All', ...cats];
  }, [taxonomyRoots, leafToRoot]);

  const filtered = useMemo(() => {
    if (activeCategory === 'All') return leaves;
    return leaves.filter(l => leafToRoot[l.id] === activeCategory);
  }, [leaves, activeCategory, leafToRoot]);

  const handleCategoryClick = (name) => {
    setActiveCategory(prev => prev === name ? 'All' : name);
  };

  const toggleLeafExpand = async (leafId) => {
    if (expandedLeaf === leafId) {
      setExpandedLeaf(null);
      return;
    }
    setExpandedLeaf(leafId);
    if (!leafItems[leafId]) {
      setLoadingItems(leafId);
      try {
        const items = await apiGet(`/products/${leafId}/items`);
        setLeafItems(prev => ({ ...prev, [leafId]: items }));
      } catch {
        setLeafItems(prev => ({ ...prev, [leafId]: [] }));
      } finally {
        setLoadingItems(null);
      }
    }
  };

  const handleAddToCart = (product) => {
    addItem(product);
    addToast(`${product.item_name} added to cart`, 'success');
  };

  const getCartQty = (productId) => {
    const item = cartItems.find(i => i.product_id === productId);
    return item ? item.quantity : 0;
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
              {taxonomyRoots.length > 0 && (
                <div>
                  <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <h2 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>Product Categories</h2>
                    <p style={{ color: 'var(--color-text-muted)', maxWidth: 520, margin: '0 auto' }}>Browse our selection of landscaping materials by category.</p>
                  </div>
                  <div className="product-categories-grid">
                    {taxonomyRoots.filter(cat => filterCategories.includes(cat.name)).map(cat => (
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
                    const isExpanded = expandedLeaf === leaf.id;
                    const items = leafItems[leaf.id] || [];
                    const isLoadingItems = loadingItems === leaf.id;
                    return (
                      <div key={leaf.id} className={`product-card${isExpanded ? ' product-card-expanded' : ''}`}>
                        <div className="product-image" onClick={() => toggleLeafExpand(leaf.id)} style={{ cursor: 'pointer' }}>
                          {leaf.image ? (
                            <img src={leaf.image} alt={leaf.name} loading="lazy" />
                          ) : (
                            <div className="product-placeholder">{placeholderIcon(rootName || leaf.parent_name)}</div>
                          )}
                          {rootName && <span className="product-category-badge">{rootName}</span>}
                          {leaf.has_sale ? <span className="product-sale-badge">Sale</span> : null}
                        </div>
                        <div className="product-body">
                          <h3 onClick={() => toggleLeafExpand(leaf.id)} style={{ cursor: 'pointer' }}>{leaf.name}</h3>
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
                          <button
                            className="btn btn-primary btn-sm"
                            style={{ marginTop: '0.75rem', width: '100%' }}
                            onClick={() => toggleLeafExpand(leaf.id)}
                          >
                            {isExpanded ? 'Hide Items' : 'View Items'}
                          </button>
                        </div>

                        {isExpanded && (
                          <div className="product-items-panel">
                            {isLoadingItems ? (
                              <p style={{ padding: '1rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>Loading items...</p>
                            ) : items.length === 0 ? (
                              <p style={{ padding: '1rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>No items available.</p>
                            ) : (
                              items.map(item => {
                                const inCart = getCartQty(item.id);
                                const price = item.on_sale && item.sale_price != null ? item.sale_price : item.retail_cost;
                                return (
                                  <div key={item.id} className="product-item-row">
                                    {item.image && (
                                      <img src={item.image} alt={item.item_name} className="product-item-thumb" />
                                    )}
                                    <div className="product-item-info">
                                      <div className="product-item-name">{item.item_name}</div>
                                      {item.unit && <span className="product-item-unit">per {item.unit}</span>}
                                      {item.qty_available > 0 && (
                                        <span className="product-item-stock">{item.qty_available} available</span>
                                      )}
                                    </div>
                                    <div className="product-item-pricing">
                                      {item.on_sale && item.sale_price != null ? (
                                        <>
                                          <span className="product-item-original">${Number(item.retail_cost).toFixed(2)}</span>
                                          <span className="product-item-sale">${Number(item.sale_price).toFixed(2)}</span>
                                        </>
                                      ) : (
                                        <span>${Number(price).toFixed(2)}</span>
                                      )}
                                    </div>
                                    {inCart ? (
                                      <div className="product-item-cart-controls">
                                        <button
                                          className="cart-qty-btn"
                                          onClick={() => {
                                            if (inCart <= 1) {
                                              removeItem(item.id);
                                              addToast(`${item.item_name} removed from cart`, 'info');
                                            } else {
                                              updateQuantity(item.id, inCart - 1);
                                            }
                                          }}
                                          title={inCart <= 1 ? 'Remove from cart' : 'Decrease quantity'}
                                        >
                                          {inCart <= 1 ? '\u2715' : '\u2212'}
                                        </button>
                                        <span className="cart-qty-value">{inCart}</span>
                                        <button
                                          className="cart-qty-btn"
                                          onClick={() => {
                                            if (item.qty_available && inCart >= item.qty_available) {
                                              addToast(`Only ${item.qty_available} available`, 'warning');
                                              return;
                                            }
                                            updateQuantity(item.id, inCart + 1);
                                          }}
                                          disabled={item.qty_available > 0 && inCart >= item.qty_available}
                                          title="Increase quantity"
                                        >
                                          +
                                        </button>
                                      </div>
                                    ) : (
                                      <button
                                        className="btn btn-sm btn-primary"
                                        onClick={() => handleAddToCart(item)}
                                        disabled={item.qty_available <= 0}
                                      >
                                        {item.qty_available <= 0 ? 'Out of Stock' : 'Add to Cart'}
                                      </button>
                                    )}
                                  </div>
                                );
                              })
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </section>

      <section className="section" style={{ background: 'var(--color-bg-secondary)' }}>
        <div className="container" style={{ textAlign: 'center' }}>
          <h2 style={{ marginBottom: '0.75rem' }}>Need Materials for Your Project?</h2>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem', maxWidth: 520, margin: '0 auto 1.5rem' }}>
            We deliver and install everything you see here. Request a quote and let us handle the heavy lifting.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/quote" className="btn btn-primary">Get a Quote</Link>
            <Link to="/services" className="btn btn-outline">View Services</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
