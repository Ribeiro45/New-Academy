import { useEffect, useRef, useState } from "react";

interface VideoPlayerProps {
  youtubeUrl: string;
  title: string;
  onProgress90?: () => void;
}

export const VideoPlayer = ({ youtubeUrl, title, onProgress90 }: VideoPlayerProps) => {
  const [hasReached90, setHasReached90] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  
  // Extract video ID from YouTube URL
  const getYouTubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  };

  // Extract Google Drive file ID
  const getGoogleDriveId = (url: string) => {
    const regExp = /drive\.google\.com\/(?:file\/d\/|open\?id=)([a-zA-Z0-9_-]+)/;
    const match = url.match(regExp);
    return match ? match[1] : null;
  };

  // Detect video type
  const getVideoType = (url: string): 'youtube' | 'drive' | 'direct' => {
    if (getYouTubeId(url)) return 'youtube';
    if (getGoogleDriveId(url)) return 'drive';
    return 'direct';
  };

  const videoType = getVideoType(youtubeUrl);
  const videoId = videoType === 'youtube' ? getYouTubeId(youtubeUrl) : null;
  const driveId = videoType === 'drive' ? getGoogleDriveId(youtubeUrl) : null;

  useEffect(() => {
    setHasReached90(false);
  }, [youtubeUrl]);

  useEffect(() => {
    if (videoType !== 'youtube' || !videoId || !onProgress90) return;

    const checkProgress = () => {
      if (!iframeRef.current || hasReached90) return;
      
      iframeRef.current.contentWindow?.postMessage(
        '{"event":"command","func":"getCurrentTime","args":""}',
        '*'
      );
      iframeRef.current.contentWindow?.postMessage(
        '{"event":"command","func":"getDuration","args":""}',
        '*'
      );
    };

    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== 'https://www.youtube.com') return;
      
      try {
        const data = JSON.parse(event.data);
        
        if (data.event === 'infoDelivery' && data.info) {
          const { currentTime, duration } = data.info;
          
          if (currentTime && duration && !hasReached90) {
            const progress = (currentTime / duration) * 100;
            
            if (progress >= 90) {
              setHasReached90(true);
              onProgress90();
            }
          }
        }
      } catch (error) {
        // Ignore parsing errors
      }
    };

    const interval = setInterval(checkProgress, 2000);
    window.addEventListener('message', handleMessage);

    return () => {
      clearInterval(interval);
      window.removeEventListener('message', handleMessage);
    };
  }, [videoId, videoType, onProgress90, hasReached90]);

  // Render YouTube video
  if (videoType === 'youtube' && videoId) {
    return (
      <div className="w-full aspect-video rounded-lg overflow-hidden shadow-lg">
        <iframe
          ref={iframeRef}
          width="100%"
          height="100%"
          src={`https://www.youtube.com/embed/${videoId}?enablejsapi=1`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="w-full h-full"
        />
      </div>
    );
  }

  // Render Google Drive video
  if (videoType === 'drive' && driveId) {
    return (
      <div className="w-full aspect-video rounded-lg overflow-hidden shadow-lg">
        <iframe
          ref={iframeRef}
          width="100%"
          height="100%"
          src={`https://drive.google.com/file/d/${driveId}/preview`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="w-full h-full"
        />
      </div>
    );
  }

  // Render direct video URL
  if (videoType === 'direct') {
    return (
      <div className="w-full aspect-video rounded-lg overflow-hidden shadow-lg">
        <iframe
          ref={iframeRef}
          width="100%"
          height="100%"
          src={youtubeUrl}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="w-full h-full"
        />
      </div>
    );
  }

  return (
    <div className="w-full aspect-video bg-muted rounded-lg flex items-center justify-center">
      <p className="text-muted-foreground">URL de vídeo inválida</p>
    </div>
  );
};
