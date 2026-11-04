'use client';

import { useEffect, useRef } from 'react';

interface YennengaStageProps {
  pageIndex: number;
}

export default function YennengaStage({ pageIndex }: YennengaStageProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <iframe
        ref={iframeRef}
        src="/yennenga-stage.html"
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          borderRadius: '8px',
        }}
        title="Scène interactive Yennenga"
      />
    </div>
  );
}
