export function PedidoConfirmadoCheck() {
  return (
    <div
      className="success-check-wrap flex size-20 items-center justify-center rounded-full bg-success/15 text-success"
      aria-hidden
    >
      <svg
        className="size-12"
        viewBox="0 0 52 52"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle
          className="success-check-ring"
          cx="26"
          cy="26"
          r="23"
          stroke="currentColor"
          strokeWidth="2.5"
          pathLength="1"
        />
        <path
          className="success-check-mark"
          d="M14.5 27.5 22 35l15.5-17"
          stroke="currentColor"
          strokeWidth="3.25"
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength="1"
        />
      </svg>
    </div>
  );
}
