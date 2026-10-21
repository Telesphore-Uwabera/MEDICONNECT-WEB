import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup, act } from "@testing-library/react";

// ── Fixtures ──────────────────────────────────────────────────────────────────
type IceServerFixture = { urls: string; username?: string; credential?: string };
type RoomToken = {
  username: string;
  credential: string;
  room: string;
  is_owner: boolean;
  ice_servers: IceServerFixture[];
};

const STUN_ONLY: IceServerFixture[] = [{ urls: "stun:stun.l.google.com:19302" }];
const TURN_WITH_CREDENTIALS: IceServerFixture[] = [
  { urls: "turn:relay.test:3478", username: "1790000000:mediconnect", credential: "shared-secret" },
];
const TURN_WITHOUT_CREDENTIALS: IceServerFixture[] = [{ urls: "turn:relay.test:3478" }];

// ── WebRTC stub ───────────────────────────────────────────────────────────────
// jsdom ships no RTCPeerConnection, and the diagnosis depends entirely on what
// the browser reports back, so the tests drive that surface directly.
class FakePeerConnection {
  static instances: FakePeerConnection[] = [];

  onicecandidate: ((event: { candidate: unknown }) => void) | null = null;
  onicecandidateerror: ((event: unknown) => void) | null = null;
  onicegatheringstatechange: (() => void) | null = null;
  onconnectionstatechange: (() => void) | null = null;
  oniceconnectionstatechange: (() => void) | null = null;
  ontrack: ((event: unknown) => void) | null = null;

  connectionState = "new";
  iceConnectionState = "new";
  iceGatheringState = "new";
  signalingState = "stable";
  remoteDescription: unknown = null;
  localDescription: unknown = null;
  iceServers: IceServerFixture[];

  constructor(config: { iceServers?: IceServerFixture[] }) {
    this.iceServers = config.iceServers ?? [];
    FakePeerConnection.instances.push(this);
  }

  addTransceiver() {}
  addTrack() {}
  getSenders(): Array<{ track?: MediaStreamTrack; replaceTrack: (t: MediaStreamTrack) => Promise<void> }> { return []; }
  getStats() { return Promise.resolve(new Map<string, never>()); }
  createOffer() { return Promise.resolve({ type: "offer", sdp: "v=0\r\n" }); }
  createAnswer() { return Promise.resolve({ type: "answer", sdp: "v=0\r\n" }); }
  setLocalDescription(description: { type?: string; sdp?: string }) {
    this.localDescription = description;
    return Promise.resolve();
  }
  setRemoteDescription(description: { type?: string; sdp?: string }) {
    this.remoteDescription = description;
    return Promise.resolve();
  }
  addIceCandidate() { return Promise.resolve(); }
  close() { this.connectionState = "closed"; }

  // Test helpers — these stand in for the browser's ICE reporting.
  candidate(candidateType: "host" | "srflx" | "relay" | null) {
    this.onicecandidate?.({
      candidate: candidateType
        ? {
            type: candidateType,
            toJSON: () => ({ candidate: `a=candidate:1 1 UDP 100 0.0.0.0 50000 typ ${candidateType}` }),
          }
        : null,
    });
  }
  finishGathering() {
    this.candidate(null);
    this.iceGatheringState = "complete";
    this.onicegatheringstatechange?.();
  }
  turnError(errorCode: number, errorText: string, url = "turn:relay.test:3478") {
    this.onicecandidateerror?.({ url, errorCode, errorText });
  }
}

vi.mock("@/lib/echo", () => ({
  default: {
    channel: () => ({ listen: () => {}, stopListening: () => {} }),
    leaveChannel: () => {},
    connector: { pusher: { connection: { bind: () => {} } } },
  },
}));
vi.mock("@/context/CallContext", () => ({
  useCallContext: () => ({
    isMinimized: false,
    toggleMinimize: () => {},
    endCall: () => {},
    requestAppointmentCompletion: () => {},
  }),
}));
vi.mock("@/hooks/video/use-audio-volume", () => ({ useAudioVolume: () => ({ isTalking: false }) }));
vi.mock("@/hooks/video/usePictureInPicture", () => ({
  usePictureInPicture: () => ({ supported: false, isPipActive: false, toggle: () => {} }),
}));
vi.mock("@/components/consultatioRoom/ChatPanel", () => ({ ChatPanel: () => null }));
vi.mock("@/components/consultatioRoom/IllnessProofPanel", () => ({ IllnessProofPanel: () => null }));
vi.mock("@/components/consultatioRoom/InstantNotesSidebar", () => ({ InstantNotesSidebar: () => null }));
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: { defaultValue?: string }) => options?.defaultValue ?? key,
    i18n: { language: "en" },
  }),
}));
vi.mock("react-router-dom", () => ({ Link: () => null }));
vi.mock("sonner", () => ({ toast: { info: () => {}, error: () => {}, warning: () => {} } }));
vi.mock("@/hooks/doctor/use-doctor-appointment", () => ({
  useGetAppointment: () => ({ data: undefined }),
}));

const { default: ConsultationRoom } = await import("@/components/consultatioRoom/ConsultationRoom");

async function renderRoom(ice_servers: IceServerFixture[]) {
  const token: RoomToken = {
    username: "Dr:Telesphore",
    credential: "unused-by-the-room",
    room: "instant-consultation-80",
    is_owner: true,
    ice_servers,
  };
  render(<ConsultationRoom roomName="instant-consultation-80" token={token} />);
  await waitFor(() => expect(FakePeerConnection.instances.length).toBeGreaterThan(0));
  return FakePeerConnection.instances[FakePeerConnection.instances.length - 1];
}

function alertBanner() {
  return screen.queryByRole("alert");
}

beforeEach(() => {
  FakePeerConnection.instances = [];
  vi.stubGlobal("RTCPeerConnection", FakePeerConnection);
  vi.stubGlobal("RTCIceCandidate", function (init: { candidate?: string }) { return init; });
  vi.stubGlobal("RTCSessionDescription", function (init: { type?: string; sdp?: string }) { return init; });
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ signals: [] }) })));
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: {
      getUserMedia: () =>
        Promise.resolve({ getTracks: () => [], getAudioTracks: () => [], getVideoTracks: () => [] }),
    },
  });
  HTMLMediaElement.prototype.play = () => Promise.resolve();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("consultation room relay diagnostics", () => {
  it("names a missing relay when the token ships STUN only", async () => {
    const pc = await renderRoom(STUN_ONLY);
    act(() => pc.finishGathering());
    await waitFor(() => expect(alertBanner()).toBeInTheDocument());
    expect(screen.getByText("No relay server in this call")).toBeInTheDocument();
    expect(alertBanner()!.textContent).toContain("relays: none");
  });

  it("names absent credentials when the API sent a turn: URL with no user", async () => {
    const pc = await renderRoom(TURN_WITHOUT_CREDENTIALS);
    act(() => pc.finishGathering());
    await waitFor(() => expect(alertBanner()).toBeInTheDocument());
    expect(screen.getByText("The relay was sent without credentials")).toBeInTheDocument();
    expect(alertBanner()!.textContent).toContain("turn:relay.test:3478 (no credentials)");
  });

  it("surfaces the relay's own rejection code", async () => {
    const pc = await renderRoom(TURN_WITH_CREDENTIALS);
    act(() => {
      pc.turnError(401, "Unauthorized");
      pc.finishGathering();
    });
    await waitFor(() => expect(alertBanner()).toBeInTheDocument());
    expect(screen.getByText("The relay refused these credentials")).toBeInTheDocument();
    expect(alertBanner()!.textContent).toContain("401 Unauthorized");
  });

  it("reports an unresponsive relay when allocation produced no candidate", async () => {
    const pc = await renderRoom(TURN_WITH_CREDENTIALS);
    act(() => {
      pc.candidate("host");
      pc.candidate("srflx");
    });
    act(() => pc.finishGathering());
    await waitFor(() => expect(alertBanner()).toBeInTheDocument());
    expect(screen.getByText("The relay is not answering")).toBeInTheDocument();
    expect(alertBanner()!.textContent).toContain("local: host, srflx");
  });

  it("stays quiet once a relay candidate has been gathered", async () => {
    const pc = await renderRoom(TURN_WITH_CREDENTIALS);
    act(() => pc.candidate("relay"));
    act(() => pc.finishGathering());
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(alertBanner()).toBeNull();
  });

  it("clears a warning when the call does connect", async () => {
    const pc = await renderRoom(TURN_WITH_CREDENTIALS);
    act(() => pc.finishGathering());
    await waitFor(() => expect(alertBanner()).toBeInTheDocument());
    pc.connectionState = "connected";
    act(() => pc.onconnectionstatechange?.());
    await waitFor(() => expect(alertBanner()).toBeNull());
  });
});
