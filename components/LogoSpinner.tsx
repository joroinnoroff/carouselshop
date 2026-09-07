import { Logo3D } from "@/components/Logo3D";

export function LogoSpinner({ label }: { label?: string }) {
  return (
    <div className="logo-wait" role="status" aria-live="polite">
      <div className="logo-wait-mark">
        <Logo3D variant="mark" />
      </div>
      {label ? <p>{label}</p> : <span className="visually-hidden">Loading</span>}
    </div>
  );
}
