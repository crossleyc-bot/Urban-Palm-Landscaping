import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiGet } from '../../api';
import HeroCarousel from '../../components/HeroCarousel';
import SEO from '../../components/SEO';
import { useSiteSettings } from '../../context/SiteSettingsContext';
import './Home.css';

function getEmbedUrl(url) {
  if (!url) return null;
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]+)/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
  const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  return null;
}

function isDirectVideo(url) {
  if (!url) return false;
  return url.startsWith('/uploads/videos/') || /\.(mp4|webm|mov|ogg)(\?|$)/i.test(url);
}

export default function Home() {
  const { settings } = useSiteSettings();
  const [services, setServices] = useState([]);
  const [testimonials, setTestimonials] = useState([]);
  const [welcomeVideo, setWelcomeVideo] = useState(null);
  const [deals, setDeals] = useState({ saleProducts: [], coupons: [] });
  const phone = settings.contact_phone || '(321) 231-2094';

  useEffect(() => {
    apiGet('/services').then(setServices);
    apiGet('/testimonials').then(setTestimonials);
    apiGet('/deals').then(setDeals).catch(() => {});
    apiGet('/settings').then(s => {
      if (s.welcome_video_url) {
        setWelcomeVideo({
          url: s.welcome_video_url,
          title: s.welcome_video_title || 'Welcome to Urban Palm',
          subtitle: s.welcome_video_subtitle || '',
        });
      }
    });
  }, []);

  return (
    <div className="home">
      <SEO title="Full-Service Landscaping in Central Florida" description="Professional landscape design, installation, and delivery services for residential and commercial properties in Orlando, Winter Park, and Central Florida." path="/" />
      {/* Hero Carousel */}
      <HeroCarousel />

      {/* Current Deals */}
      {(deals.saleProducts.length > 0 || deals.coupons.length > 0) && (
        <section className="section deals-section">
          <div className="container">
            <div className="section-header">
              <span className="section-tag">Current Deals</span>
              <h2>Special Offers & Promotions</h2>
              <p>Take advantage of our latest deals on landscaping products.</p>
            </div>

            {deals.coupons.length > 0 && (
              <div className="deals-coupons">
                {deals.coupons.map(c => (
                  <div key={c.code} className="deal-coupon-card">
                    <div className="deal-coupon-badge">
                      {c.type === 'percentage' ? `${c.value}% OFF` : `$${Number(c.value).toFixed(2)} OFF`}
                    </div>
                    <div className="deal-coupon-info">
                      <code className="deal-coupon-code">{c.code}</code>
                      {c.min_order > 0 && <span className="deal-coupon-min">Min. order ${Number(c.min_order).toFixed(2)}</span>}
                      {c.expires_at && <span className="deal-coupon-expires">Expires {new Date(c.expires_at).toLocaleDateString()}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {deals.saleProducts.length > 0 && (
              <div className="deals-products-grid">
                {deals.saleProducts.map(p => (
                  <Link to="/products" key={p.id} className="deal-product-card">
                    {p.image ? (
                      <img src={p.image} alt={p.item_name} className="deal-product-img" />
                    ) : (
                      <div className="deal-product-img deal-product-placeholder">&#127793;</div>
                    )}
                    <div className="deal-product-info">
                      <span className="deal-sale-badge">SALE</span>
                      <h4>{p.item_name}</h4>
                      {p.category_name && <span className="deal-product-cat">{p.category_name}</span>}
                      <div className="deal-product-prices">
                        <span className="deal-price-old">${Number(p.retail_cost).toFixed(2)}</span>
                        <span className="deal-price-new">${Number(p.sale_price).toFixed(2)}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            <div className="section-cta">
              <Link to="/products" className="btn btn-primary">Shop All Products</Link>
            </div>
          </div>
        </section>
      )}

      {/* Welcome Video */}
      {welcomeVideo && (getEmbedUrl(welcomeVideo.url) || isDirectVideo(welcomeVideo.url)) && (
        <section className="section welcome-video-section">
          <div className="container">
            <div className="section-header">
              <span className="section-tag">Watch</span>
              <h2>{welcomeVideo.title}</h2>
              {welcomeVideo.subtitle && <p>{welcomeVideo.subtitle}</p>}
            </div>
            <div className="welcome-video-wrapper">
              {getEmbedUrl(welcomeVideo.url) ? (
                <iframe
                  src={getEmbedUrl(welcomeVideo.url)}
                  title={welcomeVideo.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <video controls>
                  <source src={welcomeVideo.url} />
                </video>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Single Provider Value Prop */}
      <section className="section value-prop-section">
        <div className="container">
          <div className="value-prop-grid">
            <div className="value-prop-content">
              <span className="section-tag">Full-Service Partner</span>
              <h2>One Provider for Your Entire Landscape Lifecycle</h2>
              <p>
                From initial design concepts to delivery and installation, Urban Palm delivers
                seamless landscaping services that cover every phase of your outdoor space.
                No more juggling multiple contractors.
              </p>
              <ul className="value-prop-list">
                <li><span className="vp-check">&#10003;</span> Design & landscape architecture</li>
                <li><span className="vp-check">&#10003;</span> Professional installation & hardscaping</li>
                <li><span className="vp-check">&#10003;</span> Material delivery & professional installation</li>
                <li><span className="vp-check">&#10003;</span> Water management & irrigation systems</li>
              </ul>
              <Link to="/services" className="btn btn-primary">See All Services</Link>
            </div>
            <div className="value-prop-cards">
              <div className="vp-card">
                <div className="vp-card-icon">&#127793;</div>
                <h4>Design</h4>
                <p>Custom plans from expert landscape architects</p>
              </div>
              <div className="vp-card">
                <div className="vp-card-icon">&#128296;</div>
                <h4>Build</h4>
                <p>Quality installation with premium materials</p>
              </div>
              <div className="vp-card">
                <div className="vp-card-icon">&#128666;</div>
                <h4>Deliver</h4>
                <p>Materials and plants delivered right to your door</p>
              </div>
              <div className="vp-card">
                <div className="vp-card-icon">&#9830;</div>
                <h4>Enhance</h4>
                <p>Seasonal upgrades that add curb appeal</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="section features-section">
        <div className="container">
          <div className="section-header">
            <span className="section-tag">Why Choose Us</span>
            <h2>Why Choose Urban Palm</h2>
            <p>We bring expertise, reliability, and passion to every project.</p>
          </div>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">&#9733;</div>
              <h3>Expert Team</h3>
              <p>Over 15 years of combined experience in landscape design and horticulture across Central Florida.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">&#127758;</div>
              <h3>Sustainable Practices</h3>
              <p>Eco-friendly solutions that conserve water and support local ecosystems in Florida's unique climate.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">&#10003;</div>
              <h3>Satisfaction Guaranteed</h3>
              <p>We stand behind our work with a comprehensive satisfaction guarantee on every project.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">&#127968;</div>
              <h3>Local Expertise</h3>
              <p>Deep understanding of Central Florida's climate, soil, and the plants that thrive here year-round.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Services preview */}
      <section className="section services-preview">
        <div className="container">
          <div className="section-header">
            <span className="section-tag">Services</span>
            <h2>Comprehensive Landscaping Solutions</h2>
            <p>From residential gardens to commercial properties, we handle it all.</p>
          </div>
          <div className="services-grid">
            {services.slice(0, 3).map((service) => (
              <div key={service.id} className="service-preview-card">
                <div className="service-icon">{service.icon}</div>
                <h3>{service.name}</h3>
                <p>{service.description}</p>
                <div className="service-card-footer">
                  <span className="service-price">{service.price}</span>
                  <Link to="/portal/quote" className="btn btn-secondary btn-sm">Get Quote</Link>
                </div>
              </div>
            ))}
          </div>
          <div className="section-cta">
            <Link to="/services" className="btn btn-primary">View All Services</Link>
          </div>
        </div>
      </section>

      {/* Markets Served */}
      <section className="section markets-section">
        <div className="container">
          <div className="section-header">
            <span className="section-tag">Markets We Serve</span>
            <h2>Expertise Across Industries</h2>
            <p>Tailored landscaping solutions for every type of property.</p>
          </div>
          <div className="markets-grid">
            <div className="market-card">
              <div className="market-icon">&#127968;</div>
              <h4>Residential</h4>
              <p>Beautiful yards and outdoor living spaces</p>
            </div>
            <div className="market-card">
              <div className="market-icon">&#127970;</div>
              <h4>Commercial</h4>
              <p>Professional grounds for offices and retail</p>
            </div>
            <div className="market-card">
              <div className="market-icon">&#127960;</div>
              <h4>HOA & Multi-Family</h4>
              <p>Community spaces residents are proud of</p>
            </div>
            <div className="market-card">
              <div className="market-icon">&#127963;</div>
              <h4>Hospitality</h4>
              <p>Stunning landscapes for hotels and resorts</p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="section testimonials-section">
        <div className="container">
          <div className="section-header">
            <span className="section-tag">Testimonials</span>
            <h2>What Our Clients Say</h2>
            <p>Hear from property owners who transformed their outdoor spaces with us.</p>
          </div>
          <div className="testimonials-grid">
            {testimonials.map((t) => (
              <div key={t.id} className="testimonial-card">
                <div className="testimonial-stars">
                  {'\u2605'.repeat(t.rating)}{'\u2606'.repeat(5 - t.rating)}
                </div>
                <p className="testimonial-text">"{t.text}"</p>
                <div className="testimonial-author">
                  <div className="testimonial-avatar">{t.name.charAt(0)}</div>
                  <div>
                    <div className="testimonial-name">{t.name}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section cta-section">
        <div className="container">
          <span className="cta-tag">Ready to Get Started?</span>
          <h2>Let's Create Your Dream Landscape</h2>
          <p>Contact us today for a free on-site consultation and detailed estimate. No obligation, no pressure.</p>
          <div className="cta-actions">
            <Link to="/quote" className="btn btn-primary btn-lg">Get Free Quote</Link>
            <a href={`tel:${phone.replace(/\D/g, '')}`} className="btn btn-outline btn-lg cta-phone-btn">Call {phone}</a>
          </div>
        </div>
      </section>
    </div>
  );
}
