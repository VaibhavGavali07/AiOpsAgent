interface Props {
  cols?: 1 | 2 | 3 | 4 | 5;
  children: React.ReactNode;
  className?: string;
}

const COL_CLS: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
  5: "grid-cols-2 sm:grid-cols-3 xl:grid-cols-5",
};

export function SectionGrid({ cols = 3, children, className = "" }: Props) {
  return (
    <div className={`grid gap-5 ${COL_CLS[cols]} ${className}`}>
      {children}
    </div>
  );
}
