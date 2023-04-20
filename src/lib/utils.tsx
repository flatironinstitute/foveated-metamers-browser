export function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute w-full h-full top-0 left-0 grid items-center justify-center bg-neutral-100/80 text-6xl rounded">
      {children}
    </div>
  );
}
