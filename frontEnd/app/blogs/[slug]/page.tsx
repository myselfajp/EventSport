"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { CalendarDays, Share2, User } from "lucide-react";
import Header from "@/components/Header";
import LeftSidebar from "@/components/LeftSidebar";
import RightSidebar from "@/components/RightSidebar";
import ShareBlogDialog from "@/components/blog/ShareBlogDialog";
import { fetchJSON } from "@/app/lib/api";
import { EP } from "@/app/lib/endpoints";
import type { BlogSharePayload } from "@/app/lib/blog-share";

type BlogPost = {
  _id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImage?: { path?: string } | null;
  sportGroup?: { _id: string; name: string } | null;
  sport?: { _id: string; name: string } | null;
  author?: { name: string; type: "admin" | "coach"; coachId?: string | null };
  publishedAt?: string;
};

type RecommendedBlog = {
  _id: string;
  title: string;
  slug: string;
  excerpt: string;
  coverImage?: { path?: string } | null;
  author?: { name: string; type: "admin" | "coach"; coachId?: string | null };
  publishedAt?: string;
};

function formatDate(value?: string) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

function AuthorLink({
  author,
}: {
  author?: BlogPost["author"];
}) {
  const name = author?.name || "EventSport";

  if (author?.type === "coach" && author.coachId) {
    return (
      <Link
        href={`/blogs?coach=${encodeURIComponent(author.coachId)}`}
        className="font-medium text-cyan-700 dark:text-cyan-300 hover:underline"
      >
        {name}
      </Link>
    );
  }

  return <span>{name}</span>;
}

export default function BlogDetailPage() {
  const params = useParams();
  const slug = typeof params.slug === "string" ? params.slug : "";
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(false);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarView, setCalendarView] = useState("month");
  const [blog, setBlog] = useState<BlogPost | null>(null);
  const [recommended, setRecommended] = useState<RecommendedBlog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showShareDialog, setShowShareDialog] = useState(false);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const [blogRes, recommendedRes] = await Promise.all([
          fetchJSON(EP.PUBLIC.blogBySlug(slug), { method: "GET" }, { skipAuth: true }),
          fetchJSON(
            EP.PUBLIC.blogs({ page: 1, limit: 6, excludeSlug: slug }),
            { method: "GET" },
            { skipAuth: true }
          ),
        ]);
        if (cancelled) return;
        if (blogRes?.success && blogRes.data) {
          setBlog(blogRes.data);
        } else {
          setBlog(null);
          setError(blogRes?.message || blogRes?.error || "Blog post not found");
        }
        if (recommendedRes?.success && Array.isArray(recommendedRes.data)) {
          setRecommended(recommendedRes.data);
        } else {
          setRecommended([]);
        }
      } catch (err) {
        if (!cancelled) {
          setBlog(null);
          setRecommended([]);
          setError(err instanceof Error ? err.message : "Blog post not found");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const sharePayload: BlogSharePayload | null = useMemo(
    () =>
      blog
        ? {
            slug: blog.slug,
            title: blog.title,
            authorName: blog.author?.name || "EventSport",
          }
        : null,
    [blog]
  );

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900 overflow-hidden transition-colors duration-300">
      <LeftSidebar isOpen={leftSidebarOpen} />
      <div className="flex-1 flex flex-col min-h-0">
        <Header
          onLeftSidebarToggle={() => setLeftSidebarOpen(!leftSidebarOpen)}
          onRightSidebarToggle={() => setRightSidebarOpen(!rightSidebarOpen)}
        />

        <main className="flex-1 overflow-auto">
          <div className="max-w-7xl mx-auto p-4 sm:p-6">
            <Link
              href="/blogs"
              className="inline-flex items-center px-3 py-2 text-sm font-medium rounded-lg border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors mb-6"
            >
              Back to blogs
            </Link>

            {loading ? (
              <div className="py-20 text-center text-gray-500 dark:text-slate-400">
                Loading blog post...
              </div>
            ) : error || !blog ? (
              <div className="py-20 text-center rounded-xl border border-dashed border-gray-300 dark:border-slate-700 text-gray-500 dark:text-slate-400">
                {error || "Blog post not found"}
              </div>
            ) : (
              <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
                <article className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
                  {blog.coverImage?.path && (
                    <div className="aspect-[16/7] bg-gray-100 dark:bg-slate-700">
                      <img
                        src={EP.assetUrl(blog.coverImage.path)}
                        alt={blog.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  <div className="p-5 sm:p-8 space-y-6">
                    <div className="space-y-4">
                      <div className="flex flex-wrap gap-2 text-xs">
                        {blog.sportGroup?.name && (
                          <span className="px-2 py-1 rounded bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300">
                            {blog.sportGroup.name}
                          </span>
                        )}
                        {blog.sport?.name && (
                          <span className="px-2 py-1 rounded bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300">
                            {blog.sport.name}
                          </span>
                        )}
                      </div>

                      <h1 className="text-3xl sm:text-4xl font-bold text-gray-950 dark:text-white leading-tight">
                        {blog.title}
                      </h1>

                      <p className="text-lg text-gray-600 dark:text-slate-300 leading-relaxed">
                        {blog.excerpt}
                      </p>

                      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-gray-500 dark:text-slate-400">
                        <span className="inline-flex items-center gap-1.5">
                          <User className="w-4 h-4" />
                          <AuthorLink author={blog.author} />
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <CalendarDays className="w-4 h-4" />
                          {formatDate(blog.publishedAt)}
                        </span>
                      </div>
                    </div>

                    <div className="border-t border-gray-200 dark:border-slate-700 pt-6">
                      <div className="prose prose-slate dark:prose-invert max-w-none whitespace-pre-wrap text-gray-800 dark:text-slate-100 leading-8">
                        {blog.content}
                      </div>
                    </div>

                    <div className="border-t border-gray-200 dark:border-slate-700 pt-6">
                      <button
                        type="button"
                        onClick={() => setShowShareDialog(true)}
                        className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-700 rounded-lg transition-colors"
                      >
                        <Share2 className="w-4 h-4" />
                        Share blog
                      </button>
                    </div>
                  </div>
                </article>

                <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
                  <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                      Recommended blogs
                    </h2>
                    {recommended.length === 0 ? (
                      <p className="text-sm text-gray-500 dark:text-slate-400">
                        No other blogs to show right now.
                      </p>
                    ) : (
                      <ul className="space-y-4">
                        {recommended.map((item) => {
                          const coverUrl = item.coverImage?.path
                            ? EP.assetUrl(item.coverImage.path)
                            : "";
                          return (
                            <li key={item._id}>
                              <Link
                                href={`/blogs/${item.slug}`}
                                className="group flex gap-3 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/50 p-2 -mx-2 transition-colors"
                              >
                                <div className="w-20 h-16 rounded-lg overflow-hidden bg-gray-100 dark:bg-slate-700 shrink-0">
                                  {coverUrl ? (
                                    <img
                                      src={coverUrl}
                                      alt={item.title}
                                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">
                                      Blog
                                    </div>
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-2 group-hover:text-cyan-700 dark:group-hover:text-cyan-300">
                                    {item.title}
                                  </h3>
                                  <p className="mt-1 text-xs text-gray-500 dark:text-slate-400 line-clamp-2">
                                    {item.excerpt}
                                  </p>
                                  <p className="mt-1 text-xs text-gray-400 dark:text-slate-500">
                                    {item.author?.name || "EventSport"}
                                  </p>
                                </div>
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                    <Link
                      href="/blogs"
                      className="mt-4 inline-flex text-sm font-medium text-cyan-700 dark:text-cyan-300 hover:underline"
                    >
                      View all blogs
                    </Link>
                  </div>

                  {blog.author?.type === "coach" && blog.author.coachId && (
                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
                      <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                        More from this coach
                      </h2>
                      <p className="text-sm text-gray-600 dark:text-slate-400 mb-3">
                        Explore other articles written by {blog.author.name}.
                      </p>
                      <Link
                        href={`/blogs?coach=${encodeURIComponent(blog.author.coachId)}`}
                        className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-700 rounded-lg transition-colors"
                      >
                        View coach blogs
                      </Link>
                    </div>
                  )}
                </aside>
              </div>
            )}
          </div>
        </main>
      </div>
      <RightSidebar
        isOpen={rightSidebarOpen}
        currentDate={currentDate}
        setCurrentDate={setCurrentDate}
        calendarView={calendarView}
        setCalendarView={setCalendarView}
        events={[]}
      />

      <ShareBlogDialog
        isOpen={showShareDialog}
        onClose={() => setShowShareDialog(false)}
        payload={sharePayload}
      />
    </div>
  );
}
