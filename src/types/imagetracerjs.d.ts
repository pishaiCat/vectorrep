declare module 'imagetracerjs' {
  export interface ImageTracerOptions {
    ltres?: number;
    qtres?: number;
    pathomit?: number;
    rightangleenhance?: boolean;
    colorsampling?: number;
    numberofcolors?: number;
    mincolorratio?: number;
    colorquantcycles?: number;
    layering?: number;
    strokewidth?: number;
    linefilter?: boolean;
    scale?: number;
    roundcoords?: number;
    viewbox?: boolean;
    desc?: boolean;
    lcpr?: number;
    qcpr?: number;
    blurradius?: number;
    blurdelta?: number;
    pal?: Array<{ r: number; g: number; b: number; a: number }>;
  }
  const tracer: {
    imagedataToSVG(imgd: ImageData, options?: ImageTracerOptions): string;
    imagedataToTracedata(imgd: ImageData, options?: ImageTracerOptions): unknown;
    versionnumber: string;
  };
  export default tracer;
}
