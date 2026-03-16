import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiGet } from '../../api';
import SEO from '../../components/SEO';
import Spinner from '../../components/ui/Spinner';
import './ServiceDetail.css';

export default function ServiceDetail() {
  const { slug } = useParams();
  const [service, setService] = useState(null);
  const [allServices, setAllServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    setLoading(true);
    setNotFound(false);
    apiGet(`/services/${slug}`)
      .then(setService)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
    apiGet('/services').then(setAllServices);
  }, [slug]);

  if (loading) {
    return (
      <div className="service-detail-page">
        <div className="container" style={{ padding: '4rem 1.5rem', textAlign: 'center' }}>
          <Spinner size={32} />
        </div>
      </div>
    );
  }

  if (notFound || !service) {
    return (
      <div className="service-detail-page">
        <section className="page-hero">
          <div className="container">
            <h1>Service Not Found</h1>
            <p>The service you're looking for doesn't exist.</p>
          </div>
        </section>
        <section className="section">
          <div className="container" style={{ textAlign: 'center' }}>
            <Link to="/services" className="btn btn-primary">View All Services</Link>
          </div>
        </section>
      </div>
    );
  }

  const features = service.features
    ? service.features.split('\n').filter(f => f.trim())
    : [];

  const whyChooseUs = service.why_choose_us
    ? service.why_choose_us.split('\n').filter(b => b.trim())
    : [];

  const faqs = [];
  if (service.faqs) {
    const blocks = service.faqs.split('\n\n');
    for (const block of blocks) {
      const lines = block.split('\n').filter(l => l.trim());
      if (lines.length >= 2) {
        faqs.push({ question: lines[0].trim(), answer: lines.slice(1).join(' ').trim() });
      }
    }
  }

  const allImages = [];
  if (service.image_before || service.image_after) {
    allImages.push({ image_before: service.image_before, image_after: service.image_after });
  }
  for (const img of (service.images || [])) {
    allImages.push(img);
  }

  const otherServices = allServices.filter(s => s.id !== service.id);
  const ctaText = service.cta_text || 'Get a Free Quote';

  return (
    <div className="service-detail-page">
      <SEO
        title={service.meta_title || `${service.name} | Urban Palm Landscaping`}
        description={service.meta_description || service.description || `Professional ${service.name.toLowerCase()} services in Central Florida.`}
        path={`/services/${service.slug}`}
      />

      {/* Hero */}
      <section className="page-hero">
        <div className="container">
          <span className="hero-badge">Our Services</span>
          <h1>{service.icon ? `${service.icon} ` : ''}{service.name}</h1>
          <p>{service.description}</p>
          {service.price && <div className="sd-hero-price">{service.price}</div>}
          {service.on_sale ? (
            <span className="sd-hero-sale-badge">{service.sale_label || 'SALE'}</span>
          ) : null}
        </div>
      </section>

      {/* Main Content */}
      <section className="section">
        <div className="container">
          <div className="sd-content-grid">
            <div className="sd-main">
              {/* Long Description */}
              {service.long_description && (
                <div className="sd-long-desc">
                  {service.long_description.split('\n\n').map((para, i) => (
                    <p key={i}>{para}</p>
                  ))}
                </div>
              )}

              {/* Features */}
              {features.length > 0 && (
                <div className="sd-features">
                  <h2>What's Included</h2>
                  <ul className="sd-features-list">
                    {features.map((f, i) => (
                      <li key={i}>
                        <span className="sd-check">&#10003;</span>
                        {f.trim()}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Before & After Gallery */}
              {allImages.length > 0 && (
                <div className="sd-gallery">
                  <h2>Before & After</h2>
                  <div className="sd-gallery-grid">
                    {allImages.map((pair, i) => (
                      <div key={i} className="sd-ba-pair">
                        {pair.image_before && (
                          <div className="sd-ba-item">
                            <span className="sd-ba-label">Before</span>
                            <img src={pair.image_before} alt={`${service.name} before`} />
                          </div>
                        )}
                        {pair.image_after && (
                          <div className="sd-ba-item">
                            <span className="sd-ba-label sd-ba-label-after">After</span>
                            <img src={pair.image_after} alt={`${service.name} after`} />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Why Choose Us */}
              {whyChooseUs.length > 0 && (
                <div className="sd-why-choose">
                  <h2>Why Choose Urban Palm</h2>
                  <div className="sd-why-grid">
                    {whyChooseUs.map((benefit, i) => (
                      <div key={i} className="sd-why-item">
                        <span className="sd-check">&#10003;</span>
                        <span>{benefit.trim()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* FAQs */}
              {faqs.length > 0 && (
                <div className="sd-faqs">
                  <h2>Frequently Asked Questions</h2>
                  <div className="sd-faq-list">
                    {faqs.map((faq, i) => (
                      <details key={i} className="sd-faq-item">
                        <summary className="sd-faq-question">{faq.question}</summary>
                        <p className="sd-faq-answer">{faq.answer}</p>
                      </details>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <aside className="sd-sidebar">
              <div className="sd-sidebar-card">
                <h3>Ready to Get Started?</h3>
                <p>Request a free consultation and estimate for {service.name.toLowerCase()}.</p>
                <Link to="/quote" className="btn btn-primary btn-lg" style={{ width: '100%' }}>{ctaText}</Link>
                <a href="tel:3212312094" className="btn btn-outline" style={{ width: '100%', marginTop: '0.5rem' }}>Call (321) 231-2094</a>
              </div>

              {/* Other Services */}
              {otherServices.length > 0 && (
                <div className="sd-sidebar-card">
                  <h3>Other Services</h3>
                  <div className="sd-other-services">
                    {otherServices.map(s => (
                      <Link key={s.id} to={`/services/${s.slug}`} className="sd-other-link">
                        <span className="sd-other-icon">{s.icon || '🌿'}</span>
                        <span>{s.name}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </aside>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section cta-section">
        <div className="container">
          <h2>Transform Your Property with {service.name}</h2>
          <p>Get a free consultation and detailed estimate. No obligation.</p>
          <div className="cta-actions">
            <Link to="/quote" className="btn btn-primary btn-lg">{ctaText}</Link>
            <a href="tel:3212312094" className="btn btn-outline btn-lg cta-phone-btn">Call (321) 231-2094</a>
          </div>
        </div>
      </section>
    </div>
  );
}
