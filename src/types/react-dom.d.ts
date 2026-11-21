// The project does not install @types/react-dom; only createPortal is needed here.
declare module 'react-dom' {
  import type {ReactNode} from 'react';

  export function createPortal(
    children: ReactNode,
    container: Element | DocumentFragment,
    key?: string | number | null,
  ): ReactNode;
}
