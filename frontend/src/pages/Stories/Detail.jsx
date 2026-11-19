import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Loading, ErrorState } from '../../components/admin/AdminShell';
import { errMsg } from '../../components/Toast';
import { craftStoryService } from '../../services/craftStoryService';
import ProductImage from '../../components/product/ProductImage';

const formatDate = (value) =>
  new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

function StoryDetail() {
  const { slug } = useParams();
  const [story, setStory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await craftStoryService.getBySlug(slug);
      setStory(res.data.story);
    } catch (err) {
      setError(errMsg(err, 'Failed to load this story'));
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="min-h-screen bg-cream py-12">
        <div className="max-w-3xl mx-auto px-4">
          <Loading />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-cream py-12">
        <div className="max-w-3xl mx-auto px-4">
          <ErrorState message={error} />
          <div className="text-center mt-4">
            <button onClick={load} className="px-4 py-2 bg-terracotta text-white rounded-sm text-sm">
              Retry
            </button>
            <Link to="/stories" className="block mt-3 text-terracotta-dark hover:text-ink text-sm">
              ← All stories
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!story) return null;

  const paragraphs = (story.content || '').split(/\n\s*\n/).filter(Boolean);

  return (
    <article className="min-h-screen bg-cream py-12">
      <div className="max-w-3xl mx-auto px-4">
        <Link to="/stories" className="text-terracotta-dark hover:text-ink text-sm">
          ← All stories
        </Link>

        <div className="bg-white rounded-sm border border-ink/10 overflow-hidden mt-4">
          <div className="bg-parchment h-56 flex items-center justify-center text-7xl overflow-hidden">
            {story.coverImage ? (
              <ProductImage
              src={story.coverImage}
              alt={story.title}
              frame="h-full w-full"
              w={960}
              h={540}
            />
            ) : (
              <span>📜</span>
            )}
          </div>

          <div className="p-8">
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <span className="text-xs text-ink-soft font-medium uppercase bg-parchment px-2 py-1 rounded">
                {story.category}
              </span>
              {story.craftType && (
                <span className="text-xs text-terracotta-dark bg-cream px-2 py-1 rounded border border-ink/10">
                  {story.craftType}
                </span>
              )}
              {story.region && (
                <span className="text-xs text-terracotta-dark bg-cream px-2 py-1 rounded border border-ink/10">
                  📍 {story.region}
                </span>
              )}
              {story.readTime && (
                <span className="text-xs text-ink-faint">{story.readTime} min read</span>
              )}
              {(story.publishedAt || story.createdAt) && (
                <span className="text-xs text-ink-faint">
                  {formatDate(story.publishedAt || story.createdAt)}
                </span>
              )}
            </div>

            <h1 className="text-3xl font-bold text-ink mb-6">{story.title}</h1>

            {story.excerpt && (
              <p className="text-lg text-terracotta-dark mb-6 border-l-4 border-ink/15 pl-4">
                {story.excerpt}
              </p>
            )}

            <div className="space-y-5 text-ink-soft leading-relaxed">
              {paragraphs.map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>

            {story.tags?.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-8 pt-6 border-t border-ink/10">
                {story.tags.map((tag) => (
                  <span key={tag} className="text-xs bg-parchment text-ink-soft px-2 py-1 rounded-full">
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="text-center mt-8">
          <Link
            to="/stories"
            className="inline-block bg-terracotta text-white px-6 py-3 rounded-sm font-semibold hover:bg-terracotta-dark transition"
          >
            More Craft Stories
          </Link>
        </div>
      </div>
    </article>
  );
}

export default StoryDetail;
