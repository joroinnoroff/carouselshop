export function VisaMark() {
  return (
    <svg
      className="pay-mark"
      viewBox="0 0 48 32"
      width="48"
      height="32"
      aria-hidden
    >
      <rect width="48" height="32" rx="4" fill="#1A1F71" />
      <text
        x="24"
        y="21"
        textAnchor="middle"
        fill="#fff"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontStyle="italic"
        fontWeight="700"
        fontSize="14"
        letterSpacing="0.04em"
      >
        VISA
      </text>
    </svg>
  );
}

export function MastercardMark() {
  return (
    <svg
      className="pay-mark"
      viewBox="0 0 48 32"
      width="48"
      height="32"
      aria-hidden
    >
      <rect width="48" height="32" rx="4" fill="#252525" />
      <circle cx="19" cy="16" r="8" fill="#EB001B" />
      <circle cx="29" cy="16" r="8" fill="#F79E1B" />
      <path
        d="M24 9.7a8 8 0 0 1 0 12.6 8 8 0 0 1 0-12.6Z"
        fill="#FF5F00"
      />
    </svg>
  );
}

export function VippsMark() {
  return (
    <svg
      className="pay-mark pay-mark--vipps"
      viewBox="0 0 72 32"
      width="72"
      height="32"
      aria-hidden
    >
      <rect width="72" height="32" rx="16" fill="#FF5B24" />
      <text
        x="36"
        y="21"
        textAnchor="middle"
        fill="#fff"
        fontFamily="Helvetica Neue, Helvetica, Arial, sans-serif"
        fontWeight="700"
        fontSize="13"
        letterSpacing="-0.02em"
      >
        Vipps
      </text>
    </svg>
  );
}
