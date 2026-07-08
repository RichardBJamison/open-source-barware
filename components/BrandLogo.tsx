import Link from "next/link";
import OptimizedPicture from "@/components/OptimizedPicture";

type BrandLogoProps = {
  className?: string;
  linked?: boolean;
  priority?: boolean;
};

export default function BrandLogo({
  className = "",
  linked = true,
  priority = false,
}: BrandLogoProps) {
  const image = (
    <OptimizedPicture
      webpSrc="/images/logo.webp"
      fallbackSrc="/images/logo.png"
      alt="Open Source Barware"
      width={240}
      height={135}
      priority={priority}
      className={`w-[180px] sm:w-[210px] md:w-[240px] h-auto ${className}`}
      style={{ mixBlendMode: "lighten" }}
    />
  );

  if (linked) {
    return (
      <Link
        href="/"
        className="inline-block mb-6 opacity-95 hover:opacity-100 transition-opacity"
        aria-label="Open Source Barware home"
      >
        {image}
      </Link>
    );
  }

  return <div className="mb-6">{image}</div>;
}