import React, {useEffect, useMemo, useState} from 'react';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

type Media = {id: string; site?: string; label: string};
type ReviewTabProps = {id?: string; site: string; label: string; children: React.ReactNode};

export function ReviewTab({children}: ReviewTabProps): React.ReactElement {
  return <>{children}</>;
}

function tabKey(props: {id?: string; site: string}): string {
  return props.id ?? props.site;
}

async function loadMedia(slug: string): Promise<Media[] | null> {
  try {
    const data = (await import(`@site/src/generated/reviews/${slug}.json`)) as {
      default: Media[];
    };
    return Array.isArray(data.default) ? data.default : [];
  } catch {
    // 拆分文件缺失时返回 null：页面仍然展示作者写好的 tab，只是不做裁剪。
    return null;
  }
}

export default function ReviewTabs({
  slug,
  children,
}: {
  slug: string;
  children: React.ReactNode;
}): React.ReactElement | null {
  const [media, setMedia] = useState<Media[] | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    setMedia(undefined);
    loadMedia(slug).then((list) => {
      if (!cancelled) setMedia(list);
    });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const available = useMemo(
    () => (media ? new Set(media.map((entry) => entry.id)) : null),
    [media],
  );

  const candidates = useMemo(
    () => React.Children.toArray(children).filter(
      (child): child is React.ReactElement<ReviewTabProps> => React.isValidElement<ReviewTabProps>(child),
    ),
    [children],
  );

  // 元数据还在异步加载时先渲染作者写好的 tab：静态构建（SSG）和搜索索引
  // 都依赖这些内容，客户端拿到 available 后再裁掉没有译文的 tab。
  const items = available
    ? candidates.filter((child) => available.has(tabKey(child.props)))
    : candidates;

  if (items.length === 0) return null;
  if (items.length === 1) {
    const item = items[0];
    return (
      <>
        <h2 className="visually-hidden">{item.props.label}</h2>
        {item.props.children}
      </>
    );
  }

  return (
    // groupId 按 slug 区分：Docusaurus 会把选中的 tab 记进 localStorage，
    // 共用一个 id 时切到别的页面会沿用上一页的选择，落到不存在的媒体上。
    <Tabs groupId={`review-source-${slug}`}>
      {items.map((child) => (
        <TabItem key={tabKey(child.props)} value={tabKey(child.props)} label={child.props.label}>
          {child.props.children}
        </TabItem>
      ))}
    </Tabs>
  );
}
