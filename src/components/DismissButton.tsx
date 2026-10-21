export function DismissButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="dismiss" aria-label="Dismiss" onClick={onClick}>
      <svg width="10" height="10" viewBox="0 0 10 10" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M2 2l6 6M8 2l-6 6" />
      </svg>
    </button>
  );
}
