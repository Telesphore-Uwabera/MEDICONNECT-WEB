// // contexts/CallStore.tsx
// import {
//   createContext,
//   useContext,
//   useState,
//   useCallback,
//   useEffect,
//   useRef,
//   ReactNode,
// } from "react";
// import { Doctor } from "@/lib/mock-data";

// export type ConnectPhase =
//   | "idle"
//   | "setup"        // user configures mic/video before joining
//   | "checking"
//   | "permissions"
//   | "connecting"
//   | "ringing"      // progress complete — waiting for user to confirm join
//   | "connected"
//   | "failed"
//   | "ended";       // call ended — modal stays open until user acts

// export interface ChatMessage {
//   id: string;
//   from: "me" | "doctor";
//   text: string;
//   timestamp: number;
// }

// interface CallState {
//   phase: ConnectPhase;
//   doctor: Doctor | null;
//   videoEnabled: boolean;
//   audioEnabled: boolean;
//   elapsed: number;
//   signalStrength: number;
//   minimized: boolean;
//   dialogOpen: boolean;
//   messages: ChatMessage[];
//   unreadCount: number;
// }

// interface CallStore extends CallState {
//   goToSetup: (doctor: Doctor) => void;
//   startCall: (doctor: Doctor) => void;
//   confirmJoin: () => void;
//   endCall: () => void;
//   toggleVideo: () => void;
//   toggleAudio: () => void;
//   setMinimized: (v: boolean) => void;
//   setDialogOpen: (v: boolean) => void;
//   retryCall: () => void;
//   sendMessage: (text: string) => void;
//   clearUnread: () => void;
// }

// const Ctx = createContext<CallStore | null>(null);

// const DOCTOR_REPLIES = [
//   "I can see you clearly. How are you feeling today?",
//   "Can you describe your symptoms in more detail?",
//   "That's helpful, thank you",
//   "I'd recommend we schedule a follow-up in two weeks",
//   "Have you been taking the medication as prescribed?",
//   "Your vitals look good from what I can see",
//   "Let me know if you have any questions",
//   "I'll send a prescription to your pharmacy after the call",
// ];

// export const CallStoreProvider = ({ children }: { children: ReactNode }) => {
//   const [state, setState] = useState<CallState>({
//     phase: "idle",
//     doctor: null,
//     videoEnabled: true,
//     audioEnabled: true,
//     elapsed: 0,
//     signalStrength: 4,
//     minimized: false,
//     dialogOpen: false,
//     messages: [],
//     unreadCount: 0,
//   });

//   const timerRef    = useRef<ReturnType<typeof setInterval> | null>(null);
//   const signalRef   = useRef<ReturnType<typeof setInterval> | null>(null);
//   const replyRef    = useRef<ReturnType<typeof setTimeout>  | null>(null);
//   const timeoutRefs = useRef<ReturnType<typeof setTimeout>[]>([]);
//   const doctorRef   = useRef<Doctor | null>(null);

//   const clearAll = () => {
//     if (timerRef.current)  clearInterval(timerRef.current);
//     if (signalRef.current) clearInterval(signalRef.current);
//     if (replyRef.current)  clearTimeout(replyRef.current);
//     timeoutRefs.current.forEach(clearTimeout);
//     timeoutRefs.current = [];
//   };

//   // Step 1 — open setup screen
//   const goToSetup = useCallback((doctor: Doctor) => {
//     doctorRef.current = doctor;
//     setState((s) => ({ ...s, phase: "setup", doctor, dialogOpen: true }));
//   }, []);

//   // Step 2 — run connection sequence; stops at "ringing", never auto-connects
//   const runConnectionFlow = useCallback((doctor: Doctor) => {
//     clearAll();
//     doctorRef.current = doctor;
//     setState((s) => ({
//       ...s,
//       phase: "checking",
//       doctor,
//       elapsed: 0,
//       minimized: false,
//       dialogOpen: true,
//       messages: [],
//       unreadCount: 0,
//       // videoEnabled / audioEnabled intentionally preserved from setup
//     }));

//     const steps: { phase: ConnectPhase; delay: number }[] = [
//       { phase: "permissions", delay: 900  },
//       { phase: "connecting",  delay: 1800 },
//       { phase: "ringing",     delay: 2800 },
//       // "connected" is NOT added here — user must press "Join call"
//     ];

//     steps.forEach(({ phase, delay }) => {
//       const t = setTimeout(() => setState((s) => ({ ...s, phase })), delay);
//       timeoutRefs.current.push(t);
//     });
//   }, []);

//   const startCall = useCallback(
//     (doctor: Doctor) => runConnectionFlow(doctor),
//     [runConnectionFlow]
//   );

//   // Step 3 — user explicitly confirms they want to enter the call
//   const confirmJoin = useCallback(() => {
//     const doctor = doctorRef.current;
//     if (!doctor) return;

//     setState((s) => ({
//       ...s,
//       phase: "connected",
//       messages: [
//         {
//           id: crypto.randomUUID(),
//           from: "doctor",
//           text: `Hello! I'm ${doctor.name}. How can I help you today?`,
//           timestamp: Date.now(),
//         },
//       ],
//       unreadCount: 1,
//     }));

//     timerRef.current = setInterval(
//       () => setState((s) => ({ ...s, elapsed: s.elapsed + 1 })),
//       1000
//     );
//     signalRef.current = setInterval(
//       () => setState((s) => ({ ...s, signalStrength: Math.floor(Math.random() * 2) + 3 })),
//       3000
//     );
//   }, []);

//   const retryCall = useCallback(() => {
//     if (state.doctor) runConnectionFlow(state.doctor);
//   }, [state.doctor, runConnectionFlow]);

//   // End call — stops timers, goes to "ended", keeps modal open (no auto-dismiss)
//   const endCall = useCallback(() => {
//     clearAll();
//     setState((s) => ({ ...s, phase: "ended", minimized: false, dialogOpen: true }));
//   }, []);

//   const sendMessage = useCallback((text: string) => {
//     const msg: ChatMessage = {
//       id: crypto.randomUUID(),
//       from: "me",
//       text,
//       timestamp: Date.now(),
//     };
//     setState((s) => ({ ...s, messages: [...s.messages, msg] }));

//     const delay = 1500 + Math.random() * 2000;
//     replyRef.current = setTimeout(() => {
//       const reply: ChatMessage = {
//         id: crypto.randomUUID(),
//         from: "doctor",
//         text: DOCTOR_REPLIES[Math.floor(Math.random() * DOCTOR_REPLIES.length)],
//         timestamp: Date.now(),
//       };
//       setState((s) => ({
//         ...s,
//         messages: [...s.messages, reply],
//         unreadCount: s.unreadCount + 1,
//       }));
//     }, delay);
//   }, []);

//   const clearUnread  = useCallback(() => setState((s) => ({ ...s, unreadCount: 0 })), []);
//   const toggleVideo  = useCallback(() => setState((s) => ({ ...s, videoEnabled: !s.videoEnabled })), []);
//   const toggleAudio  = useCallback(() => setState((s) => ({ ...s, audioEnabled: !s.audioEnabled })), []);

//   const setMinimized = useCallback((v: boolean) => {
//     setState((s) => ({ ...s, minimized: v, dialogOpen: !v }));
//   }, []);
//   const setDialogOpen = useCallback((v: boolean) => {
//     setState((s) => ({ ...s, dialogOpen: v }));
//   }, []);

//   useEffect(() => () => clearAll(), []);

//   return (
//     <Ctx.Provider
//       value={{
//         ...state,
//         goToSetup,
//         startCall,
//         confirmJoin,
//         endCall,
//         toggleVideo,
//         toggleAudio,
//         setMinimized,
//         setDialogOpen,
//         retryCall,
//         sendMessage,
//         clearUnread,
//       }}
//     >
//       {children}
//     </Ctx.Provider>
//   );
// };

// export const useCallStore = () => {
//   const ctx = useContext(Ctx);
//   if (!ctx) throw new Error("useCallStore must be used within CallStoreProvider");
//   return ctx;
// };

// // contexts/CallStore.tsx
// import {
//   createContext,
//   useContext,
//   useState,
//   useCallback,
//   useEffect,
//   useRef,
//   ReactNode,
// } from "react";
// import { Doctor } from "@/lib/mock-data";

// export type ConnectPhase =
//   | "idle"
//   | "setup"
//   | "checking"
//   | "permissions"
//   | "connecting"
//   | "ringing"
//   | "connected"
//   | "failed"
//   | "ended";

// export type UserRole = "patient" | "doctor";

// export interface ChatMessage {
//   id: string;
//   from: "me" | "doctor";
//   text: string;
//   timestamp: number;
// }

// export interface IncomingRequest {
//   id: string;
//   patientName: string;
//   patientAvatar: string;
//   reason: string;
//   waitingSince: number; // timestamp
//   priority: "routine" | "urgent";
// }

// interface CallState {
//   phase: ConnectPhase;
//   role: UserRole;
//   doctor: Doctor | null;
//   videoEnabled: boolean;
//   audioEnabled: boolean;
//   elapsed: number;
//   signalStrength: number;
//   minimized: boolean;
//   dialogOpen: boolean;
//   messages: ChatMessage[];
//   unreadCount: number;
//   // Doctor-side
//   incomingRequests: IncomingRequest[];
//   activeRequest: IncomingRequest | null;
//   callNotes: string;
// }

// interface CallStore extends CallState {
//   // Patient actions
//   goToSetup: (doctor: Doctor) => void;
//   startCall: (doctor: Doctor) => void;
//   confirmJoin: () => void;
//   retryCall: () => void;
//   // Doctor actions
//   acceptRequest: (requestId: string) => void;
//   declineRequest: (requestId: string) => void;
//   simulateIncomingRequest: () => void;
//   updateCallNotes: (notes: string) => void;
//   // Shared
//   endCall: () => void;
//   toggleVideo: () => void;
//   toggleAudio: () => void;
//   setMinimized: (v: boolean) => void;
//   setDialogOpen: (v: boolean) => void;
//   sendMessage: (text: string) => void;
//   clearUnread: () => void;
// }

// const Ctx = createContext<CallStore | null>(null);

// const DOCTOR_REPLIES = [
//   "I can see you clearly. How are you feeling today?",
//   "Can you describe your symptoms in more detail?",
//   "That's helpful, thank you",
//   "I'd recommend we schedule a follow-up in two weeks",
//   "Have you been taking the medication as prescribed?",
//   "Your vitals look good from what I can see",
//   "Let me know if you have any questions",
//   "I'll send a prescription to your pharmacy after the call",
// ];

// const PATIENT_NAMES = [
//   "James Okafor", "Amara Diallo", "Sophie Nguyen", "Carlos Reyes",
//   "Fatima Al-Hassan", "David Chen", "Layla Ibrahim", "Marcus Thompson",
// ];

// const PATIENT_REASONS = [
//   "Follow-up on blood pressure medication",
//   "Persistent headache for 3 days",
//   "Annual wellness check",
//   "Chest tightness and shortness of breath",
//   "Medication refill request",
//   "Post-surgery check-in",
//   "Fever and sore throat",
//   "Lower back pain consultation",
// ];

// const PATIENT_AVATARS = ["JO", "AD", "SN", "CR", "FA", "DC", "LI", "MT"];

// let requestCounter = 0;

// export const CallStoreProvider = ({ children }: { children: ReactNode }) => {
//   const [state, setState] = useState<CallState>({
//     phase: "idle",
//     role: "patient",
//     doctor: null,
//     videoEnabled: true,
//     audioEnabled: true,
//     elapsed: 0,
//     signalStrength: 4,
//     minimized: false,
//     dialogOpen: false,
//     messages: [],
//     unreadCount: 0,
//     incomingRequests: [],
//     activeRequest: null,
//     callNotes: "",
//   });

//   const timerRef    = useRef<ReturnType<typeof setInterval> | null>(null);
//   const signalRef   = useRef<ReturnType<typeof setInterval> | null>(null);
//   const replyRef    = useRef<ReturnType<typeof setTimeout>  | null>(null);
//   const timeoutRefs = useRef<ReturnType<typeof setTimeout>[]>([]);
//   const doctorRef   = useRef<Doctor | null>(null);

//   const clearAll = () => {
//     if (timerRef.current)  clearInterval(timerRef.current);
//     if (signalRef.current) clearInterval(signalRef.current);
//     if (replyRef.current)  clearTimeout(replyRef.current);
//     timeoutRefs.current.forEach(clearTimeout);
//     timeoutRefs.current = [];
//   };

//   const startTimers = useCallback(() => {
//     timerRef.current = setInterval(
//       () => setState((s) => ({ ...s, elapsed: s.elapsed + 1 })),
//       1000
//     );
//     signalRef.current = setInterval(
//       () => setState((s) => ({ ...s, signalStrength: Math.floor(Math.random() * 2) + 3 })),
//       3000
//     );
//   }, []);

//   // ── Patient flow ────────────────────────────────────────────────────────────

//   const goToSetup = useCallback((doctor: Doctor) => {
//     doctorRef.current = doctor;
//     setState((s) => ({
//       ...s, role: "patient", phase: "setup",
//       doctor, dialogOpen: true, messages: [], unreadCount: 0,
//     }));
//   }, []);

//   const runConnectionFlow = useCallback((doctor: Doctor) => {
//     clearAll();
//     doctorRef.current = doctor;
//     setState((s) => ({
//       ...s, role: "patient", phase: "checking",
//       doctor, elapsed: 0, minimized: false, dialogOpen: true,
//       messages: [], unreadCount: 0,
//     }));

//     const steps: { phase: ConnectPhase; delay: number }[] = [
//       { phase: "permissions", delay: 900  },
//       { phase: "connecting",  delay: 1800 },
//       { phase: "ringing",     delay: 2800 },
//     ];

//     steps.forEach(({ phase, delay }) => {
//       const t = setTimeout(() => setState((s) => ({ ...s, phase })), delay);
//       timeoutRefs.current.push(t);
//     });
//   }, []);

//   const startCall = useCallback(
//     (doctor: Doctor) => runConnectionFlow(doctor),
//     [runConnectionFlow]
//   );

//   const confirmJoin = useCallback(() => {
//     const doctor = doctorRef.current;
//     if (!doctor) return;
//     setState((s) => ({
//       ...s,
//       phase: "connected",
//       messages: [{
//         id: crypto.randomUUID(),
//         from: "doctor",
//         text: `Hello! I'm ${doctor.name}. How can I help you today?`,
//         timestamp: Date.now(),
//       }],
//       unreadCount: 1,
//     }));
//     startTimers();
//   }, [startTimers]);

//   const retryCall = useCallback(() => {
//     if (state.doctor) runConnectionFlow(state.doctor);
//   }, [state.doctor, runConnectionFlow]);

//   // ── Doctor flow ─────────────────────────────────────────────────────────────

//   const simulateIncomingRequest = useCallback(() => {
//     const i = requestCounter % PATIENT_NAMES.length;
//     requestCounter++;
//     const req: IncomingRequest = {
//       id: crypto.randomUUID(),
//       patientName: PATIENT_NAMES[i],
//       patientAvatar: PATIENT_AVATARS[i],
//       reason: PATIENT_REASONS[i],
//       waitingSince: Date.now(),
//       priority: Math.random() > 0.75 ? "urgent" : "routine",
//     };
//     setState((s) => ({
//       ...s,
//       incomingRequests: [...s.incomingRequests, req],
//     }));
//   }, []);

//   const acceptRequest = useCallback((requestId: string) => {
//     setState((s) => {
//       const req = s.incomingRequests.find((r) => r.id === requestId);
//       if (!req) return s;
//       return {
//         ...s,
//         role: "doctor",
//         phase: "connected",
//         activeRequest: req,
//         elapsed: 0,
//         minimized: false,
//         dialogOpen: false, // doctor view is inline, not a dialog
//         incomingRequests: s.incomingRequests.filter((r) => r.id !== requestId),
//         messages: [{
//           id: crypto.randomUUID(),
//           from: "doctor",
//           text: `Hello ${req.patientName.split(" ")[0]}, I'm joining your call now.`,
//           timestamp: Date.now(),
//         }],
//         unreadCount: 0,
//         callNotes: "",
//       };
//     });
//     clearAll();
//     // Start timers directly after state set
//     setTimeout(() => {
//       timerRef.current = setInterval(
//         () => setState((s) => ({ ...s, elapsed: s.elapsed + 1 })),
//         1000
//       );
//       signalRef.current = setInterval(
//         () => setState((s) => ({ ...s, signalStrength: Math.floor(Math.random() * 2) + 3 })),
//         3000
//       );
//     }, 0);
//   }, []);

//   const declineRequest = useCallback((requestId: string) => {
//     setState((s) => ({
//       ...s,
//       incomingRequests: s.incomingRequests.filter((r) => r.id !== requestId),
//     }));
//   }, []);

//   const updateCallNotes = useCallback((notes: string) => {
//     setState((s) => ({ ...s, callNotes: notes }));
//   }, []);

//   // ── Shared ──────────────────────────────────────────────────────────────────

//   const endCall = useCallback(() => {
//     clearAll();
//     setState((s) => ({
//       ...s,
//       phase: "ended",
//       minimized: false,
//       dialogOpen: s.role === "patient",
//       activeRequest: s.role === "doctor" ? null : s.activeRequest,
//     }));
//     // For doctor: reset to idle after brief ended state
//     setTimeout(() => {
//       setState((s) => {
//         if (s.role !== "doctor") return s;
//         return { ...s, phase: "idle", elapsed: 0, messages: [], callNotes: "" };
//       });
//     }, 2000);
//   }, []);

//   const sendMessage = useCallback((text: string) => {
//     const msg: ChatMessage = { id: crypto.randomUUID(), from: "me", text, timestamp: Date.now() };
//     setState((s) => ({ ...s, messages: [...s.messages, msg] }));
//     const delay = 1500 + Math.random() * 2000;
//     replyRef.current = setTimeout(() => {
//       const reply: ChatMessage = {
//         id: crypto.randomUUID(),
//         from: "doctor",
//         text: DOCTOR_REPLIES[Math.floor(Math.random() * DOCTOR_REPLIES.length)],
//         timestamp: Date.now(),
//       };
//       setState((s) => ({ ...s, messages: [...s.messages, reply], unreadCount: s.unreadCount + 1 }));
//     }, delay);
//   }, []);

//   const clearUnread   = useCallback(() => setState((s) => ({ ...s, unreadCount: 0 })), []);
//   const toggleVideo   = useCallback(() => setState((s) => ({ ...s, videoEnabled: !s.videoEnabled })), []);
//   const toggleAudio   = useCallback(() => setState((s) => ({ ...s, audioEnabled: !s.audioEnabled })), []);
//   const setMinimized  = useCallback((v: boolean) => setState((s) => ({ ...s, minimized: v, dialogOpen: !v })), []);
//   const setDialogOpen = useCallback((v: boolean) => setState((s) => ({ ...s, dialogOpen: v })), []);

//   useEffect(() => () => clearAll(), []);

//   return (
//     <Ctx.Provider value={{
//       ...state,
//       goToSetup, startCall, confirmJoin, retryCall,
//       acceptRequest, declineRequest, simulateIncomingRequest, updateCallNotes,
//       endCall, toggleVideo, toggleAudio, setMinimized, setDialogOpen,
//       sendMessage, clearUnread,
//     }}>
//       {children}
//     </Ctx.Provider>
//   );
// };

// export const useCallStore = () => {
//   const ctx = useContext(Ctx);
//   if (!ctx) throw new Error("useCallStore must be used within CallStoreProvider");
//   return ctx;
// };

// contexts/CallStore.tsx
import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  ReactNode,
} from "react";
import { Doctor } from "@/lib/mock-data";

export type ConnectPhase =
  | "idle"
  | "setup"
  | "checking"
  | "permissions"
  | "connecting"
  | "ringing"
  | "connected"
  | "failed"
  | "ended";

export type UserRole = "patient" | "doctor";

export interface ChatMessage {
  id: string;
  from: "me" | "doctor";
  text: string;
  timestamp: number;
}

export interface IncomingRequest {
  id: string;
  patientName: string;
  patientAvatar: string;
  reason: string;
  waitingSince: number;
  priority: "routine" | "urgent";
}

// Appointment context passed when doctor starts a scheduled call
export interface AppointmentContext {
  id: string;
  patientLabel: string; // e.g. "Patient"
  specialty: string;
  date: string;
  time: string;
  type: "video" | "in-person";
}

interface CallState {
  phase: ConnectPhase;
  role: UserRole;
  doctor: Doctor | null;
  videoEnabled: boolean;
  audioEnabled: boolean;
  elapsed: number;
  signalStrength: number;
  minimized: boolean;
  dialogOpen: boolean;
  messages: ChatMessage[];
  unreadCount: number;
  // Doctor-side
  incomingRequests: IncomingRequest[];
  activeRequest: IncomingRequest | null;
  activeAppointment: AppointmentContext | null; // scheduled call context
  callNotes: string; // instant call notes
  appointmentNotes: Record<string, string>; // scheduled call notes by appt id
}

interface CallStore extends CallState {
  // Patient actions
  goToSetup: (doctor: Doctor) => void;
  startCall: (doctor: Doctor) => void;
  confirmJoin: () => void;
  retryCall: () => void;
  // Doctor — instant
  acceptRequest: (requestId: string) => void;
  declineRequest: (requestId: string) => void;
  simulateIncomingRequest: () => void;
  updateCallNotes: (notes: string) => void;
  // Doctor — scheduled
  startScheduledCall: (appt: AppointmentContext, doctor: Doctor) => void;
  updateAppointmentNotes: (apptId: string, notes: string) => void;
  // Shared
  endCall: () => void;
  toggleVideo: () => void;
  toggleAudio: () => void;
  setMinimized: (v: boolean) => void;
  setDialogOpen: (v: boolean) => void;
  sendMessage: (text: string) => void;
  clearUnread: () => void;
}

const Ctx = createContext<CallStore | null>(null);

const DOCTOR_REPLIES = [
  "I can see you clearly. How are you feeling today?",
  "Can you describe your symptoms in more detail?",
  "That's helpful, thank you",
  "I'd recommend we schedule a follow-up in two weeks",
  "Have you been taking the medication as prescribed?",
  "Your vitals look good from what I can see",
  "Let me know if you have any questions",
  "I'll send a prescription to your pharmacy after the call",
];

const PATIENT_NAMES = [
  "James Okafor",
  "Amara Diallo",
  "Sophie Nguyen",
  "Carlos Reyes",
  "Fatima Al-Hassan",
  "David Chen",
  "Layla Ibrahim",
  "Marcus Thompson",
];
const PATIENT_REASONS = [
  "Follow-up on blood pressure medication",
  "Persistent headache for 3 days",
  "Annual wellness check",
  "Chest tightness and shortness of breath",
  "Medication refill request",
  "Post-surgery check-in",
  "Fever and sore throat",
  "Lower back pain consultation",
];
const PATIENT_AVATARS = ["JO", "AD", "SN", "CR", "FA", "DC", "LI", "MT"];
let requestCounter = 0;

export const CallStoreProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<CallState>({
    phase: "idle",
    role: "patient",
    doctor: null,
    videoEnabled: true,
    audioEnabled: true,
    elapsed: 0,
    signalStrength: 4,
    minimized: false,
    dialogOpen: false,
    messages: [],
    unreadCount: 0,
    incomingRequests: [],
    activeRequest: null,
    activeAppointment: null,
    callNotes: "",
    appointmentNotes: {},
  });

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const signalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const replyRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timeoutRefs = useRef<ReturnType<typeof setTimeout>[]>([]);
  const doctorRef = useRef<Doctor | null>(null);

  const clearAll = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (signalRef.current) clearInterval(signalRef.current);
    if (replyRef.current) clearTimeout(replyRef.current);
    timeoutRefs.current.forEach(clearTimeout);
    timeoutRefs.current = [];
  };

  const startTimers = () => {
    timerRef.current = setInterval(
      () => setState((s) => ({ ...s, elapsed: s.elapsed + 1 })),
      1000,
    );
    signalRef.current = setInterval(
      () =>
        setState((s) => ({
          ...s,
          signalStrength: Math.floor(Math.random() * 2) + 3,
        })),
      3000,
    );
  };

  // ── Patient ─────────────────────────────────────────────────────────────────

  const goToSetup = useCallback((doctor: Doctor) => {
    doctorRef.current = doctor;
    setState((s) => ({
      ...s,
      role: "patient",
      phase: "setup",
      doctor,
      dialogOpen: true,
      messages: [],
      unreadCount: 0,
    }));
  }, []);

  const runConnectionFlow = useCallback((doctor: Doctor) => {
    clearAll();
    doctorRef.current = doctor;
    setState((s) => ({
      ...s,
      role: "patient",
      phase: "checking",
      doctor,
      elapsed: 0,
      minimized: false,
      dialogOpen: true,
      messages: [],
      unreadCount: 0,
    }));
    const steps: { phase: ConnectPhase; delay: number }[] = [
      { phase: "permissions", delay: 900 },
      { phase: "connecting", delay: 1800 },
      { phase: "ringing", delay: 2800 },
    ];
    steps.forEach(({ phase, delay }) => {
      const t = setTimeout(() => setState((s) => ({ ...s, phase })), delay);
      timeoutRefs.current.push(t);
    });
  }, []);

  const startCall = useCallback(
    (doctor: Doctor) => runConnectionFlow(doctor),
    [runConnectionFlow],
  );

  const confirmJoin = useCallback(() => {
    const doctor = doctorRef.current;
    if (!doctor) return;
    setState((s) => ({
      ...s,
      phase: "connected",
      messages: [
        {
          id: crypto.randomUUID(),
          from: "doctor",
          text: `Hello! I'm ${doctor.name}. How can I help you today?`,
          timestamp: Date.now(),
        },
      ],
      unreadCount: 1,
    }));
    startTimers();
  }, []);

  const retryCall = useCallback(() => {
    if (state.doctor) runConnectionFlow(state.doctor);
  }, [state.doctor, runConnectionFlow]);

  // ── Doctor — scheduled appointment call ────────────────────────────────────

  const startScheduledCall = useCallback(
    (appt: AppointmentContext, doctor: Doctor) => {
      clearAll();
      doctorRef.current = doctor;
      setState((s) => ({
        ...s,
        role: "doctor",
        phase: "connected",
        doctor,
        activeAppointment: appt,
        activeRequest: null,
        elapsed: 0,
        minimized: false,
        dialogOpen: false,
        messages: [
          {
            id: crypto.randomUUID(),
            from: "doctor",
            text: `Hello! Starting your ${appt.specialty} consultation. How are you doing today?`,
            timestamp: Date.now(),
          },
        ],
        unreadCount: 0,
        callNotes: "",
      }));
      startTimers();
    },
    [],
  );

  const updateAppointmentNotes = useCallback(
    (apptId: string, notes: string) => {
      setState((s) => ({
        ...s,
        appointmentNotes: { ...s.appointmentNotes, [apptId]: notes },
      }));
    },
    [],
  );

  // ── Doctor — instant ────────────────────────────────────────────────────────

  const simulateIncomingRequest = useCallback(() => {
    const i = requestCounter % PATIENT_NAMES.length;
    requestCounter++;
    const req: IncomingRequest = {
      id: crypto.randomUUID(),
      patientName: PATIENT_NAMES[i],
      patientAvatar: PATIENT_AVATARS[i],
      reason: PATIENT_REASONS[i],
      waitingSince: Date.now(),
      priority: Math.random() > 0.75 ? "urgent" : "routine",
    };
    setState((s) => ({ ...s, incomingRequests: [...s.incomingRequests, req] }));
  }, []);

  const acceptRequest = useCallback((requestId: string) => {
    setState((s) => {
      const req = s.incomingRequests.find((r) => r.id === requestId);
      if (!req) return s;
      return {
        ...s,
        role: "doctor",
        phase: "connected",
        activeRequest: req,
        activeAppointment: null,
        elapsed: 0,
        minimized: false,
        dialogOpen: false,
        incomingRequests: s.incomingRequests.filter((r) => r.id !== requestId),
        messages: [
          {
            id: crypto.randomUUID(),
            from: "doctor",
            text: `Hello ${req.patientName.split(" ")[0]}, I'm joining your call now.`,
            timestamp: Date.now(),
          },
        ],
        unreadCount: 0,
        callNotes: "",
      };
    });
    clearAll();
    setTimeout(startTimers, 0);
  }, []);

  const declineRequest = useCallback((requestId: string) => {
    setState((s) => ({
      ...s,
      incomingRequests: s.incomingRequests.filter((r) => r.id !== requestId),
    }));
  }, []);

  const updateCallNotes = useCallback((notes: string) => {
    setState((s) => ({ ...s, callNotes: notes }));
  }, []);

  // ── Shared ──────────────────────────────────────────────────────────────────

  const endCall = useCallback(() => {
    clearAll();
    setState((s) => ({
      ...s,
      phase: "ended",
      minimized: false,
      dialogOpen: s.role === "patient",
      activeRequest: s.role === "doctor" ? null : s.activeRequest,
      activeAppointment: s.role === "doctor" ? null : s.activeAppointment,
    }));
    setTimeout(() => {
      setState((s) => {
        if (s.role !== "doctor") return s;
        return { ...s, phase: "idle", elapsed: 0, messages: [], callNotes: "" };
      });
    }, 2000);
  }, []);

  const sendMessage = useCallback((text: string) => {
    const msg: ChatMessage = {
      id: crypto.randomUUID(),
      from: "me",
      text,
      timestamp: Date.now(),
    };
    setState((s) => ({ ...s, messages: [...s.messages, msg] }));
    replyRef.current = setTimeout(
      () => {
        const reply: ChatMessage = {
          id: crypto.randomUUID(),
          from: "doctor",
          text: DOCTOR_REPLIES[
            Math.floor(Math.random() * DOCTOR_REPLIES.length)
          ],
          timestamp: Date.now(),
        };
        setState((s) => ({
          ...s,
          messages: [...s.messages, reply],
          unreadCount: s.unreadCount + 1,
        }));
      },
      1500 + Math.random() * 2000,
    );
  }, []);

  const clearUnread = useCallback(
    () => setState((s) => ({ ...s, unreadCount: 0 })),
    [],
  );
  const toggleVideo = useCallback(
    () => setState((s) => ({ ...s, videoEnabled: !s.videoEnabled })),
    [],
  );
  const toggleAudio = useCallback(
    () => setState((s) => ({ ...s, audioEnabled: !s.audioEnabled })),
    [],
  );
  const setMinimized = useCallback(
    (v: boolean) => setState((s) => ({ ...s, minimized: v, dialogOpen: !v })),
    [],
  );
  const setDialogOpen = useCallback(
    (v: boolean) => setState((s) => ({ ...s, dialogOpen: v })),
    [],
  );

  useEffect(() => () => clearAll(), []);

  return (
    <Ctx.Provider
      value={{
        ...state,
        goToSetup,
        startCall,
        confirmJoin,
        retryCall,
        startScheduledCall,
        updateAppointmentNotes,
        acceptRequest,
        declineRequest,
        simulateIncomingRequest,
        updateCallNotes,
        endCall,
        toggleVideo,
        toggleAudio,
        setMinimized,
        setDialogOpen,
        sendMessage,
        clearUnread,
      }}
    >
      {children}
    </Ctx.Provider>
  );
};

export const useCallStore = () => {
  const ctx = useContext(Ctx);
  if (!ctx)
    throw new Error("useCallStore must be used within CallStoreProvider");
  return ctx;
};
