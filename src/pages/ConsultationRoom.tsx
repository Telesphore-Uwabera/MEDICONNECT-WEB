import { useParams, useSearchParams } from "react-router-dom";
import { useMemo } from "react";
import ConsultationRoom from "@/components/consultatioRoom/ConsultationRoom.tsx";

const ConsultationRoomPage = () => {
  const { roomName } = useParams<{ roomName: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("t");

  const parsed = useMemo(() => {
    if (!token) return null;
    try {
      return JSON.parse(atob(decodeURIComponent(token)));
    } catch {
      return null;
    }
  }, [token]);

  if (!roomName || !parsed) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground text-sm">Invalid consultation link.</p>
      </div>
    );
  }

  return <ConsultationRoom roomName={roomName} token={parsed} />;
};

export default ConsultationRoomPage;