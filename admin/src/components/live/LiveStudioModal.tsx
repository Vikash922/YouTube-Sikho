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
  RefreshCw,
  Hand,
  Clock,
} from 'lucide-react';
import {
  doc,
  updateDoc,
  collection,
  onSnapshot,
  addDoc,
  deleteDoc,
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
  type?: string;
  createdAt?: any;
  isAdmin?: boolean;
}

interface HandRaise {
  id: string;
  userName: string;
  raisedAt?: any;
}

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export const LiveStudioModal: React.FC<LiveStudioModalProps> = ({
  isOpen,
  onClose,
  liveClass,
}) => {
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [viewers, setViewers] = useState(liveClass.viewerCount || 1);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [handRaises, setHandRaises] = useState<HandRaise[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [streamError, setStreamError] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const currentStreamRef = useRef<MediaStream | null>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const peerConnectionsRef = useRef<Record<string, RTCPeerConnection>>({});
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 1. Elapsed broadcast timer
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      setElapsedSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

  // Format seconds to HH:MM:SS
  const formatTimer = (sec: number) => {
    const hrs = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const secs = sec % 60;
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 2. Initialize Camera and Microphone when Studio opens
  useEffect(() => {
    if (!isOpen) return;

    let active = true;

    const startMedia = async () => {
      try {
        setStreamError(null);
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode,
          },
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

    // 3. Real-time listener for Live Class (viewers count)
    const unsubClass = onSnapshot(doc(db, 'liveClasses', liveClass.id), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setViewers(data.viewerCount || 1);
      }
    });

    // 4. Real-time listener for Chat Messages (Uses canonical 'messages' subcollection)
    const messagesRef = collection(db, 'liveClasses', liveClass.id, 'messages');
    const qMessages = query(messagesRef, orderBy('createdAt', 'asc'));
    const unsubMessages = onSnapshot(
      qMessages,
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

    // 5. Real-time listener for Hand Raises
    const handsRef = collection(db, 'liveClasses', liveClass.id, 'handRaises');
    const unsubHands = onSnapshot(
      handsRef,
      (snapshot) => {
        const list = snapshot.docs.map(
          (d) => ({ id: d.id, ...d.data() } as HandRaise)
        );
        setHandRaises(list);
      },
      (err) => console.warn('Hands listener warning:', err)
    );

    // 6. WebRTC Broadcaster Signaling for Student App Viewers
    const viewersColRef = collection(db, 'liveClasses', liveClass.id, 'viewers');
    const unsubViewers = onSnapshot(viewersColRef, (snapshot) => {
      snapshot.docChanges().forEach(async (change) => {
        const viewerId = change.doc.id;
        const viewerData = change.doc.data();

        // New viewer joined and requested live stream
        if (change.type === 'added' && viewerData.status === 'requesting_stream') {
          if (!currentStreamRef.current) return;

          try {
            const pc = new RTCPeerConnection(ICE_SERVERS);
            peerConnectionsRef.current[viewerId] = pc;

            // Add local stream tracks to this viewer's peer connection
            currentStreamRef.current.getTracks().forEach((track) => {
              pc.addTrack(track, currentStreamRef.current!);
            });

            // Handle ICE candidates
            pc.onicecandidate = async (event) => {
              if (event.candidate) {
                await addDoc(
                  collection(db, 'liveClasses', liveClass.id, 'viewers', viewerId, 'callerCandidates'),
                  event.candidate.toJSON()
                );
              }
            };

            // Create Offer
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            await updateDoc(doc(db, 'liveClasses', liveClass.id, 'viewers', viewerId), {
              offer: { type: offer.type, sdp: offer.sdp },
              status: 'offer_sent',
            });

            // Listen for Answer from Student
            onSnapshot(
              doc(db, 'liveClasses', liveClass.id, 'viewers', viewerId),
              async (docSnap) => {
                const data = docSnap.data();
                if (data?.answer && !pc.currentRemoteDescription) {
                  const answerDesc = new RTCSessionDescription(data.answer);
                  await pc.setRemoteDescription(answerDesc);
                }
              }
            );

            // Listen for Remote ICE candidates from Student
            onSnapshot(
              collection(db, 'liveClasses', liveClass.id, 'viewers', viewerId, 'calleeCandidates'),
              (candSnap) => {
                candSnap.docChanges().forEach(async (candChange) => {
                  if (candChange.type === 'added') {
                    const candidate = new RTCIceCandidate(candChange.doc.data());
                    await pc.addIceCandidate(candidate).catch(() => {});
                  }
                });
              }
            );
          } catch (rtcErr) {
            console.warn('WebRTC peer error for viewer:', viewerId, rtcErr);
          }
        }
      });
    });

    // 7. Live Snapshot Stream (Compressed 480p preview for zero-delay instant fallback)
    const frameInterval = setInterval(() => {
      if (videoRef.current && canvasRef.current && currentStreamRef.current) {
        try {
          const video = videoRef.current;
          const canvas = canvasRef.current;
          if (video.videoWidth > 0 && video.videoHeight > 0) {
            canvas.width = 480;
            canvas.height = Math.round((480 * video.videoHeight) / video.videoWidth);
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              const dataUrl = canvas.toDataURL('image/jpeg', 0.55);
              updateDoc(doc(db, 'liveClasses', liveClass.id), {
                previewFrame: dataUrl,
                lastFrameAt: Date.now(),
              }).catch(() => {});
            }
          }
        } catch (e) {}
      }
    }, 600);

    return () => {
      active = false;
      unsubClass();
      unsubMessages();
      unsubHands();
      unsubViewers();
      clearInterval(frameInterval);

      // Stop all tracks on cleanup
      if (currentStreamRef.current) {
        currentStreamRef.current.getTracks().forEach((t) => t.stop());
        currentStreamRef.current = null;
      }
      // Close all peer connections
      Object.values(peerConnectionsRef.current).forEach((pc) => pc.close());
      peerConnectionsRef.current = {};
    };
  }, [isOpen, liveClass.id, facingMode]);

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

  // Flip Camera (Front / Back)
  const handleFlipCamera = async () => {
    const nextFacing = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextFacing);
    try {
      if (currentStreamRef.current) {
        currentStreamRef.current.getVideoTracks().forEach((t) => t.stop());
      }
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: nextFacing },
        audio: micEnabled,
      });
      currentStreamRef.current = newStream;
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
      setIsScreenSharing(false);
    } catch (e: any) {
      console.warn('Flip camera error:', e);
    }
  };

  // Toggle Screen Share (Laptop / PC Safe)
  const handleToggleScreenShare = async () => {
    try {
      if (!isScreenSharing) {
        if (!navigator.mediaDevices?.getDisplayMedia) {
          alert('Screen sharing is available on Desktop & Laptop browsers. On mobile phones, please use the Flip Camera button to share your screen or notes.');
          return;
        }

        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
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
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode },
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
      await addDoc(collection(db, 'liveClasses', liveClass.id, 'messages'), {
        userName: 'Instructor (Host)',
        text: chatInput.trim(),
        isAdmin: true,
        createdAt: serverTimestamp(),
        isDeleted: false,
      });
      setChatInput('');
    } catch (err) {
      console.error('Send chat error:', err);
    }
  };

  // Clear a student's raised hand
  const handleDismissHand = async (handId: string) => {
    try {
      await deleteDoc(doc(db, 'liveClasses', liveClass.id, 'handRaises', handId));
    } catch (e) {}
  };

  // End Live Class
  const handleEndBroadcast = async () => {
    if (!window.confirm('Are you sure you want to end this live broadcast?')) return;

    try {
      await updateDoc(doc(db, 'liveClasses', liveClass.id), {
        status: 'ended',
        previewFrame: null,
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
      {/* Hidden off-screen canvas for frame capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Studio Top Header */}
      <div className="h-16 px-6 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-600 text-white font-bold text-xs uppercase tracking-wider animate-pulse">
            <Radio className="w-3.5 h-3.5" /> LIVE STUDIO
          </span>
          <div className="flex items-center gap-2 text-xs font-mono bg-slate-800 text-slate-300 px-2.5 py-1 rounded-md">
            <Clock className="w-3.5 h-3.5 text-red-400" />
            <span>{formatTimer(elapsedSeconds)}</span>
          </div>
          <div className="hidden sm:block">
            <h3 className="font-bold text-white text-sm line-clamp-1">
              {liveClass.title}
            </h3>
            <p className="text-[11px] text-slate-400">
              {liveClass.courseTitle || 'Interactive Live Masterclass'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Raised Hands Indicator Button */}
          {handRaises.length > 0 && (
            <div className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold animate-bounce">
              <Hand className="w-4 h-4 text-amber-400" />
              <span>{handRaises.length} {handRaises.length === 1 ? 'Doubt' : 'Doubts'} Waiting</span>
            </div>
          )}

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
                <span>Broadcasting to Student Mobile App Live</span>
              </div>
            </div>
          )}

          {/* Broadcast Bottom Control Bar */}
          <div className="absolute bottom-6 flex items-center gap-3 bg-slate-900/90 backdrop-blur-md px-6 py-3 rounded-2xl border border-slate-800 shadow-xl flex-wrap justify-center">
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

            {/* Flip Camera Button (Front / Rear) */}
            <button
              onClick={handleFlipCamera}
              className="p-3 rounded-xl bg-slate-800 text-white hover:bg-slate-700 transition-all"
              title="Switch Front/Back Camera"
            >
              <RefreshCw className="w-5 h-5" />
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

        {/* Live Chat & Questions Sidebar */}
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

          {/* Raised Hands Bar inside sidebar */}
          {handRaises.length > 0 && (
            <div className="p-2.5 bg-amber-950/40 border-b border-amber-900/50 space-y-1.5">
              <span className="text-[10px] uppercase font-bold text-amber-400 flex items-center gap-1">
                <Hand className="w-3 h-3" /> Questions / Hand Raises ({handRaises.length}):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {handRaises.map((h) => (
                  <span
                    key={h.id}
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-200 text-[11px]"
                  >
                    <span>{h.userName}</span>
                    <button
                      onClick={() => handleDismissHand(h.id)}
                      className="hover:text-white"
                      title="Clear"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Chat Messages List */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 text-center p-6">
                <Sparkles className="w-8 h-8 mb-2 opacity-50" />
                <p className="text-xs">No questions yet.</p>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  Messages sent from the student mobile app appear here instantly.
                </p>
              </div>
            ) : (
              messages.map((msg) => {
                if (msg.type === 'hand_raise') {
                  return (
                    <div
                      key={msg.id}
                      className="p-2.5 rounded-xl bg-amber-950/50 border border-amber-800/40 text-amber-200 text-xs flex items-center gap-2"
                    >
                      <Hand className="w-4 h-4 text-amber-400 flex-shrink-0" />
                      <div>
                        <span className="font-bold">{msg.userName}</span>
                        <span className="text-amber-300 ml-1">raised their hand!</span>
                      </div>
                    </div>
                  );
                }

                return (
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
                );
              })
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Chat Form */}
          <form onSubmit={handleSendChat} className="p-3 border-t border-slate-800 flex gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Reply to students as Host..."
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
