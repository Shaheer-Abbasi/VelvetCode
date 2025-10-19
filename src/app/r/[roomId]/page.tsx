import Room from "./room";

export default async function RoomPage({ params }: { params: Promise<{ roomId: string }> }) {
  const resolvedParams = await params;
  return <Room params={resolvedParams} />;
}