import type { CSSProperties } from "react";

type OptimizedPictureProps = {
  webpSrc: string;
  fallbackSrc: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  priority?: boolean;
  style?: CSSProperties;
};

export default function OptimizedPicture({
  webpSrc,
  fallbackSrc,
  alt,
  className,
  width,
  height,
  priority = false,
  style,
}: OptimizedPictureProps) {
  return (
    <picture>
      <source srcSet={webpSrc} type="image/webp" />
      <img
        src={fallbackSrc}
        alt={alt}
        className={className}
        width={width}
        height={height}
        style={style}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        fetchPriority={priority ? "high" : "auto"}
      />
    </picture>
  );
}