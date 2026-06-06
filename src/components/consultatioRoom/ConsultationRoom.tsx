interface ConsultationRoomProps {
  roomName: string;
  token: {
    username: string;
    credential: string;
    room: string;
    is_owner: boolean;
    ice_servers: { urls: string; username?: string; credential?: string }[];
  };
}

const ConsultationRoom = ({ roomName, token }: ConsultationRoomProps) => {
  return (
    <div className="h-screen w-screen bg-[#0c0c0c] flex flex-col items-center justify-center">
      <p className="text-white/50 text-sm">Connecting to room: {roomName}</p>
    </div>
  );
};

export default ConsultationRoom;