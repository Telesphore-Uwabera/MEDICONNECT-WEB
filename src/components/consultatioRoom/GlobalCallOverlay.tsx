import { useCallContext } from "@/context/CallContext";
import ConsultationRoom from "./ConsultationRoom";

export function GlobalCallOverlay() {
  const { activeCall } = useCallContext();

  if (!activeCall) return null;

  return (
    <ConsultationRoom
      key={`${activeCall.roomName}-${JSON.stringify(activeCall.token).slice(0, 20)}`}
      roomName={activeCall.roomName}
      token={activeCall.token}
    />
  );
}
