interface ChipProps {
  label: string;
  active?: boolean;
  onClick?: () => void;
}
export default function Chip({ label, active, onClick }: ChipProps) {
  return (
    <button onClick={onClick} className={`chip ${active ? "chip-active" : "chip-default"}`}>
      {label}
    </button>
  );
}
