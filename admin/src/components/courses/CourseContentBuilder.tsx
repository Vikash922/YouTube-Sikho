import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  Video,
  FileText,
  HelpCircle,
  Upload,
  ArrowUp,
  ArrowDown,
  Eye,
  Lock,
  Save,
  Layers,
} from 'lucide-react';
import { Section, Lesson } from '../../types';
import { Button } from '../common/Button';
import { VideoUploadModal } from '../video/VideoUploadModal';

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
  const [activeUploadLesson, setActiveUploadLesson] = useState<{
    sectionId: string;
    lessonId: string;
    title: string;
  } | null>(null);

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

  const handleMoveLesson = (secId: string, idx: number, direction: 'up' | 'down') => {
    onChange(
      sections.map((s) => {
        if (s.id !== secId) return s;
        const list = [...(s.lessons || [])];
        const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
        if (targetIdx < 0 || targetIdx >= list.length) return s;
        const temp = list[idx];
        list[idx] = list[targetIdx];
        list[targetIdx] = temp;
        return { ...s, lessons: list.map((l, i) => ({ ...l, order: i + 1 })) };
      })
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold font-display text-light-text dark:text-dark-text flex items-center gap-2">
            <Layers className="w-5 h-5 text-brand-600 dark:text-brand-400" />
            Curriculum Builder (Sections & Lessons)
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Organize modules, upload videos directly to Bunny Stream, and mark free preview lessons.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleAddSection}>
            <Plus className="w-4 h-4 mr-1" /> Add Section
          </Button>
          <Button variant="primary" size="sm" onClick={onSave} loading={saving}>
            <Save className="w-4 h-4 mr-1" /> Save Curriculum
          </Button>
        </div>
      </div>

      {sections.length === 0 ? (
        <div className="p-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900/30">
          <Layers className="w-10 h-10 text-slate-400 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
            No syllabus modules created yet.
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Click "Add Section" above to start building the curriculum.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {sections.map((sec, secIdx) => (
            <div
              key={sec.id}
              className="p-5 rounded-xl bg-white dark:bg-dark-surface border border-light-border dark:border-dark-border shadow-sm space-y-4"
            >
              {/* Section Header */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-1">
                  <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold flex items-center justify-center">
                    {secIdx + 1}
                  </span>
                  <input
                    type="text"
                    value={sec.title}
                    onChange={(e) => handleUpdateSectionTitle(sec.id, e.target.value)}
                    className="font-bold text-sm text-light-text dark:text-dark-text bg-transparent border-b border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-brand-500 focus:outline-none px-1 py-0.5 w-full"
                    placeholder="Section Title"
                  />
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
                    className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Lessons List in Section */}
              <div className="space-y-2 pl-4 border-l-2 border-slate-100 dark:border-slate-800">
                {(sec.lessons || []).map((les, lesIdx) => (
                  <div
                    key={les.id}
                    className="p-3 rounded-none bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                  >
                    {/* Lesson Title & Type with Sharp Non-Rounded Highlights */}
                    <div className="flex items-center gap-2 flex-1">
                      <span className="px-1.5 py-0.5 rounded-none bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold uppercase tracking-wider text-[10px] flex items-center gap-1 border border-slate-300 dark:border-slate-600">
                        {les.type === 'video' && <Video className="w-3.5 h-3.5 text-brand-500" />}
                        {les.type === 'pdf' && <FileText className="w-3.5 h-3.5 text-amber-500" />}
                        {les.type === 'quiz' && <HelpCircle className="w-3.5 h-3.5 text-emerald-500" />}
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
                    </div>

                    {/* Lesson Meta Controls */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Video specific: Bunny Video GUID input, Duration & Upload */}
                      {les.type === 'video' && (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <input
                            type="text"
                            value={les.videoId || ''}
                            onChange={(e) =>
                              handleUpdateLesson(sec.id, les.id, { videoId: e.target.value.trim() })
                            }
                            placeholder="Bunny Video GUID"
                            className="px-2 py-1 rounded-none bg-white dark:bg-dark-surface border border-slate-300 dark:border-slate-700 text-[11px] w-48 focus:outline-none focus:border-brand-500"
                          />
                          <input
                            type="text"
                            value={les.duration || ''}
                            onChange={(e) =>
                              handleUpdateLesson(sec.id, les.id, { duration: e.target.value })
                            }
                            placeholder="Duration (12:30)"
                            className="px-2 py-1 rounded-none bg-white dark:bg-dark-surface border border-slate-300 dark:border-slate-700 text-[11px] w-24 focus:outline-none focus:border-brand-500"
                          />

                          <button
                            type="button"
                            onClick={() =>
                              setActiveUploadLesson({
                                sectionId: sec.id,
                                lessonId: les.id,
                                title: les.title,
                              })
                            }
                            className="px-2.5 py-1 rounded-none bg-brand-50 hover:bg-brand-100 dark:bg-brand-950/60 dark:hover:bg-brand-900/60 text-brand-600 dark:text-brand-400 font-bold uppercase tracking-wider border border-brand-500/30 flex items-center gap-1 text-[10px] transition-colors"
                          >
                            <Upload className="w-3 h-3" />
                            <span>Upload to Bunny</span>
                          </button>

                          {les.videoId && (les.videoId.includes('youtube.com') || les.videoId.includes('youtu.be')) && (
                            <span className="text-[10px] text-amber-500 font-semibold px-2 py-0.5 bg-amber-500/10 rounded">
                              ⚠️ YouTube link detected (deprecated). Please upload via Bunny Stream.
                            </span>
                          )}
                        </div>
                      )}

                      {/* PDF Specific URL input */}
                      {les.type === 'pdf' && (
                        <input
                          type="text"
                          value={les.videoId || ''}
                          onChange={(e) =>
                            handleUpdateLesson(sec.id, les.id, { videoId: e.target.value })
                          }
                          placeholder="PDF document URL"
                          className="px-2 py-1 rounded-none bg-white dark:bg-dark-surface border border-slate-300 dark:border-slate-700 text-[11px] w-36"
                        />
                      )}

                      {/* Free Preview Toggle with Non-Rounded Highlight */}
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
                    <Plus className="w-3 h-3 text-amber-500" /> PDF Note
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Video Upload Modal */}
      {activeUploadLesson && (
        <VideoUploadModal
          isOpen={true}
          onClose={() => setActiveUploadLesson(null)}
          lessonTitle={activeUploadLesson.title}
          onUploadSuccess={({ videoId, duration }) => {
            handleUpdateLesson(activeUploadLesson.sectionId, activeUploadLesson.lessonId, {
              videoId,
              duration,
            });
            setActiveUploadLesson(null);
          }}
        />
      )}
    </div>
  );
};
