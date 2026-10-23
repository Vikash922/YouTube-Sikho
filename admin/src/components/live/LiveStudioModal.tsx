import React, { useState, useEffect, useRef } from 'react';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Monitor,
  X,
  Radio,
  Users,
  Send,
  MessageSquare,
  Sparkles,
  StopCircle,
} from 'lucide-react';
import {
  doc,
  updateDoc,
  collection,
  onSnapshot,
  addDoc,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../firebase';
import { Button } from '../common/Button';

interface LiveStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  liveClass: {
    id: string;
    title: string;
    viewerCount?: number;
    courseTitle?: string;
  };
}

interface ChatMessage {
  id: string;
  userName: string;
  text: string;
  createdAt?: any;
  isAdmin?: boolean;
}

export const LiveStudioModal: React.FC<LiveStudioModalProps> = ({
  isOpen,
  onClose,
  liveClass,
}) => {
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [viewers, setViewers] = useState(liveClass.viewerCount || 1);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [streamError, setStreamError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const currentStreamRef = useRef<MediaStream | null>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // 1. Initialize Camera and Microphone when Studio opens
  useEffect(() => {
    if (!isOpen) return;

    let active = true;

    const startMedia = async () => {
      try {
        setStreamError(null);
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
          audio: true,
        });

        if (!active) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        currentStreamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        // Mark class status as live in Firestore
        await updateDoc(doc(db, 'liveClasses', liveClass.id), {
          status: 'live',
          streamProvider: 'studio',
          streamUrl: 'studio',
          updatedAt: serverTimestamp(),
        });
      } catch (err: any) {
        console.error('Camera/Mic access error:', err);
        setStreamError(
          err.message || 'Could not access Camera/Microphone. Please grant camera permissions.'
        );
      }
    };

    startMedia();

    // 2. Real-time listener for Live Class (viewers count)
    const unsubClass = onSnapshot(doc(db, 'liveClasses', liveClass.id), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setViewers(data.viewerCount || 1);
      }
    });

    // 3. Real-time listener for Chat Messages
    const chatRef = collection(db, 'liveClasses', liveClass.id, 'chat');
    const q = query(chatRef, orderBy('createdAt', 'asc'));
    const unsubChat = onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map(
          (d) => ({ id: d.id, ...d.data() } as ChatMessage)
        );
        setMessages(list);
        setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      },
      (err) => {
        console.warn('Studio chat error:', err);
      }
    );

    return () => {
      active = false;
      unsubClass();
      unsubChat();
      // Stop all tracks on cleanup
      if (currentStreamRef.current) {
        currentStreamRef.current.getTracks().forEach((t) => t.stop());
        currentStreamRef.current = null;
      }
    };
  }, [isOpen, liveClass.id]);

  if (!isOpen) return null;

  // Toggle Microphone
  const toggleMic = () => {
    if (currentStreamRef.current) {
      const audioTracks = currentStreamRef.current.getAudioTracks();
      audioTracks.forEach((t) => {
        t.enabled = !micEnabled;
      });
      setMicEnabled(!micEnabled);
    }
  };

  // Toggle Camera
  const toggleCamera = () => {
    if (currentStreamRef.current) {
      const videoTracks = currentStreamRef.current.getVideoTracks();
      videoTracks.forEach((t) => {
        t.enabled = !cameraEnabled;
      });
      setCameraEnabled(!cameraEnabled);
    }
  };

  // Toggle Screen Share
  const handleToggleScreenShare = async () => {
    try {
      if (!isScreenSharing) {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        });

        const screenTrack = screenStream.getVideoTracks()[0];
        screenTrack.onended = () => {
          revertToCamera();
        };

        if (videoRef.current) {
          videoRef.current.srcObject = screenStream;
        }

        currentStreamRef.current = screenStream;
        setIsScreenSharing(true);
      } else {
        revertToCamera();
      }
    } catch (err: any) {
      console.warn('Screen share error/cancelled:', err);
    }
  };

  const revertToCamera = async () => {
    try {
      if (currentStreamRef.current) {
        currentStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      const camStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      });
      currentStreamRef.current = camStream;
      if (videoRef.current) {
        videoRef.current.srcObject = camStream;
      }
      setIsScreenSharing(false);
      setCameraEnabled(true);
      setMicEnabled(true);
    } catch (err) {
      console.error('Revert to camera error:', err);
    }
  };

  // Send message in chat
  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    try {
      await addDoc(collection(db, 'liveClasses', liveClass.id, 'chat'), {
        userName: 'Instructor (Host)',
        text: chatInput.trim(),
        isAdmin: true,
        createdAt: serverTimestamp(),
      });
      setChatInput('');
    } catch (err) {
      console.error('Send chat error:', err);
    }
  };

  // End Live Class
  const handleEndBroadcast = async () => {
    if (!window.confirm('Are you sure you want to end this live broadcast?')) return;

    try {
      await updateDoc(doc(db, 'liveClasses', liveClass.id), {
        status: 'ended',
        updatedAt: serverTimestamp(),
      });
    } catch (e) {
      console.error('End broadcast error:', e);
    }

    if (currentStreamRef.current) {
      currentStreamRef.current.getTracks().forEach((t) => t.stop());
      currentStreamRef.current = null;
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col">
      {/* Studio Top Header */}
      <div className="h-16 px-6 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-600 text-white font-bold text-xs uppercase tracking-wider animate-pulse">
            <Radio className="w-3.5 h-3.5" /> Live Studio
          </span>
          <div>
            <h3 className="font-bold text-white text-sm line-clamp-1">
              {liveClass.title}
            </h3>
            <p className="text-xs text-slate-400">
              {liveClass.courseTitle || 'Live Interactive Broadcast'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 text-white text-xs font-semibold">
            <Users className="w-4 h-4 text-emerald-400" />
            <span>{viewers} Live Students</span>
          </div>

          <Button
            variant="danger"
            size="sm"
            onClick={handleEndBroadcast}
            className="text-xs font-bold"
          >
            <StopCircle className="w-4 h-4 mr-1.5" /> End Broadcast
          </Button>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
            title="Minimize Studio"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Studio Body: Video Monitor + Chat */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Video Monitor Canvas */}
        <div className="flex-1 bg-black flex flex-col items-center justify-center relative p-4">
          {streamError ? (
            <div className="p-6 rounded-xl bg-red-950/40 border border-red-800 text-red-300 text-center max-w-md">
              <p className="font-bold text-sm mb-1">Camera Permission Required</p>
              <p className="text-xs text-slate-300 mb-4">{streamError}</p>
              <Button size="sm" variant="primary" onClick={revertToCamera}>
                Try Camera Again
              </Button>
            </div>
          ) : (
            <div className="relative w-full max-w-4xl aspect-video rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-2xl flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />

              {!cameraEnabled && !isScreenSharing && (
                <div className="absolute inset-0 bg-slate-900 flex flex-col items-center justify-center text-slate-400">
                  <VideoOff className="w-12 h-12 mb-2" />
                  <span className="text-xs font-medium">Camera is Turned Off</span>
                </div>
              )}

              {/* Watermark badge on monitor */}
              <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-xs text-white font-medium flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                <span>Broadcasting to Student Mobile App</span>
              </div>
            </div>
          )}

          {/* Broadcast Bottom Control Bar */}
          <div className="absolute bottom-6 flex items-center gap-3 bg-slate-900/90 backdrop-blur-md px-6 py-3 rounded-2xl border border-slate-800 shadow-xl">
            {/* Mic Button */}
            <button
              onClick={toggleMic}
              className={`p-3 rounded-xl transition-all ${
                micEnabled
                  ? 'bg-slate-800 text-white hover:bg-slate-700'
                  : 'bg-red-600 text-white hover:bg-red-700'
              }`}
              title={micEnabled ? 'Mute Mic' : 'Unmute Mic'}
            >
              {micEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
            </button>

            {/* Camera Button */}
            <button
              onClick={toggleCamera}
              className={`p-3 rounded-xl transition-all ${
                cameraEnabled
                  ? 'bg-slate-800 text-white hover:bg-slate-700'
                  : 'bg-red-600 text-white hover:bg-red-700'
              }`}
              title={cameraEnabled ? 'Turn Camera Off' : 'Turn Camera On'}
            >
              {cameraEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
            </button>

            {/* Screen Share Button */}
            <button
              onClick={handleToggleScreenShare}
              className={`px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                isScreenSharing
                  ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/30'
                  : 'bg-slate-800 text-white hover:bg-slate-700'
              }`}
            >
              <Monitor className="w-5 h-5" />
              <span>{isScreenSharing ? 'Stop Screen Share' : 'Share Screen'}</span>
            </button>
          </div>
        </div>

        {/* Live Chat Sidebar */}
        <div className="w-full lg:w-96 bg-slate-900 border-l border-slate-800 flex flex-col h-72 lg:h-full">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2 text-white font-bold text-xs uppercase tracking-wider">
              <MessageSquare className="w-4 h-4 text-brand-400" />
              <span>Live Student Chat</span>
            </div>
            <span className="text-[11px] text-slate-400">
              {messages.length} messages
            </span>
          </div>

          {/* Chat Messages List */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 text-center p-6">
                <Sparkles className="w-8 h-8 mb-2 opacity-50" />
                <p className="text-xs">No questions yet.</p>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  Students watching from the app will chat here.
                </p>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`p-3 rounded-xl text-xs ${
                    msg.isAdmin
                      ? 'bg-brand-950/60 border border-brand-800/60 text-brand-200 ml-4'
                      : 'bg-slate-800/80 text-slate-200 mr-4'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`font-bold ${msg.isAdmin ? 'text-brand-400' : 'text-slate-300'}`}>
                      {msg.userName}
                    </span>
                    {msg.isAdmin && (
                      <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-brand-500 text-white font-bold">
                        Host
                      </span>
                    )}
                  </div>
                  <p className="text-slate-200">{msg.text}</p>
                </div>
              ))
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Chat Form */}
          <form onSubmit={handleSendChat} className="p-3 border-t border-slate-800 flex gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Reply to students..."
              className="flex-1 px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
            <button
              type="submit"
              className="p-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
