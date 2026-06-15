import { useParams, useSearchParams, Link } from "react-router-dom";
import { useEffect, useMemo } from "react";
import { useCallContext } from "@/context/CallContext";

const ConsultationRoomPage = () => {
  const { roomName } = useParams<{ roomName: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("t"); 
  const { startCall } = useCallContext();

  const parsed = useMemo(() => {
    if (!token) return null;
    try {
      return JSON.parse(atob(decodeURIComponent(token)));
    } catch {
      return null;
    }
  }, [token]);

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