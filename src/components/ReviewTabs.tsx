import React from 'react';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';
import reviews from '@site/src/generated/reviews.json';

type Media = {site: string; label: string};
type ReviewTabProps = {site: string; label: string; children: React.ReactNode};

export function ReviewTab({children}: ReviewTabProps): React.ReactNode {
  return <>{children}</>;
}

export default function ReviewTabs({
  slug,
  children,
}: {
  slug: string;
  children: React.ReactNode;
}): React.ReactNode {
  const available = new Set(
    ((reviews as Record<string, Media[]>)[slug] ?? []).map((media) => media.site),
  );
  const items = React.Children.toArray(children).filter(
    (child): child is React.ReactElement<ReviewTabProps> =>
      React.isValidElement<ReviewTabProps>(child) && available.has(child.props.site),
  );

  if (items.length === 0) return null;
  if (items.length === 1) return <>{items[0].props.children}</>;

  return (
    <Tabs groupId="review-source">
      {items.map((child, index) => (
        <TabItem key={index} value={child.props.site} label={child.props.label}>
          {child.props.children}
        </TabItem>
      ))}
    </Tabs>
  );
}
