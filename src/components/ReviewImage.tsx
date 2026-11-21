import React, {useCallback, useEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';

type ReviewImageProps = {
  src: string;
  alt?: string;
  group: string;
};

type LightboxItem = {
  src: string;
  alt: string;
};

export default function ReviewImage({src, alt = '', group}: ReviewImageProps): React.ReactElement {
  const [items, setItems] = useState<LightboxItem[]>([]);
  const [index, setIndex] = useState(0);
  const [portalHost, setPortalHost] = useState<HTMLElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  // SSR/SSG 阶段没有 document，挂载后再拿 body 作为 portal 容器。
  useEffect(() => {
    setPortalHost(document.body);
  }, []);

  const open = useCallback(() => {
    const nodes = Array.from(
      document.querySelectorAll<HTMLImageElement>(`img[data-review-group="${group}"]`),
    );
    if (nodes.length === 0) return;
    const list = nodes.map((node) => ({
      src: node.getAttribute('src') ?? '',
      alt: node.getAttribute('alt') ?? '',
    }));
    const found = nodes.findIndex((node) => node.getAttribute('src') === src);
    setItems(list);
    setIndex(found >= 0 ? found : 0);
  }, [group, src]);

  const close = useCallback(() => {
    setItems([]);
    // 关闭后把焦点还给触发按钮，键盘用户不会掉到页面开头。
    triggerRef.current?.focus();
  }, []);

  const step = useCallback((delta: number) => {
    setIndex((current) => {
      if (items.length < 2) return current;
      return (current + delta + items.length) % items.length;
    });
  }, [items.length]);

  useEffect(() => {
    if (items.length === 0) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
      if (event.key === 'ArrowLeft') step(-1);
      if (event.key === 'ArrowRight') step(1);
    };
    window.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [close, items.length, step]);

  const current = items[index];

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="review-image-button"
        aria-haspopup="dialog"
        aria-label={alt || '查看插图'}
        onClick={open}
      >
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          data-review-group={group}
          className="review-image"
        />
      </button>
      {current && portalHost && createPortal(
        <div
          className="review-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label="插图预览"
          onClick={close}
        >
          <button
            type="button"
            className="review-lightbox__close"
            aria-label="关闭"
            onClick={close}
          >
            ×
          </button>
          {items.length > 1 && (
            <button
              type="button"
              className="review-lightbox__nav review-lightbox__nav--prev"
              aria-label="上一张"
              onClick={(event) => {
                event.stopPropagation();
                step(-1);
              }}
            >
              ‹
            </button>
          )}
          <figure className="review-lightbox__figure" onClick={(event) => event.stopPropagation()}>
            <img src={current.src} alt={current.alt} />
            {current.alt && <figcaption>{current.alt}</figcaption>}
            {items.length > 1 && (
              <span className="review-lightbox__counter">{index + 1} / {items.length}</span>
            )}
          </figure>
          {items.length > 1 && (
            <button
              type="button"
              className="review-lightbox__nav review-lightbox__nav--next"
              aria-label="下一张"
              onClick={(event) => {
                event.stopPropagation();
                step(1);
              }}
            >
              ›
            </button>
          )}
        </div>,
        portalHost,
      )}
    </>
  );
}
