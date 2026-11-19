import { Link } from 'react-router-dom';

function About() {
  return (
    <div className="min-h-screen bg-cream">
      <div className="bg-ink text-white py-20">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="text-4xl font-bold mb-4">About CraftVeda</h1>
          <p className="text-cream/75 text-lg">
            A marketplace built to keep traditional Indian crafts in the hands that know them best
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-12 space-y-10">
        <section className="bg-white rounded-sm border border-ink/10 p-8">
          <h2 className="text-2xl font-bold text-ink mb-4">Our Story</h2>
          <p className="text-ink-soft leading-relaxed mb-4">
            CraftVeda began with a simple observation: the finest handmade work in India is still made
            by people whose names never reach the buyer. A block printer in Sanganer, a potter in Jaipur,
            a carver in Srirangapatna — each piece carries a technique that took a lifetime to learn,
            yet it is usually sold as an anonymous product.
          </p>
          <p className="text-ink-soft leading-relaxed">
            We built CraftVeda so that every listing points back to a real artisan, a real craft and a
            real place. Buyers get provenance instead of guesswork, and artisans get a storefront that
            belongs to them rather than to a reseller.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-ink mb-6">What We Do</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-sm border border-ink/10 p-6">
              <div className="text-4xl mb-3">🏺</div>
              <h3 className="font-semibold text-ink mb-2">A direct marketplace</h3>
              <p className="text-sm text-terracotta-dark">
                Verified artisans list their own products, set their own prices and ship directly to
                buyers. Nothing is relabelled or mass produced.
              </p>
            </div>
            <div className="bg-white rounded-sm border border-ink/10 p-6">
              <div className="text-4xl mb-3">📜</div>
              <h3 className="font-semibold text-ink mb-2">Origin you can check</h3>
              <p className="text-sm text-terracotta-dark">
                GI tag records, craft stories and authenticity certificates let you see where a craft
                comes from and who made the piece in your hands.
              </p>
            </div>
            <div className="bg-white rounded-sm border border-ink/10 p-6">
              <div className="text-4xl mb-3">🧵</div>
              <h3 className="font-semibold text-ink mb-2">Skills that stay alive</h3>
              <p className="text-sm text-terracotta-dark">
                Workshops run by practising artisans pass techniques to the next generation, and
                donations support crafts that are expensive to keep in production.
              </p>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-sm border border-ink/10 p-8">
          <h2 className="text-2xl font-bold text-ink mb-4">How CraftVeda Works</h2>
          <ul className="space-y-4 text-ink-soft">
            <li className="flex gap-3">
              <span className="font-bold text-terracotta-dark">01</span>
              <span>
                Artisans create a profile and list their work, or apply to join if they are new to
                selling online.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="font-bold text-terracotta-dark">02</span>
              <span>
                Buyers browse products, workshops and GI tags, and order directly through the platform.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="font-bold text-terracotta-dark">03</span>
              <span>
                Once an order is delivered, an authenticity certificate can be issued and verified
                publicly by its certificate number.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="font-bold text-terracotta-dark">04</span>
              <span>
                Readers follow craft stories that document the history and technique behind each
                tradition.
              </span>
            </li>
          </ul>
        </section>

        <section className="bg-parchment rounded-sm p-8 text-center">
          <h2 className="text-2xl font-bold text-ink mb-3">Explore CraftVeda</h2>
          <p className="text-terracotta-dark mb-6">
            Read the stories behind the crafts, or support the artisans who keep them going.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/stories"
              className="bg-terracotta text-white px-6 py-3 rounded-sm font-semibold hover:bg-terracotta-dark transition"
            >
              Craft Stories
            </Link>
            <Link
              to="/donate"
              className="border-2 border-terracotta text-terracotta-dark px-6 py-3 rounded-sm font-semibold hover:bg-white transition"
            >
              Donate
            </Link>
            <Link
              to="/verify"
              className="border-2 border-terracotta text-terracotta-dark px-6 py-3 rounded-sm font-semibold hover:bg-white transition"
            >
              Verify a Certificate
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

export default About;
