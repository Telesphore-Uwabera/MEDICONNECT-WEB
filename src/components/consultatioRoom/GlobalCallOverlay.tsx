import { useCallContext } from "@/context/CallContext";
import ConsultationRoom from "./ConsultationRoom";

export function GlobalCallOverlay() {
  const { activeCall } = useCallContext();

  if (!activeCall) return null;

  return (
    <ConsultationRoom
      roomName={activeCall.roomName}
      token={activeCall.token}
    />
  );
}
