import { HomeProdutoCardSkeleton } from './HomeProdutoSkeleton';

const SKELETON_COUNT = 4;

export function HomeSkeleton() {
  return (
    <ul
      className="flex flex-col gap-3"
      aria-busy="true"
      aria-label="Carregando cardápio"
    >
      {Array.from({ length: SKELETON_COUNT }, (_, index) => (
        <li key={index}>
          <HomeProdutoCardSkeleton />
        </li>
      ))}
    </ul>
  );
}
