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
  it("never puts TURN operator errors on the call screen", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const pc = await renderRoom(TURN_WITH_CREDENTIALS);
    act(() => {
      pc.turnError(401, "Unauthorized");
      pc.turnError(701, "Address not associated with the desired network interface", "turn:relay.test:3478?transport=tcp");
      pc.finishGathering();
    });
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(alertBanner()).toBeNull();
    expect(screen.queryByText("The relay refused these credentials")).toBeNull();
    expect(warn.mock.calls.some((call) => String(call[0]).includes("Relay unavailable"))).toBe(true);
    warn.mockRestore();
  });

  it("groups split TURN urls so Chrome does not allocate once per NIC", async () => {
    const pc = await renderRoom([
      { urls: "turn:197.243.29.114:3478", username: "u", credential: "p" },
      { urls: "turn:197.243.29.114:3478?transport=tcp", username: "u", credential: "p" },
      { urls: "turn:197.243.29.114:5349", username: "u", credential: "p" },
      { urls: "turn:197.243.29.114:5349?transport=tcp", username: "u", credential: "p" },
      { urls: "turns:197.243.29.114:5349", username: "u", credential: "p" },
      { urls: "turns:197.243.29.114:5349?transport=tcp", username: "u", credential: "p" },
    ]);
    expect(pc.iceServers).toHaveLength(1);
    expect(pc.iceServers[0].urls).toEqual([
      "turn:197.243.29.114:3478",
      "turn:197.243.29.114:3478?transport=tcp",
      "turns:197.243.29.114:5349?transport=tcp",
    ]);
  });

  it("stays quiet once a relay candidate has been gathered", async () => {
    const pc = await renderRoom(TURN_WITH_CREDENTIALS);
    act(() => pc.candidate("relay"));
    act(() => pc.finishGathering());
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(alertBanner()).toBeNull();
  });

  it("does not surface a banner when gathering finishes without a relay", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const pc = await renderRoom(STUN_ONLY);
    act(() => pc.finishGathering());
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(alertBanner()).toBeNull();
    expect(screen.queryByText("No relay server in this call")).toBeNull();
    warn.mockRestore();
  });
});
