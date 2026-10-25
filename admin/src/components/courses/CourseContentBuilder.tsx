import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  Video,
  FileText,
  ArrowUp,
  ArrowDown,
  Eye,
  Lock,
  Save,
  Layers,
  RefreshCw,
  AlertTriangle,
  Play,
  X,
  Loader2,
} from 'lucide-react';
import { Section, Lesson } from '../../types';
import { Button } from '../common/Button';
import { functions, httpsCallable } from '../../firebase';

interface CourseContentBuilderProps {
  sections: Section[];
  onChange: (sections: Section[]) => void;
  onSave: () => Promise<void>;
  saving: boolean;
}

export const CourseContentBuilder: React.FC<CourseContentBuilderProps> = ({
  sections,
  onChange,
  onSave,
  saving,
}) => {
  // Validation & Preview States
  const [validatingLessonId, setValidatingLessonId] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [validationWarnings, setValidationWarnings] = useState<Record<string, string>>({});
  const [previewVideoId, setPreviewVideoId] = useState<string | null>(null);

  // Section Handlers
  const handleAddSection = () => {
    const newSection: Section = {
      id: `sec_${Date.now()}`,
      title: `Module ${sections.length + 1}: New Section`,
      order: sections.length + 1,
      lessons: [],
    };
    onChange([...sections, newSection]);
  };

  const handleDeleteSection = (secId: string) => {
    if (!window.confirm('Delete this entire section and its lessons?')) return;
    onChange(sections.filter((s) => s.id !== secId));
  };

  const handleUpdateSectionTitle = (secId: string, title: string) => {
    onChange(
      sections.map((s) => (s.id === secId ? { ...s, title } : s))
    );
  };

  const handleMoveSection = (idx: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= sections.length) return;
    const copy = [...sections];
    const temp = copy[idx];
    copy[idx] = copy[targetIdx];
    copy[targetIdx] = temp;
    onChange(copy.map((s, i) => ({ ...s, order: i + 1 })));
  };

  // Lesson Handlers
  const handleAddLesson = (secId: string, type: 'video' | 'pdf' | 'quiz') => {
    onChange(
      sections.map((s) => {
        if (s.id !== secId) return s;
        const currentLessons = s.lessons || [];
        const newLesson: Lesson = {
          id: `les_${Date.now()}`,
          title: `New ${type.toUpperCase()} Lesson`,
          type,
          videoId: '',
          duration: type === 'video' ? '00:00' : undefined,
          order: currentLessons.length + 1,
          isFreePreview: currentLessons.length === 0, // default first lesson free
          hasMedia: false,
          provider: 'youtube',
        };
        return { ...s, lessons: [...currentLessons, newLesson] };
      })
    );
  };

  const handleDeleteLesson = (secId: string, lesId: string) => {
    onChange(
      sections.map((s) => {
        if (s.id !== secId) return s;
        return {
          ...s,
          lessons: (s.lessons || []).filter((l) => l.id !== lesId),
        };
      })
    );
  };

  const handleUpdateLesson = (
    secId: string,
    lesId: string,
    updates: Partial<Lesson>
  ) => {
    onChange(
      sections.map((s) => {
        if (s.id !== secId) return s;
        return {
          ...s,
          lessons: (s.lessons || []).map((l) =>
            l.id === lesId ? { ...l, ...updates } : l
          ),
        };
      })
    );
  };

  const handleMoveLesson = (
    secId: string,
    lesIdx: number,
    direction: 'up' | 'down'
  ) => {
    const targetIdx = direction === 'up' ? lesIdx - 1 : lesIdx + 1;
    onChange(
      sections.map((s) => {
        if (s.id !== secId) return s;
        const lessons = [...(s.lessons || [])];
        if (targetIdx < 0 || targetIdx >= lessons.length) return s;
        const temp = lessons[lesIdx];
        lessons[lesIdx] = lessons[targetIdx];
        lessons[targetIdx] = temp;
        return {
          ...s,
          lessons: lessons.map((l, i) => ({ ...l, order: i + 1 })),
        };
      })
    );
  };

  // Format integer seconds to mm:ss or hh:mm:ss
  const formatSeconds = (sec: number): string => {
    if (!sec || isNaN(sec)) return '00:00';
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (h > 0) {
      return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    }
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Validate YouTube Video Link via Callable Cloud Function
  const handleValidateYoutubeLink = async (secId: string, les: Lesson, inputUrl: string) => {
    const rawUrl = (inputUrl || les.videoId || '').trim();
    if (!rawUrl) return;

    setValidatingLessonId(les.id);
    setValidationErrors((prev) => {
      const copy = { ...prev };
      delete copy[les.id];
      return copy;
    });
    setValidationWarnings((prev) => {
      const copy = { ...prev };
      delete copy[les.id];
      return copy;
    });

    try {
      const validateCallable = httpsCallable<{ url: string }, any>(
        functions,
        'validateYoutubeVideo'
      );
      const res = await validateCallable({ url: rawUrl });
      const data = res.data;

      // 1. Refuse Private videos
      if (data.privacyStatus === 'private') {
        setValidationErrors((prev) => ({
          ...prev,
          [les.id]: 'Private videos cannot be embedded in apps or viewed by students. Please change video visibility to "Unlisted" in YouTube Studio.',
        }));
        setValidatingLessonId(null);
        return;
      }

      // 2. Refuse Embedding Disabled
      if (data.embeddable === false) {
        setValidationErrors((prev) => ({
          ...prev,
          [les.id]: 'Embedding is disabled for this video. Turn on "Allow embedding" in YouTube Studio under Video Details > Show more > License.',
        }));
        setValidatingLessonId(null);
        return;
      }

      // 3. Warnings
      if (data.privacyStatus === 'public') {
        setValidationWarnings((prev) => ({
          ...prev,
          [les.id]: 'Warning: This video is Public on YouTube and can be watched by anyone for free outside the app. Set to "Unlisted" for course exclusivity.',
        }));
      } else if (data.madeForKids) {
        setValidationWarnings((prev) => ({
          ...prev,
          [les.id]: 'Note: Video is marked "Made for kids". Embedded autoplay & controls behavior differs on YouTube.',
        }));
      }

      // Update lesson with validated data
      const durationStr = data.durationSeconds ? formatSeconds(data.durationSeconds) : les.duration || '00:00';
      handleUpdateLesson(secId, les.id, {
        videoId: data.videoId,
        title: les.title === `New VIDEO Lesson` ? data.title : les.title,
        duration: durationStr,
        durationSeconds: data.durationSeconds,
        thumbnailUrl: data.thumbnailUrl,
        privacyStatus: data.privacyStatus,
        embeddable: data.embeddable,
        madeForKids: data.madeForKids,
        hasMedia: true,
        provider: 'youtube',
      });
    } catch (err: any) {
      setValidationErrors((prev) => ({
        ...prev,
        [les.id]: err.message || 'Failed to validate YouTube link. Check URL format and try again.',
      }));
    } finally {
      setValidatingLessonId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Save Toolbar */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-4 h-4 text-brand-500" /> Course Curriculum & Lessons
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Organize modules, manage YouTube unlisted video lessons, and mark free preview lessons.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleAddSection}
            icon={<Plus className="w-3.5 h-3.5" />}
          >
            Add Module
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={onSave}
            loading={saving}
            icon={<Save className="w-3.5 h-3.5" />}
          >
            Save Changes
          </Button>
        </div>
      </div>

      {/* Sections List */}
      {sections.length === 0 ? (
        <div className="p-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-none bg-slate-50/50 dark:bg-slate-900/50">
          <Layers className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-50" />
          <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">No Course Modules Yet</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            Get started by adding your first module to organize lessons, quizzes, and study resources.
          </p>
          <button
            onClick={handleAddSection}
            className="mt-4 px-3 py-1.5 bg-brand-500 hover:bg-brand-600 text-white font-bold uppercase tracking-wider text-xs rounded-none transition-colors"
          >
            + Create First Module
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {sections.map((sec, secIdx) => (
            <div
              key={sec.id}
              className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-dark-surface shadow-sm rounded-none"
            >
              {/* Section Header */}
              <div className="p-3 bg-slate-50/70 dark:bg-slate-900/70 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-1">
                  <span className="text-xs font-mono font-bold text-slate-400">
                    #{sec.order || secIdx + 1}
                  </span>
                  <input
                    type="text"
                    value={sec.title}
                    onChange={(e) => handleUpdateSectionTitle(sec.id, e.target.value)}
                    className="font-bold text-sm text-slate-900 dark:text-slate-100 bg-transparent border-b border-transparent hover:border-slate-300 dark:hover:border-slate-600 focus:border-brand-500 focus:outline-none px-1.5 py-0.5 flex-1"
                  />
                  <span className="text-[10px] font-mono text-slate-400 bg-slate-200/60 dark:bg-slate-800 px-1.5 py-0.5 rounded-none">
                    {(sec.lessons || []).length} lessons
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleMoveSection(secIdx, 'up')}
                    disabled={secIdx === 0}
                    className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 disabled:opacity-30"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleMoveSection(secIdx, 'down')}
                    disabled={secIdx === sections.length - 1}
                    className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 disabled:opacity-30"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteSection(sec.id)}
                    className="p-1 text-rose-500 hover:text-rose-700 ml-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Lessons List in Section */}
              <div className="p-3 space-y-2.5">
                {(sec.lessons || []).map((les, lesIdx) => (
                  <div
                    key={les.id}
                    className="p-2.5 border border-slate-100 dark:border-slate-800/80 bg-slate-50/40 dark:bg-slate-900/30 rounded-none space-y-2"
                  >
                    {/* Top Row: Type, Title, Controls */}
                    <div className="flex items-center gap-2">
                      <span
                        className={`p-1 text-[10px] font-bold uppercase tracking-wider rounded-none flex items-center gap-1 ${
                          les.type === 'video'
                            ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400'
                            : les.type === 'pdf'
                            ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400'
                            : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400'
                        }`}
                      >
                        {les.type === 'video' ? <Video className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
                        <span>{les.type}</span>
                      </span>
                      <input
                        type="text"
                        value={les.title}
                        onChange={(e) =>
                          handleUpdateLesson(sec.id, les.id, { title: e.target.value })
                        }
                        className="font-semibold text-slate-900 dark:text-slate-100 bg-transparent border-b border-transparent hover:border-slate-300 dark:hover:border-slate-600 focus:border-brand-500 focus:outline-none px-1.5 py-0.5 flex-1"
                      />

                      {/* Free Preview Toggle */}
                      <button
                        type="button"
                        onClick={() =>
                          handleUpdateLesson(sec.id, les.id, {
                            isFreePreview: !les.isFreePreview,
                          })
                        }
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-none text-[10px] font-bold uppercase tracking-wider border transition-colors ${
                          les.isFreePreview
                            ? 'bg-amber-100/80 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-500/50'
                            : 'bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700'
                        }`}
                      >
                        {les.isFreePreview ? (
                          <>
                            <Eye className="w-3 h-3 text-amber-600 dark:text-amber-400" /> Free Preview
                          </>
                        ) : (
                          <>
                            <Lock className="w-3 h-3" /> Locked
                          </>
                        )}
                      </button>

                      {/* Move & Delete */}
                      <div className="flex items-center">
                        <button
                          onClick={() => handleMoveLesson(sec.id, lesIdx, 'up')}
                          disabled={lesIdx === 0}
                          className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 disabled:opacity-30"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleMoveLesson(sec.id, lesIdx, 'down')}
                          disabled={lesIdx === (sec.lessons || []).length - 1}
                          className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 disabled:opacity-30"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteLesson(sec.id, les.id)}
                          className="p-1 text-rose-500 hover:text-rose-700 ml-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Video Row: YouTube Link input, Duration & Actions */}
                    {les.type === 'video' && (
                      <div className="space-y-2 pt-1 border-t border-slate-200/50 dark:border-slate-800/50">
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="flex items-center gap-1 flex-1 min-w-[280px]">
                            <input
                              type="text"
                              value={les.videoId || ''}
                              onChange={(e) =>
                                handleUpdateLesson(sec.id, les.id, { videoId: e.target.value.trim() })
                              }
                              placeholder="Paste YouTube Link (e.g. https://youtu.be/... or watch?v=...)"
                              className="px-2.5 py-1.5 rounded-none bg-white dark:bg-dark-surface border border-slate-300 dark:border-slate-700 text-xs flex-1 focus:outline-none focus:border-brand-500 font-mono"
                            />
                            <button
                              type="button"
                              onClick={() => handleValidateYoutubeLink(sec.id, les, les.videoId || '')}
                              disabled={!les.videoId || validatingLessonId === les.id}
                              className="px-3 py-1.5 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white text-[11px] font-bold uppercase tracking-wider rounded-none flex items-center gap-1 transition-colors"
                            >
                              {validatingLessonId === les.id ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  <span>Checking...</span>
                                </>
                              ) : (
                                <>
                                  <RefreshCw className="w-3.5 h-3.5" />
                                  <span>{les.hasMedia ? 'Check Again' : 'Validate'}</span>
                                </>
                              )}
                            </button>
                          </div>

                          <input
                            type="text"
                            value={les.duration || ''}
                            onChange={(e) =>
                              handleUpdateLesson(sec.id, les.id, { duration: e.target.value })
                            }
                            placeholder="Duration (12:30)"
                            className="px-2 py-1.5 rounded-none bg-white dark:bg-dark-surface border border-slate-300 dark:border-slate-700 text-xs w-24 focus:outline-none focus:border-brand-500 font-mono text-center"
                          />

                          {les.videoId && (
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setPreviewVideoId(les.videoId || '')}
                                className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-[11px] font-bold uppercase tracking-wider rounded-none flex items-center gap-1"
                              >
                                <Play className="w-3.5 h-3.5" /> Preview
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  handleUpdateLesson(sec.id, les.id, {
                                    videoId: '',
                                    hasMedia: false,
                                    thumbnailUrl: undefined,
                                  })
                                }
                                className="px-2.5 py-1.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-[11px] font-bold uppercase tracking-wider border border-rose-300 dark:border-rose-800 rounded-none"
                              >
                                Replace Video
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Error Message */}
                        {validationErrors[les.id] && (
                          <div className="flex items-start gap-1.5 p-2 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs">
                            <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                            <span>{validationErrors[les.id]}</span>
                          </div>
                        )}

                        {/* Warning Message */}
                        {validationWarnings[les.id] && (
                          <div className="flex items-start gap-1.5 p-2 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-300 text-xs">
                            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                            <span>{validationWarnings[les.id]}</span>
                          </div>
                        )}

                        {/* Validated YouTube Video Preview Pill */}
                        {les.hasMedia && les.videoId && (
                          <div className="flex items-center gap-2 p-1.5 bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs">
                            {les.thumbnailUrl ? (
                              <img
                                src={les.thumbnailUrl}
                                alt="Thumbnail"
                                className="w-12 h-8 object-cover rounded-none border border-slate-300 dark:border-slate-700 shrink-0"
                              />
                            ) : null}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-[10px] text-slate-500">ID: {les.videoId}</span>
                                <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold text-[9px] uppercase">
                                  {les.privacyStatus || 'UNLISTED'}
                                </span>
                                {les.embeddable !== false && (
                                  <span className="px-1.5 py-0.2 bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 font-bold text-[9px] uppercase">
                                    Embeddable
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] font-medium text-slate-700 dark:text-slate-300 truncate mt-0.5">
                                {les.title} • {les.duration || '00:00'}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* PDF Specific URL input */}
                    {les.type === 'pdf' && (
                      <div className="pt-1 border-t border-slate-200/50 dark:border-slate-800/50">
                        <input
                          type="text"
                          value={les.pdfUrl || ''}
                          onChange={(e) =>
                            handleUpdateLesson(sec.id, les.id, { pdfUrl: e.target.value.trim() })
                          }
                          placeholder="PDF Document URL / Storage Path"
                          className="px-2.5 py-1.5 rounded-none bg-white dark:bg-dark-surface border border-slate-300 dark:border-slate-700 text-xs w-full font-mono"
                        />
                      </div>
                    )}
                  </div>
                ))}

                {/* Add Lesson Buttons */}
                <div className="flex items-center gap-2 pt-2">
                  <button
                    onClick={() => handleAddLesson(sec.id, 'video')}
                    className="px-3 py-1.5 rounded-none bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-[10px] border border-slate-200 dark:border-slate-700 flex items-center gap-1 transition-colors"
                  >
                    <Plus className="w-3 h-3 text-brand-500" /> Video Lesson
                  </button>
                  <button
                    onClick={() => handleAddLesson(sec.id, 'pdf')}
                    className="px-3 py-1.5 rounded-none bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-[10px] border border-slate-200 dark:border-slate-700 flex items-center gap-1 transition-colors"
                  >
                    <Plus className="w-3 h-3 text-blue-500" /> PDF Lesson
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Embedded YouTube IFrame Preview Modal (Admin verification) */}
      {previewVideoId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-white dark:bg-dark-surface border border-slate-200 dark:border-slate-800 w-full max-w-2xl rounded-none overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Play className="w-4 h-4 text-brand-500" /> Official YouTube IFrame Player Preview
              </h4>
              <button
                onClick={() => setPreviewVideoId(null)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="relative pt-[56.25%] bg-black">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${previewVideoId}?autoplay=1&rel=0&playsinline=1&modestbranding=1`}
                title="Lesson Preview"
                className="absolute inset-0 w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-900 flex items-center justify-between text-xs text-slate-500">
              <span>Domain: <code className="font-mono text-slate-700 dark:text-slate-300">youtube-nocookie.com</code></span>
              <button
                onClick={() => setPreviewVideoId(null)}
                className="px-3 py-1 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold uppercase text-[10px]"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
