import { useEffect, useState } from 'react';
import { FALLBACK_IMAGE, imgSrc } from '../../utils/imageUrl';

/**
 * Fixed-frame image with a skeleton shimmer while loading and a graceful
 * fallback when the URL is missing or fails to load.
 *
 * The frame keeps the layout stable (no reflow) and `object-cover` fills it.
 *
 * @param {object} props
 * @param {string} [props.src] stored image URL
 * @param {string} props.alt
 * @param {string} [props.frame] tailwind aspect/size classes for the frame
 * @param {string} [props.className] extra classes on the frame
 * @param {string} [props.imgClassName] classes on the <img>
 * @param {number} [props.w] delivery width (Cloudinary transform)
 * @param {number} [props.h] delivery height
 * @param {'fill'|'fit'} [props.crop] crop mode for the transform
 * @param {boolean} [props.priority] eager-load instead of lazy
 */
export default function ProductImage({
  src,
  alt = '',
  frame = 'aspect-[4/5]',
  className = '',
  imgClassName = '',
  w,
  h,
  crop = 'fill',
  priority = false,
}) {
  const [loaded, setLoaded] = useState(false);
  const [broken, setBroken] = useState(false);

  useEffect(() => {
    setLoaded(false);
    setBroken(false);
  }, [src]);

  const useFallback = broken || !src;
  const effective = useFallback ? FALLBACK_IMAGE : imgSrc(src, { w, h, crop });

  return (
    <div
      className={`relative overflow-hidden bg-linen ${frame} ${className}`}
      aria-busy={!loaded && !useFallback}
    >
      {!loaded && !broken && (
        <div className="shimmer absolute inset-0" aria-hidden="true" />
      )}
      <img
        src={effective}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={() => setBroken(true)}
        className={`h-full w-full object-cover transition-opacity duration-500 ${
          loaded || useFallback ? 'opacity-100' : 'opacity-0'
        } ${imgClassName}`}
      />
    </div>
  );
}
