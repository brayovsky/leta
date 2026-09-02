const WHATSAPP_NUMBER = "254141225868";
const WHATSAPP_LINK = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
  "Hi Leta! I'd like to request some shopping."
)}`;

const categories = [
  { icon: "🛒", title: "Groceries", text: "Everyday essentials for your home." },
  { icon: "🧴", title: "Household", text: "Cleaning products and household supplies." },
  { icon: "🍼", title: "Baby essentials", text: "The things you need for little ones." },
  { icon: "🐾", title: "Pet supplies", text: "Food and everyday pet essentials." },
  { icon: "📦", title: "Everyday shopping", text: "Tell us what you need and we'll look for it." },
  { icon: "🚚", title: "Parcel pickups & delivery", text: "We'll collect and drop off parcels for you." },
  { icon: "✨", title: "And more", text: "If it's available locally, ask Leta." }
];

export default function Home() {
  return (
    <main>
      <div className="promo-banner">
        🎉 Free delivery in Sabaki and environs until September 30th!
      </div>
      <header className="nav">
        <a href="#" className="brand" aria-label="Leta home">
          <img src="/logo.png" alt="" className="brand-logo" />
          <span>leta</span>
        </a>
        <nav className="desktop-nav">
          <a href="#how-it-works">How it works</a>
          <a href="#what-we-get">What we get</a>
          <a href="#about">About Leta</a>
          <a href="#contact">Contact</a>
        </nav>
        <a className="nav-cta" href={WHATSAPP_LINK} target="_blank" rel="noreferrer">
          WhatsApp us
        </a>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow"><span /> Currently serving Sabaki</div>
          <h1>Need something<br /><em>from the shops?</em></h1>
          <p className="hero-text">
            Tell Leta what you need. We'll shop it and deliver it to your door.
            No queues. No traffic. No hassle.
          </p>
          <p className="hero-text hero-promo">
            🚚 Free delivery in Sabaki and environs until September 30th.
          </p>
          <div className="hero-actions">
            <a className="button primary" href={WHATSAPP_LINK} target="_blank" rel="noreferrer">
              WhatsApp Leta <span>↗</span>
            </a>
            <a className="button secondary" href="#how-it-works">See how it works</a>
          </div>
          <p className="microcopy">Simple shopping. Delivered locally.</p>
        </div>

        <div className="hero-card-wrap" aria-hidden="true">
          <div className="hero-card">
            <div className="card-top">
              <span className="tiny-logo"><img src="/logo.png" alt="" /></span>
              <span>YOUR REQUEST</span>
              <span className="status">●</span>
            </div>
            <div className="message">
              <span className="message-label">WhatsApp</span>
              <p>Hi Leta 👋<br /><br />Can you get me milk, eggs, bread, 2kg unga and washing powder?</p>
            </div>
            <div className="card-divider" />
            <div className="shopping-row"><span>🛒</span><div><strong>Shopping</strong><small>Finding your items</small></div><b>✓</b></div>
            <div className="shopping-row"><span>📍</span><div><strong>Delivery</strong><small>Coming to your door</small></div><b>→</b></div>
            <div className="receipt">
              <span>Leta</span><span>Shopping made easy.</span>
            </div>
          </div>
          <div className="float-pill pill-one">🛍️ <b>We shop</b> for you</div>
          <div className="float-pill pill-two">📍 Local delivery</div>
        </div>
      </section>

      <section className="trust-strip">
        <span>EVERYDAY SHOPPING</span><i>•</i><span>LOCAL DELIVERY</span><i>•</i><span>WHATSAPP FIRST</span><i>•</i><span>BUILT TO SCALE</span>
      </section>

      <section className="section how" id="how-it-works">
        <div className="section-heading">
          <div className="eyebrow">How it works</div>
          <h2>Three steps.<br /><em>That's it.</em></h2>
        </div>
        <div className="steps">
          <div className="step"><span className="step-number">01</span><div className="step-icon">💬</div><h3>Tell us what you need</h3><p>Send your shopping request on WhatsApp. Just type it naturally — no catalogue to browse.</p></div>
          <div className="step"><span className="step-number">02</span><div className="step-icon">🛍️</div><h3>We shop for you</h3><p>We'll source your items, confirm the details and get everything ready.</p></div>
          <div className="step"><span className="step-number">03</span><div className="step-icon">🏠</div><h3>We bring it to you</h3><p>Your shopping is delivered to your door. Simple, convenient and local.</p></div>
        </div>
      </section>

      <section className="section cream" id="what-we-get">
        <div className="section-heading centered">
          <div className="eyebrow">What can Leta get?</div>
          <h2>Whatever you need<br /><em>for everyday life.</em></h2>
          <p>We're starting with everyday shopping. If you're not sure, just ask.</p>
        </div>
        <div className="category-grid">
          {categories.map((c) => (
            <div className="category" key={c.title}>
              <div className="category-icon">{c.icon}</div><h3>{c.title}</h3><p>{c.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section about" id="about">
        <div className="about-card">
          <div className="eyebrow light">Starting local. Building for everywhere.</div>
          <h2>Local shopping,<br /><em>built to scale.</em></h2>
          <p>
            Leta is built to make everyday shopping faster, easier and more
            convenient — starting with the communities right around us. As we
            learn, we're growing the service to reach more neighbourhoods.
          </p>
          <div className="location"><span>📍</span><div><strong>Currently serving</strong><b>Sabaki</b></div></div>
        </div>
      </section>

      <section className="section contact" id="contact">
        <div className="contact-copy">
          <div className="eyebrow">Get in touch</div>
          <h2>Ready to let Leta<br /><em>handle it?</em></h2>
          <p>Have something you need from the shops? Send us a WhatsApp and tell us what you need.</p>
        </div>
        <div className="contact-box">
          <span className="contact-label">WHATSAPP</span>
          <a href={WHATSAPP_LINK} target="_blank" rel="noreferrer">0141 225 868 <span>↗</span></a>
          <div className="contact-line" />
          <span className="contact-label">WEB</span>
          <a href="https://leta.now">leta.now</a>
        </div>
      </section>

      <footer>
        <a href="#" className="brand footer-brand"><img src="/logo.png" alt="" className="brand-logo" /><span>leta</span></a>
        <p>Shopping made easy.</p>
        <span>© 2026 Leta</span>
      </footer>
    </main>
  );
}