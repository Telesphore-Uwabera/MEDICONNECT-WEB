import { useParams, useSearchParams, Link } from "react-router-dom";
import { useEffect, useMemo } from "react";
import { useCallContext } from "@/context/CallContext";
import { decodeCallToken } from "@/lib/scheduled-call";

const ConsultationRoomPage = () => {
  const { roomName } = useParams<{ roomName: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("t");
  const mode = searchParams.get("mode"); // "appointment" for scheduled
  const cid = searchParams.get("cid"); // consultation/appointment id
  const { startCall } = useCallContext();

  const parsed = useMemo(() => {
    // decodeCallToken handles single- AND double-base64-encoded tokens (the
    // email/SMS verification links double-encode the token).
    const obj = decodeCallToken(token);
    if (!obj || typeof obj !== "object") return null;
    if (mode === "appointment") obj.chat_mode = "appointment";
    if (cid != null && obj.consultation_id == null) {
      const n = Number(cid);
      obj.consultation_id = Number.isFinite(n) ? n : cid;
    }
    return obj;
  }, [token, mode, cid]);

  useEffect(() => {
    if (roomName && parsed) {
      startCall(roomName, parsed);
    }
  }, [roomName, parsed, startCall]);

  if (!roomName || !parsed) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground text-sm">Invalid consultation link.</p>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-background">
      <h1 className="text-2xl font-bold mb-4">Consultation in Progress</h1>
      <p className="text-muted-foreground mb-8 text-center max-w-md">
        Your consultation is active in the floating window. You can minimize it and navigate to other pages without dropping the call.
      </p>
      <Link 
        to="/" 
        className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-all shadow-sm active:scale-95"
      >
        Go to Dashboard
      </Link>
    </div>
  );
};

export default ConsultationRoomPage;