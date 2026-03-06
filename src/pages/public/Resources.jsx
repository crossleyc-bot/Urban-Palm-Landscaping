import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { apiGet } from '../../api';
import './Resources.css';

function getEmbedUrl(url) {
  if (!url) return null;
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]+)/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
  const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  return null;
}

const typeLabel = { article: 'Article', video: 'Video', guide: 'Guide', tip: 'Tip' };
const typeIcon = { article: '\uD83D\uDCDD', video: '\uD83C\uDFA5', guide: '\uD83D\uDCD6', tip: '\uD83D\uDCA1' };

export default function Resources() {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('All');

  useEffect(() => {
    apiGet('/resources/published').then(setResources).finally(() => setLoading(false));
  }, []);

  const types = useMemo(() => {
    const set = new Set(resources.map(r => r.type));
    return ['All', ...Array.from(set)];
  }, [resources]);

  const filtered = useMemo(() => {
    if (activeFilter === 'All') return resources;
    return resources.filter(r => r.type === activeFilter);
  }, [resources, activeFilter]);

  return (
    <div className="resources-page">
      <section className="page-hero">
        <div className="container">
          <span className="hero-badge">Learn &amp; Grow</span>
          <h1>Resources</h1>
          <p>Helpful videos, articles, and guides to help you get the most out of your landscape.</p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          {loading ? (
            <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '3rem 0' }}>Loading resources...</p>
          ) : resources.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem 0' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>{'\uD83D\uDCDA'}</div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Coming Soon</h2>
              <p style={{ color: 'var(--color-text-muted)', maxWidth: 480, margin: '0 auto 1.5rem' }}>
                We are building a library of helpful resources for our customers. Check back soon!
              </p>
              <Link to="/contact" className="btn btn-primary">Contact Us</Link>
            </div>
          ) : (
            <>
              {/* Filter chips */}
              {types.length > 2 && (
                <div className="resources-filter">
                  {types.map(t => (
                    <button
                      key={t}
                      className={`filter-chip ${activeFilter === t ? 'filter-chip-active' : ''}`}
                      onClick={() => setActiveFilter(t)}
                    >
                      {t === 'All' ? 'All' : `${typeIcon[t] || ''} ${typeLabel[t] || t}`}
                    </button>
                  ))}
                </div>
              )}

              <div className="resources-grid">
                {filtered.map(r => {
                  const embedUrl = getEmbedUrl(r.url);
                  return (
                    <div key={r.id} className="resource-card">
                      <div className="resource-media">
                        {embedUrl ? (
                          <div className="resource-video-wrapper">
                            <iframe
                              src={embedUrl}
                              title={r.title}
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                            />
                          </div>
                        ) : r.thumbnail ? (
                          <img src={r.thumbnail} alt={r.title} />
                        ) : (
                          <div className="resource-placeholder">
                            <span>{typeIcon[r.type] || '\uD83D\uDCDD'}</span>
                          </div>
                        )}
                        <span className="resource-type-badge" data-type={r.type}>
                          {typeLabel[r.type] || r.type}
                        </span>
                      </div>
                      <div className="resource-body">
                        <h3>{r.title}</h3>
                        {r.description && <p>{r.description}</p>}
                        {r.url && !embedUrl && (
                          <a
                            href={r.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-secondary btn-sm"
                            style={{ marginTop: 'auto' }}
                          >
                            Read More &rarr;
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="section cta-section">
        <div className="container">
          <h2>Have Questions About Your Landscape?</h2>
          <p>Our team is ready to help with expert advice and free consultations.</p>
          <div className="cta-actions">
            <Link to="/contact" className="btn btn-primary btn-lg">Get Free Consultation</Link>
            <a href="tel:3212312094" className="btn btn-outline btn-lg cta-phone-btn">Call (321) 231-2094</a>
          </div>
        </div>
      </section>
    </div>
  );
}
