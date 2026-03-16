import { useState, useEffect } from "react";
import { WallLayout } from "./WallLayout";
import { PhoneLayout } from "./PhoneLayout";

const WALL_BREAKPOINT = 1024;

function useLayoutMode() {
  // Check for ?mode=wall or ?mode=phone query param override
  const params = new URLSearchParams(window.location.search);
  const modeOverride = params.get("mode");

  const [isWall, setIsWall] = useState(() => {
    if (modeOverride === "wall") return true;
    if (modeOverride === "phone") return false;
    return window.innerWidth >= WALL_BREAKPOINT;
  });

  useEffect(() => {
    if (modeOverride) return; // Don't auto-switch if explicitly set

    const handleResize = () => {
      setIsWall(window.innerWidth >= WALL_BREAKPOINT);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [modeOverride]);

  return isWall;
}

export function LayoutSwitcher() {
  const isWall = useLayoutMode();
  return isWall ? <WallLayout /> : <PhoneLayout />;
}
