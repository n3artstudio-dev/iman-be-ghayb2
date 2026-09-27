import { VideoDetail } from "@/components/cinema/video-detail";

export default async function VideoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <VideoDetail key={id} id={Number(id)} />;
}
