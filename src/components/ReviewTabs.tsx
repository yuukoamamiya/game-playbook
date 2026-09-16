import React from 'react';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';
import reviews from '@site/src/generated/reviews.json';

type Media = {id: string; site?: string; label: string};
type ReviewTabProps = {id?: string; site: string; label: string; children: React.ReactNode};

export function ReviewTab({children}: ReviewTabProps): React.ReactNode {
  return <>{children}</>;
}

function tabKey(props: {id?: string; site: string}): string {
  return props.id ?? props.site;
}

export default function ReviewTabs({
  slug,
  children,
}: {
  slug: string;
  children: React.ReactNode;
}): React.ReactNode {
  const available = new Set(
    ((reviews as Record<string, Media[]>)[slug] ?? []).map((media) => media.id),
  );
  const items = React.Children.toArray(children).filter(
    (child): child is React.ReactElement<ReviewTabProps> =>
      React.isValidElement<ReviewTabProps>(child) && available.has(tabKey(child.props)),
  );

  if (items.length === 0) return null;
  if (items.length === 1) return <>{items[0].props.children}</>;

  return (
    <Tabs groupId="review-source">
      {items.map((child, index) => (
        <TabItem key={index} value={tabKey(child.props)} label={child.props.label}>
          {child.props.children}
        </TabItem>
      ))}
    </Tabs>
  );
}
