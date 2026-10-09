import { Link } from 'react-router-dom';

function About() {
  const stories = [
    { title: 'The Art of Banarasi Silk', category: 'Heritage', readTime: '5 min', emoji: '📜' },
    { title: 'Block Printing: A centuries-old tradition', category: 'Technique', readTime: '4 min', emoji: '🖌️' },
    { title: 'Preserving the dying art of Bidriware', category: 'Preservation', readTime: '6 min', emoji: '⚱️' },
    { title: 'The Journey of a Banarasi Saree', category: 'Artisan Story', readTime: '7 min', emoji: '👗' },
  ];

  return (
    <div className="min-h-screen bg-amber-50">
      <div className="bg-amber-900 text-white py-20">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="text-4xl font-bold mb-4">Heritage Stories</h1>
          <p className="text-amber-200 text-lg">
            Discover the rich history and traditions behind India&apos;s magnificent crafts
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {stories.map((story, idx) => (
            <article key={idx} className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition">
              <div className="bg-amber-100 h-48 flex items-center justify-center text-7xl">
                {story.emoji}
              </div>
              <div className="p-6">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-xs text-amber-600 font-medium uppercase bg-amber-100 px-2 py-1 rounded">
                    {story.category}
                  </span>
                  <span className="text-xs text-amber-500">{story.readTime} read</span>
                </div>
                <h2 className="text-xl font-bold text-amber-900 mb-2">{story.title}</h2>
                <p className="text-amber-700 line-clamp-3">
                  Explore the fascinating history and cultural significance of this ancient craft tradition...
                </p>
                <Link to="/about/story" className="inline-block mt-4 text-amber-700 hover:text-amber-900 font-medium">
                  Read More →
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}

export default About;
