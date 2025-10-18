import Room from "./room";

export default function RoomPage({ params }: { params: { roomId: string } }) {
  return <Room params={params} />;
}