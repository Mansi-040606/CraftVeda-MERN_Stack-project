import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loading, ErrorState, EmptyState, Pager } from '../../components/admin/AdminShell';
import { toast, errMsg } from '../../components/Toast';
import { craftStoryService } from '../../services/craftStoryService';

const formatDate = (value) =>
  new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

function Stories() {
  const [stories, setStories] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await craftStoryService.getAll({ page, limit: 12 });
      setStories(res.data.stories || []);
      setPages(res.data.pages || 0);
      setTotal(res.data.total || 0);
    } catch (err) {
      const message = errMsg(err, 'Failed to load stories');
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="min-h-screen bg-amber-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-amber-900 mb-4">Craft Stories</h1>
          <p className="text-amber-700 max-w-2xl mx-auto">
            The history, technique and people behind India&apos;s traditional crafts — written by the
            artisan community on CraftVeda.
          </p>
        </div>

        {loading && <Loading />}
        {!loading && error && (
          <div>
            <ErrorState message={error} />
            <div className="text-center mt-4">
              <button onClick={load} className="px-4 py-2 bg-amber-700 text-white rounded-lg text-sm">
                Retry
              </button>
            </div>
          </div>
        )}
        {!loading && !error && stories.length === 0 && (
          <EmptyState message="No stories published yet." />
        )}

        {!loading && !error && stories.length > 0 && (
          <>
            <p className="text-sm text-amber-600 mb-4">{total} stor{total === 1 ? 'y' : 'ies'}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {stories.map((story) => (
                <Link
                  key={story._id}
                  to={`/stories/${story.slug}`}
                  className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition flex flex-col"
                >
                  <div className="bg-amber-100 h-40 flex items-center justify-center text-5xl overflow-hidden">
                    {story.coverImage ? (
                      <img src={story.coverImage} alt={story.title} className="w-full h-full object-cover" />
                    ) : (
                      <span>📜</span>
                    )}
                  </div>
                  <div className="p-6 flex flex-col flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-xs text-amber-600 font-medium uppercase bg-amber-100 px-2 py-1 rounded">
                        {story.category}
                      </span>
                      {story.readTime ? (
                        <span className="text-xs text-amber-500">{story.readTime} min read</span>
                      ) : null}
                    </div>
                    <h2 className="text-lg font-bold text-amber-900 mb-2">{story.title}</h2>
                    <p className="text-sm text-amber-700 line-clamp-3 flex-1">
                      {story.excerpt || story.content}
                    </p>
                    <div className="flex items-center justify-between mt-4 text-xs text-amber-600">
                      <span>
                        {[story.region, story.craftType].filter(Boolean).join(' · ')}
                      </span>
                      {story.publishedAt && <span>{formatDate(story.publishedAt)}</span>}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}

        <Pager page={page} pages={pages} onChange={setPage} />
      </div>
    </div>
  );
}

export default Stories;
