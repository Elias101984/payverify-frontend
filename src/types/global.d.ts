// src/types/global.d.ts
// Frontend-only ambient types & module declarations

// Allow importing images & SVGs
declare module '*.svg' {
    import * as React from 'react';
    const ReactComponent: React.FunctionComponent<React.SVGProps<SVGSVGElement> & { title?: string }>;
    export default ReactComponent;
}
declare module '*.png' { const src: string; export default src; }
declare module '*.jpg' { const src: string; export default src; }
declare module '*.jpeg' { const src: string; export default src; }
declare module '*.gif' { const src: string; export default src; }
declare module '*.webp' { const src: string; export default src; }

// Typed env var used by your Axios base URL
declare namespace NodeJS {
    interface ProcessEnv {
        REACT_APP_API_URL?: string;
    }
}

// (Optional) If a lib lacks types, you can add quick shims like:
// declare module 'some-untypeed-lib';
