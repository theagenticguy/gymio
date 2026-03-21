import { useStore } from "../store";
import { User } from "lucide-react";

const USERS = [
  { label: "Laith", value: "laith" },
  { label: "Sylvia", value: "sylvia" },
];

export function UserSwitcher() {
  const user = useStore((s) => s.user);
  const setUser = useStore((s) => s.setUser);

  return (
    <div className="flex items-center gap-2">
      {USERS.map((u) => (
        <button
          key={u.value}
          onClick={() => setUser(u)}
          className={`flex items-center gap-1.5 px-3 py-2.5 rounded-full text-sm transition-colors ${
            user.value === u.value
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-muted-foreground hover:text-foreground"
          }`}
        >
          <User className="h-3.5 w-3.5" />
          {u.label}
        </button>
      ))}
    </div>
  );
}
